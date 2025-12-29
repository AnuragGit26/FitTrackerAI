// Supabase Edge Function: Daily Notifications
// Generates AI insights notifications for all active users daily at 9:00 AM
// Deno runtime environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface UserProfile {
    user_id: string;
    name: string;
    experience_level: string;
    goals: string[];
    equipment: string[];
    workout_frequency: number;
    preferred_unit: string;
    deleted_at: string | null;
}

interface Workout {
    id: number;
    user_id: string;
    date: string;
    exercises: unknown;
    total_volume: number;
    total_duration: number;
    workout_type: string;
    muscles_targeted: string[];
}

interface MuscleStatus {
    muscle: string;
    recovery_status: string;
    recovery_percentage: number;
    last_worked: string | null;
}

interface AIInsights {
    analysis: string;
    recommendations: string[];
    warnings?: string[];
    motivation?: string;
    tip?: string;
}

interface NotificationData {
    insightType?: string;
    insightId?: string;
    [key: string]: unknown;
}

// Generate AI insights using Gemini API
async function generateAIInsights(
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    userProfile: UserProfile
): Promise<AIInsights> {
    if (!GEMINI_API_KEY) {
        return {
            analysis: 'AI insights are temporarily unavailable. Keep tracking your workouts!',
            recommendations: ['Continue with your current routine', 'Focus on progressive overload'],
            motivation: 'Consistency is key to achieving your fitness goals.',
            tip: 'Track your workouts consistently to get better insights over time.',
        };
    }

    try {
        // Format workout summary
        const recentWorkouts = workouts.slice(0, 30); // Last 30 days
        const workoutSummary = recentWorkouts.length > 0
            ? recentWorkouts
                .map(w => {
                    const date = new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `${date}: ${Array.isArray(w.exercises) ? (w.exercises as unknown[]).length : 0} exercises, ${Math.round(w.total_volume)}${userProfile.preferred_unit === 'lbs' ? 'lbs' : 'kg'}`;
                })
                .join('\n')
            : 'No recent workouts.';

        // Format muscle status summary
        const muscleSummary = muscleStatuses.length > 0
            ? muscleStatuses
                .map(m => `${m.muscle}: ${m.recovery_status} (${m.recovery_percentage}%)`)
                .join('\n')
            : 'No muscle recovery data available.';

        // Calculate readiness score
        const readinessScore = muscleStatuses.length > 0
            ? Math.round(muscleStatuses.reduce((sum, m) => sum + m.recovery_percentage, 0) / muscleStatuses.length)
            : 85;

        // Build prompt
        const prompt = `You are a certified personal trainer providing TODAY'S FOCUS - a single, actionable, data-packed recommendation for this user's workout today.

Recent Training Summary (Last 30 Days):
${workoutSummary}

Muscle Recovery Status:
${muscleSummary}
Readiness Score: ${readinessScore}%

User Profile:
- Experience Level: ${userProfile.experience_level}
- Goals: ${userProfile.goals.join(', ')}
- Workout Frequency: ${userProfile.workout_frequency} days/week
- Equipment: ${userProfile.equipment.join(', ') || 'Standard gym equipment'}

Provide a JSON response with this structure:
{
  "analysis": "A brief analysis (2-3 sentences) referencing specific metrics like recovery percentages, volume trends, or consistency",
  "recommendations": ["ONE primary recommendation for TODAY that is data-packed and specific (1-2 sentences max)", "Secondary recommendation if relevant", "Third recommendation if relevant"],
  "warnings": ["Any warnings about overtraining, imbalances, or excessive training with specific data"],
  "motivation": "A motivational message referencing their actual progress (mention specific achievements)",
  "tip": "One specific, actionable tip with data context"
}

CRITICAL OUTPUT REQUIREMENTS:
- The FIRST recommendation MUST be the "Today's Focus" - make it crisp, clear, and data-packed (1-2 sentences)
- Keep all text concise and actionable
- Reference specific numbers from the data provided
- Be encouraging but realistic`;

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt,
                        }],
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response (may be wrapped in markdown code blocks)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const insights = JSON.parse(jsonText) as AIInsights;
        return insights;
    } catch (error) {
        console.error('Error generating AI insights:', error);
        return {
            analysis: 'Unable to generate AI insights at this time. Keep tracking your workouts!',
            recommendations: ['Continue with your current routine', 'Focus on progressive overload'],
            motivation: 'Consistency is key to achieving your fitness goals.',
            tip: 'Track your workouts consistently to get better insights over time.',
        };
    }
}

// Create notification in Supabase
async function createNotification(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    insights: AIInsights
): Promise<void> {
    const notificationId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days

    const notificationData: NotificationData = {
        insightType: 'daily_insights',
        insightId: notificationId,
    };

    // Use the first recommendation as the title, or analysis if no recommendations
    const title = insights.recommendations && insights.recommendations.length > 0
        ? insights.recommendations[0].substring(0, 100) // Limit title length
        : 'Daily AI Insights';

    // Combine analysis and tip for the message
    const message = `${insights.analysis || ''}\n\n${insights.tip || 'Keep up the great work!'}`.substring(0, 500);

    const { error } = await supabase
        .from('notifications')
        .insert({
            id: notificationId,
            user_id: userId,
            type: 'ai_insight',
            title,
            message,
            data: notificationData,
            is_read: false,
            expires_at: expiresAt.toISOString(),
            version: 1,
        });

    if (error) {
        throw new Error(`Failed to create notification: ${error.message}`);
    }
}

// Main handler
serve(async (req) => {
    try {
        // Verify request (optional: add authentication header check)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client with service role key
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Fetch all active users (not deleted)
        const { data: users, error: usersError } = await supabase
            .from('user_profiles')
            .select('user_id, name, experience_level, goals, equipment, workout_frequency, preferred_unit, deleted_at')
            .is('deleted_at', null);

        if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`);
        }

        if (!users || users.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No active users found', notificationsCreated: 0 }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const results = {
            totalUsers: users.length,
            notificationsCreated: 0,
            errors: [] as string[],
        };

        // Process each user
        for (const user of users as UserProfile[]) {
            try {
                // Fetch user's recent workouts (last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: workouts, error: workoutsError } = await supabase
                    .from('workouts')
                    .select('id, user_id, date, exercises, total_volume, total_duration, workout_type, muscles_targeted')
                    .eq('user_id', user.user_id)
                    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                    .is('deleted_at', null)
                    .order('date', { ascending: false })
                    .limit(30);

                if (workoutsError) {
                    console.error(`Error fetching workouts for user ${user.user_id}:`, workoutsError);
                    results.errors.push(`User ${user.user_id}: Failed to fetch workouts`);
                    continue;
                }

                // Fetch user's muscle statuses
                const { data: muscleStatuses, error: muscleError } = await supabase
                    .from('muscle_statuses')
                    .select('muscle, recovery_status, recovery_percentage, last_worked')
                    .eq('user_id', user.user_id)
                    .is('deleted_at', null);

                if (muscleError) {
                    console.error(`Error fetching muscle statuses for user ${user.user_id}:`, muscleError);
                    results.errors.push(`User ${user.user_id}: Failed to fetch muscle statuses`);
                    continue;
                }

                // Skip if user has no workout data
                if (!workouts || workouts.length === 0) {
                    // eslint-disable-next-line no-console
                    console.log(`Skipping user ${user.user_id}: No workout data`);
                    continue;
                }

                // Generate AI insights
                const insights = await generateAIInsights(
                    workouts as Workout[],
                    (muscleStatuses || []) as MuscleStatus[],
                    user
                );

                // Create notification
                await createNotification(supabase, user.user_id, insights);
                results.notificationsCreated++;

                // eslint-disable-next-line no-console
                console.log(`Created notification for user ${user.user_id}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error processing user ${user.user_id}:`, errorMessage);
                results.errors.push(`User ${user.user_id}: ${errorMessage}`);
                // Continue with next user instead of failing completely
            }
        }

        return new Response(
            JSON.stringify({
                message: 'Daily notifications generation completed',
                ...results,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Edge function error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});

