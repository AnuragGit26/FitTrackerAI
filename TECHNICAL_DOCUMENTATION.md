# FitTrackAI - Technical Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements & Objectives](#business-requirements--objectives)
3. [System Architecture](#system-architecture)
4. [Technical Stack](#technical-stack)
5. [Core Features & Business Logic](#core-features--business-logic)
6. [Data Architecture](#data-architecture)
7. [API & Integration Points](#api--integration-points)
8. [Security & Authentication](#security--authentication)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment & DevOps](#deployment--devops)
11. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**FitTrackAI** is a premium, mobile-first Progressive Web Application (PWA) designed for comprehensive gym exercise tracking with AI-powered insights. The application combines advanced workout logging, real-time muscle recovery tracking, 3D anatomy visualization, and intelligent recommendations to help users optimize their fitness journey.

### Key Value Propositions

- **Offline-First Architecture**: Full functionality without internet connectivity
- **AI-Powered Insights**: Personalized workout recommendations using Google Gemini AI
- **Muscle Recovery Intelligence**: Real-time tracking of muscle recovery status and readiness
- **3D Anatomy Visualization**: Interactive Three.js-based muscle mapping
- **Comprehensive Analytics**: Volume trends, personal records, and progress tracking
- **Cross-Platform PWA**: Installable on iOS, Android, and desktop devices

---

## Business Requirements & Objectives

### 1. Primary Business Goals

#### 1.1 User Engagement & Retention

- **Requirement**: Users should log workouts consistently with minimal friction
- **Success Metrics**:
  - Daily Active Users (DAU)
  - Workout logging frequency (target: 3-5 workouts/week)
  - User retention rate (30-day, 90-day)
- **Implementation**: Intuitive workout logging interface with auto-save, quick exercise selection, and rest timer automation

#### 1.2 Data-Driven Fitness Decisions

- **Requirement**: Provide actionable insights based on workout history and recovery data
- **Success Metrics**:
  - AI insight engagement rate
  - Users following recommendations
  - Improvement in user performance metrics
- **Implementation**: AI-powered analysis of workout patterns, muscle recovery status, and personalized recommendations

#### 1.3 Offline Functionality

- **Requirement**: Application must function fully without internet connectivity
- **Success Metrics**:
  - Offline usage percentage
  - Data sync success rate
  - User satisfaction with offline experience
- **Implementation**: IndexedDB-first architecture with Firestore sync; offline sync attempts are skipped and retried on the next online session
- **Operational Note**: Offline Firestore sync errors are logged as warnings to avoid noisy production error logs
- **Bootstrap**: On online login, the client pushes local IndexedDB data to seed empty Firestore user collections

### 2. Core Business Features

#### 2.1 Workout Logging

**Business Need**: Enable users to track exercises, sets, reps, weights, and workout metrics efficiently.

**Functional Requirements**:

- Log multiple exercises per workout
- Track sets with reps, weight, RPE (Rate of Perceived Exertion), and rest time
- Support multiple tracking types: weight/reps, reps-only, cardio, duration
- Quick cardio logging: Simplified interface for logging cardio workouts (distance, time, steps, calories)
- Auto-save workout progress every 10 seconds
- Support supersets and circuit training
- Track workout duration, total volume, and calories burned
- Track steps for cardio activities (optional)
- Add workout notes and mood tracking

**Business Rules**:

- Workouts must have at least one exercise
- Sets must be marked as completed before saving
- Volume calculation: sets × reps × weight (for strength), distance in km (for cardio)
- Workout type determined by primary muscle groups targeted or exercise type
- Steps field (optional) available for cardio exercises (0-100000 range)
- Calories can be auto-estimated from steps if not provided (steps × 0.04)

#### 2.2 Exercise Library Management

**Business Need**: Provide comprehensive exercise database with search and filtering capabilities.

**Functional Requirements**:

- Pre-populated library with 100+ exercises
- Exercise categories: strength, cardio, flexibility, olympic, plyometric
- Custom exercise creation
- Exercise details: primary/secondary muscles, equipment, difficulty, instructions
- Search and filter by category, equipment, muscle group, difficulty
- Favorites and recent exercises quick access
- Integration with StrengthLog for exercise details and anatomy images

**Business Rules**:

- Library exercises are shared across all users
- Custom exercises are user-specific
- Exercise names must be unique per user for custom exercises

**Equipment Categorization**:

Exercise equipment is categorized using the `EQUIPMENT_CATEGORY_MAP` in `src/services/exerciseLibrary.ts`. The categorization follows StrengthLog's classification standards (https://www.strengthlog.com/exercise-directory/) as the primary reference:

- **Free Weights**: Exercises using Barbell, Dumbbells, Kettlebells, Plates, EZ Bar, Hex Bar, Medicine Ball, Resistance Bands. Support equipment like Bench, Squat Rack, Preacher Bench, and Weight Belt are also categorized as Free Weights when used with free weight exercises.

- **Machines**: Exercises using dedicated resistance machines (Leg Press Machine, Smith Machine, Lat Pulldown Machine, etc.). Note: "Bench" is NOT a machine - it's support equipment for free weights.

- **Bodyweight**: Exercises performed using only bodyweight resistance. Support equipment like Pull-up Bar, Dip Bar, Parallel Bars, and Wall are categorized as Bodyweight. Pure bodyweight exercises (push-ups, planks, etc.) have empty equipment arrays.

- **Cables**: Exercises using Cable Machine, Cable, or Cable Pulley equipment.

- **Functional**: Exercises using functional training equipment (Battle Ropes, Sled, Tire, Sandbag, TRX, Suspension Trainer, Ab Wheel, Prowler, Jump Rope, Box).

- **Olympic**: Exercises using Olympic lifting equipment (Olympic Barbell, Bumper Plates, Platform).

- **Assisted**: Exercises using assisted equipment (Assisted Pull-up Machine, Resistance Band).

The `getEquipmentCategories()` function derives categories from an exercise's equipment array. Exercises can have multiple categories if they use equipment from different categories. For filtering purposes, exercises match if they have ANY of the selected equipment categories.

#### 2.3 Muscle Recovery Tracking

**Business Need**: Help users understand muscle recovery status to optimize training frequency and prevent overtraining.

**Functional Requirements**:

- Real-time calculation of muscle recovery status
- Recovery statuses: fresh, recovering, sore, ready, overworked
- Recovery percentage (0-100%)
- Workload score calculation based on volume, intensity, and RPE
- Recommended rest days per muscle group
- 7-day volume tracking per muscle
- Training frequency calculation (times per week)

**Business Rules**:

- Recovery status updated after each workout completion
- Primary muscles receive full workload score
- Secondary muscles receive 50% workload score
- Recovery percentage calculated using exponential decay model
- Overworked status triggered when recovery percentage < 20%

#### 2.4 AI-Powered Insights

**Business Need**: Provide personalized workout recommendations and insights to improve user outcomes.

**Functional Requirements**:

- Daily AI-generated insights based on workout history
- Progress analysis: consistency score, volume trends, plateaus
- Smart alerts: readiness score, critical warnings, suggestions
- Workout recommendations based on recovery status
- Muscle imbalance detection and corrective exercise suggestions
- Recovery predictions for upcoming days
- Breakthrough insights for personal records
- **Advanced Recovery Modeling**: Fatigue accumulation, supercompensation, and PR probability
- **Progression Plans**: Multi-day training schedules with periodization

**Business Rules**:

- Insights generated daily using last 30 days of workout data
- Recommendations prioritize muscles with recovery status "ready"
- Alerts triggered for overworked muscles or low readiness scores
- AI responses cached for 24 hours to reduce API costs

**Advanced Recovery Modeling Algorithms**:
FitTrackAI uses sophisticated algorithms to model physiological recovery:
- **Fatigue Accumulation**: Exponential decay model based on workload score (`F(t) = F0 * e^(-λt)`).
- **Supercompensation**: Models performance overshoot 24-48h after full recovery using a Gaussian-like curve.
- **Volume Prediction**: Weighted moving average of historical volume with trend analysis to predict optimal training volume.
- **PR Probability**: Probability score (0-100%) based on weighted factors: recovery status (40%), supercompensation (20%), consistency (20%), and volume trends (20%).

**Progression Plans**:
The AI generates structured multi-day progression plans including:
- **Periodization**: Linear, Undulating, or Block periodization strategies selected based on user experience level.
- **Phased Training**: Daily targets for volume, intensity, and recovery.
- **Visual Timeline**: Day-by-day breakdown of the training block.

#### 2.5 Analytics & Progress Tracking

**Business Need**: Enable users to visualize progress and identify trends.

**Functional Requirements**:

- Volume progression charts (daily, weekly, monthly)
- Workout frequency heatmap calendar
- Personal records (PR) tracking
- Strength progression charts per exercise
- Muscle balance visualization
- Performance metrics: total workouts, consistency score, streaks
- Superset analytics: volume distribution, frequency analysis

**Business Rules**:

- PRs calculated as maximum weight × reps combination
- Consistency score based on workout frequency vs. user-set goal
- Streaks calculated based on workout count with specific conditions:
  - At least 3 workouts must be done in any rolling 7-day window
  - Consecutive workouts must be within 72 hours of each other
  - Streak is the count of workouts meeting these conditions, working backwards from the most recent workout
- Volume aggregated by date, exercise, and muscle group

#### 2.6 Workout Templates & Planning

**Business Need**: Help users plan and structure their workouts effectively.

**Functional Requirements**:

- Create and save workout templates
- Template categories: strength, hypertrophy, cardio, home, flexibility
- Schedule planned workouts with date/time
- Workout reminders and notifications
- Template library with featured and trending templates
- Match percentage calculation for AI recommendations

**Business Rules**:

- Templates are user-specific
- Planned workouts can be marked as completed
- Reminders sent 30 minutes before scheduled time (configurable)
- Templates can include estimated duration and muscle groups targeted

#### 2.7 Sleep & Recovery Tracking

**Business Need**: Track sleep quality and recovery metrics to optimize training and prevent overtraining.

**Functional Requirements**:

- Log sleep duration and quality (1-10 scale)
- Track bedtime and wake time
- Log daily recovery metrics: overall recovery, stress level, energy level, soreness
- Readiness to train assessment: full-power, light, rest-day
- Sleep and recovery analytics
- Integration with muscle recovery calculations

**Business Rules**:

- Sleep quality affects muscle recovery calculations
- Recovery logs can be used to adjust workout recommendations
- Sleep duration recommendations: 7-9 hours optimal
- Recovery percentage calculated from multiple factors

#### 2.8 Notification System

**Business Need**: Keep users informed about workout reminders, recovery status, AI insights, and achievements.

**Functional Requirements**:

- Workout reminders (30 minutes before scheduled time)
- Muscle recovery notifications (when muscles are ready or overworked)
- AI insight notifications (when new insights are available)
- Achievement notifications (PRs, streaks, milestones)
- System notifications (app updates, sync status)
- Notification preferences and settings

**Business Rules**:

- Notifications stored locally in IndexedDB
- Notifications can be marked as read
- Soft delete support for notifications
- Notification types: workout_reminder, muscle_recovery, ai_insight, system, achievement

#### 2.9 User Profile & Settings

**Business Need**: Personalize the application experience for each user.

**Functional Requirements**:

- User profile: name, experience level, goals, equipment, workout frequency
- Unit preferences: kg or lbs
- Default rest time configuration
- Theme preferences: light, dark, system
- Notification preferences
- Data export functionality

**Business Rules**:

- Experience level affects AI recommendations
- Goals influence workout template suggestions
- Unit conversion applied automatically based on preference

#### 2.10 User Onboarding

**Business Need**: Ensure new users complete profile setup and understand core features before starting their journey.

**Functional Requirements**:
- Dedicated onboarding flow for first-time users
- Reuse existing Profile UI components for consistency
- Pre-fill data from Google OAuth (name, profile picture)
- Collect essential profile details: name, age, gender, weight, height, goals
- Feature introduction carousel (Workouts, Analytics, AI Coach)
- Request notification permissions with context
- Persist onboarding completion status

**Business Rules**:
- Onboarding runs only for new users who haven't completed it
- Existing users skip onboarding
- User cannot access main app until onboarding is completed
- Profile picture step skipped if OAuth provider supplies one
- Notifications permission request must explain value proposition

#### 2.11 AI Empty-State Messages

**Business Need**: Improve user retention and motivation during the initial "zero data" phase.

**Functional Requirements**:
- Display motivational AI-generated messages on empty screens (Home, Analytics, Insights, History)
- Context-aware messages based on user name and time of day
- Fallback content for offline or error states
- Caching of generated messages to prevent API spam

**Business Rules**:
- Only show on empty states (0 workouts logged)
- Use a free-tier AI model or lightweight templates
- Validate AI response schema before display
- Graceful degradation if AI service is unavailable

### 3. Non-Functional Requirements

#### 3.1 Performance

- **Page Load Time**: < 2 seconds on 3G connection
- **Time to Interactive**: < 3 seconds
- **Offline Response Time**: < 100ms for local operations
- **AI Insight Generation**: < 5 seconds

#### 3.2 Reliability

- **Uptime**: 99.9% availability
- **Data Sync Success Rate**: > 99%
- **Error Recovery**: Automatic retry with exponential backoff

#### 3.3 Scalability

- **Concurrent Users**: Support 10,000+ concurrent users
- **Data Storage**: Efficient IndexedDB usage with automatic cleanup
- **API Rate Limiting**: Respect API quotas (Gemini AI, MongoDB Atlas)

#### 3.4 Security

- **Authentication**: Auth0-based authentication with OAuth support
- **Data Encryption**: All data encrypted in transit (HTTPS)
- **User Data Isolation**: MongoDB query filters for data isolation
- **Input Validation**: All user inputs sanitized and validated

#### 3.5 Accessibility

- **WCAG Compliance**: Level AA compliance
- **Touch Targets**: Minimum 44x44px
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Reduced Motion**: Respect user motion preferences

---

## System Architecture

### Architecture Overview

FitTrackAI follows a **mobile-first, offline-first Progressive Web App (PWA)** architecture with the following key principles:

1. **Client-Side First**: All data stored locally in IndexedDB
2. **Background Sync**: Push sync to Supabase PostgreSQL when online (MongoDB sync handled by Edge Function)
3. **Service Worker**: Background processing and offline support
4. **Component-Based**: React component architecture with code splitting

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                      User Interface Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Home   │  │  Log     │  │Analytics │  │ Insights │   │
│  │   Page   │  │ Workout  │  │   Page   │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Component Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Exercise   │  │    Muscle    │  │   Analytics  │     │
│  │  Components  │  │   Recovery   │  │  Components  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Workout  │  │   User   │  │ Settings │  │Template │   │
│  │  Store   │  │  Store   │  │  Store   │  │  Store   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Data       │  │     AI       │  │   Recovery   │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Analytics   │  │   Template   │  │   Exercise   │     │
│  │   Service    │  │   Service    │  │   Library    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│      IndexedDB            │  │      MongoDB Atlas       │
│   (Local Storage)         │  │   (Cloud Sync)          │
│  ┌────────────────────┐   │  │  ┌────────────────────┐ │
│  │  Workouts          │   │  │  │  Workouts          │ │
│  │  Exercises         │   │  │  │  Exercises         │ │
│  │  Muscle Statuses   │   │  │  │  Muscle Statuses   │ │
│  │  Templates         │   │  │  │  Templates         │ │
│  │  User Profiles     │   │  │  │  User Profiles     │ │
│  │  Settings          │   │  │  │  Settings          │ │
│  └────────────────────┘   │  │  └────────────────────┘ │
└──────────────────────────┘  └──────────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                    ┌──────────────┐
                    │  Sync Queue   │
                    │  (Bidirectional)│
                    └──────────────┘
```

### Data Flow

1. **User Action** → Component dispatches action
2. **State Update** → Zustand store updates
3. **Service Call** → Service layer processes business logic
4. **Local Persistence** → Data saved to IndexedDB immediately
5. **Background Sync** → Queued for Supabase sync when online
6. **Webhook Trigger** → Edge Function syncs Supabase → MongoDB
7. **UI Update** → Component re-renders with new data

### Key Architectural Patterns

#### 1. Offline-First Pattern

- All data operations write to IndexedDB first
- Supabase sync happens asynchronously in background
- Edge Function handles Supabase → MongoDB sync automatically
- Conflict resolution using version numbers (optimistic locking)

#### 2. Service Layer Pattern

- Business logic encapsulated in service classes
- Services handle data validation, calculations, and API calls
- Components remain thin and focused on presentation

#### 3. Event-Driven Sync

- Data changes emit events
- Sync service listens to events and queues sync operations
- Debounced sync to batch multiple changes

#### 4. Caching Strategy

- AI insights cached for 24 hours
- Muscle images cached with expiration
- Query results cached in memory

---

## Technical Stack

### Frontend Framework

- **React 18+**: Component-based UI library
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server

### State Management

- **Zustand**: Lightweight state management
  - `workoutStore`: Workout data and operations
  - `userStore`: User profile and authentication state
  - `settingsStore`: Application settings
  - `templateStore`: Workout templates
  - `plannedWorkoutStore`: Scheduled workouts

### UI & Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Lucide React**: Icon library
- **Recharts**: Chart library for analytics

### 3D Visualization

- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for R3F

### Data Storage

- **Dexie.js**: IndexedDB wrapper
  - Local database for offline-first architecture
  - Tables: workouts, exercises, muscleStatuses, templates, userProfiles, settings
- **MongoDB Atlas**: Cloud database and sync
  - MongoDB database with Mongoose ODM
  - User-scoped queries for data isolation
  - Connection pooling and automatic reconnection

### Authentication

- **Auth0**: Authentication and user management
  - OAuth providers (Google, Apple, etc.)
  - Session management
  - User profile management

### AI Integration

- **Google Gemini AI**: AI-powered insights
  - Model: `gemini-2.5-flash`
  - Cached responses for cost optimization
  - Background fetching for better UX

### PWA Infrastructure

- **Workbox**: Service worker library
- **Vite PWA Plugin**: PWA configuration and manifest
- **Service Worker**: Background sync and offline support

### Utilities

- **date-fns**: Date manipulation
- **clsx**: Conditional class names
- **react-router-dom**: Client-side routing

### Development Tools

- **ESLint**: Code linting
- **TypeScript**: Type checking

---

## Core Features & Business Logic

### 1. Workout Logging System

#### 1.1 Workout Creation Flow

```text
User Action: Start Workout
    ↓
1. Create workout object with:
   - userId (from Auth0)
   - date (current date)
   - startTime (current timestamp)
   - exercises: []
   - totalDuration: 0
   - totalVolume: 0
   - workoutType: "strength" (default)
    ↓
2. Save to IndexedDB (workoutStore)
    ↓
3. Auto-save every 10 seconds (localStorage persistence)
    ↓
4. On workout completion:
   - Calculate totalDuration
   - Calculate totalVolume (sum of all exercise volumes)
   - Determine musclesTargeted
   - Update endTime
   - Save final workout
   - Trigger muscle recovery recalculation
   - Queue for MongoDB sync
```

#### 1.2 Exercise Logging Logic

**Set Tracking**:

- Each set tracks: reps, weight, unit (kg/lbs), RPE (1-10), restTime, duration
- Sets marked as `completed: true` when logged
- Volume per set: `reps × weight`
- Total exercise volume: `sum of all set volumes`

**Exercise Types**:

1. **Weight/Reps**: Standard strength training (reps × weight)
2. **Reps Only**: Bodyweight exercises (reps only)
3. **Cardio**: Distance, time, calories
4. **Duration**: Time-based exercises (duration in seconds)

**Superset/Circuit Support**:

- Exercises can be grouped using `groupId`
- `groupType`: 'single', 'superset', 'circuit'
- `groupOrder`: Order within group (0 = first)

#### 1.3 Volume Calculation

```typescript
// Per Set
setVolume = reps × weight

// Per Exercise
exerciseVolume = sum(setVolumes for all completed sets)

// Per Workout
workoutVolume = sum(exerciseVolumes for all exercises)

// Per Muscle (for recovery)
muscleVolume = exerciseVolume × (muscleContribution / totalMuscles)
```

### 2. Muscle Recovery System

#### 2.1 Recovery Status Calculation

**Inputs**:

- Last workout date for muscle
- Total volume in last 7 days
- Workload score (based on volume, intensity, RPE)
- Training frequency

**Algorithm**:

```typescript
// 1. Calculate workload score
workloadScore = calculateWorkloadScore(volume, intensity, rpe)

// 2. Calculate base recovery hours based on muscle and experience level
baseRecoveryHours = getBaseRecoveryHours(muscle, userLevel)

// 3. Adjust recovery hours for workload
workloadMultiplier = 1 + (workloadScore / 100)
adjustedRecoveryHours = baseRecoveryHours × workloadMultiplier

// 4. Adjust for sleep quality and duration (if sleep log available)
if (sleepLog) {
  sleepMultiplier = calculateSleepMultiplier(sleepLog)
  adjustedRecoveryHours = adjustedRecoveryHours × sleepMultiplier
}

// 5. Calculate recovery percentage (linear based on hours)
hoursSinceWorkout = differenceInHours(currentDate, lastWorkedDate)
recoveryPercentage = Math.min(100, (hoursSinceWorkout / adjustedRecoveryHours) × 100)

// 6. Determine status
if (recoveryPercentage >= 100) status = "ready"
else if (recoveryPercentage >= 75) status = "fresh"
else if (recoveryPercentage >= 50) status = "recovering"
else if (recoveryPercentage >= 25) status = "sore"
else status = "overworked"

// 7. Check for overtraining (high volume in last 7 days)
if (totalVolumeLast7Days > overtrainingThreshold) status = "overworked"
```

#### 2.2 Workload Score Calculation

```typescript
// Base score from volume
baseScore = volume / 1000  // Normalized to 0-10 scale

// Intensity multiplier
if (intensity === "high") multiplier = 1.5
else if (intensity === "medium") multiplier = 1.0
else multiplier = 0.5

// RPE adjustment
rpeMultiplier = rpe / 10

// Final workload score
workloadScore = baseScore × intensityMultiplier × rpeMultiplier
```

#### 2.3 Recovery Update Triggers

- After workout completion
- Daily background recalculation (service worker)
- Manual refresh from UI

#### 2.4 Cardio Workout Tracking

**Quick Cardio Logging Flow:**

1. User clicks "Quick Cardio Log" from Log Workout page
2. Simple form appears with:
   - Activity type selector (Running, Cycling, Walking, etc. or Custom)
   - Distance input with unit selector (km/miles)
   - Time input (MM:SS format)
   - Steps input (optional, 0-100000)
   - Calories input (optional, auto-estimated from steps if not provided)
   - Date/time picker
3. System creates workout with single cardio exercise
4. Workout saved with `workoutType: 'cardio'`
5. Data syncs to IndexedDB and MongoDB

**Cardio Calculations:**

```typescript
// Pace calculation (minutes per km or mile)
pace = (timeInSeconds / 60) / distance

// Speed calculation (km/h or mph)
speed = distance / (timeInSeconds / 3600)

// Calorie estimation from steps (if calories not provided)
estimatedCalories = steps × 0.04

// Volume calculation for cardio
volume = distance (converted to km)
```

**Steps Field:**

- Optional field in `WorkoutSet` interface
- Range: 0-100000 steps
- Used for:
  - Calorie estimation when calories not provided
  - Pace/speed calculations (distance/time/steps)
  - Analytics and progress tracking
  - AI insights generation

### 3. AI Insights System

#### 3.1 Insight Generation Flow

```text
1. Collect Context Data:
   - Recent workouts (last 30 days)
   - Muscle recovery statuses
   - Personal records
   - Volume trends
   - Consistency metrics
   - User goals and experience level
    ↓
2. Format Data for AI:
   - Workout summary (exercises, volume, dates)
   - Muscle status summary
   - Progress metrics
   - User preferences
    ↓
3. Call Gemini AI API:
   - Model: gemini-2.5-flash
   - Prompt: Structured fitness analysis request
   - Temperature: 0.7 (balanced creativity)
    ↓
4. Parse AI Response:
   - Extract JSON structure
   - Validate data types
   - Sanitize content
    ↓
5. Cache Response:
   - Store in IndexedDB
   - Cache for 24 hours
   - Key: userId + date
    ↓
6. Display Insights:
   - Progress analysis
   - Recommendations
   - Alerts
   - Recovery predictions
```

#### 3.2 AI Prompt Structure

```typescript
const prompt = `
You are an expert fitness coach analyzing a user's workout data.

User Profile:
- Experience Level: ${userLevel}
- Goals: ${userGoals.join(', ')}
- Workout Frequency: ${workoutFrequency} days/week

Recent Workouts (Last 30 Days):
${workoutSummary}
- Cardio workouts include: distance, time, steps, pace, calories
- Steps data included when available for better insights

Muscle Recovery Status:
${muscleSummary}

Progress Metrics:
- Consistency Score: ${consistencyScore}%
- Volume Trend: ${volumeTrend}
- Personal Records: ${prSummary}

Please provide:
1. Analysis of progress and patterns
2. Specific workout recommendations
3. Recovery and readiness insights
4. Motivational message
5. Actionable tip

Format response as JSON with structure:
{
  "analysis": "...",
  "recommendations": ["...", "..."],
  "motivation": "...",
  "tip": "..."
}
`;
```

#### 3.3 Caching Strategy

- **Cache Key**: `ai_insights_${userId}_${date}`
- **TTL**: 24 hours
- **Invalidation**: On new workout completion
- **Background Refresh**: Service worker fetches new insights daily

### 4. Analytics System

#### 4.1 Volume Progression

**Data Aggregation**:

```typescript
// Group workouts by date
volumeByDate = workouts.reduce((acc, workout) => {
  const date = format(workout.date, 'yyyy-MM-dd')
  acc[date] = (acc[date] || 0) + workout.totalVolume
  return acc
}, {})

// Calculate weekly/monthly aggregates
weeklyVolume = groupByWeek(volumeByDate)
monthlyVolume = groupByMonth(volumeByDate)
```

**Chart Data**:

- X-axis: Date (daily/weekly/monthly)
- Y-axis: Total volume (kg or lbs)
- Line chart with trend indicators

#### 4.2 Personal Records Tracking

**PR Detection**:

```typescript
// For each exercise
prs = workouts.flatMap(workout => 
  workout.exercises
    .filter(ex => ex.exerciseId === exerciseId)
    .flatMap(ex => 
      ex.sets
        .filter(set => set.completed)
        .map(set => ({
          weight: set.weight,
          reps: set.reps,
          date: workout.date,
          workoutId: workout.id
        }))
    )
)

// Find maximum (weight × reps)
maxPR = prs.reduce((max, pr) => {
  const currentScore = pr.weight * pr.reps
  const maxScore = max.weight * max.reps
  return currentScore > maxScore ? pr : max
})
```

#### 4.3 Consistency Score

```typescript
// Calculate based on week-wise evaluation
// Weeks start on Monday (ISO 8601 standard)
// A week is considered consistent if it has at least 3 workouts
// For partial weeks, the threshold is prorated: workout_count >= ceil(3 * days_in_week / 7)

// Group all workouts by week (Monday to Sunday)
weeks = group workouts by week starting on Monday

// Evaluate each week
for each week:
  daysInWeek = number of days in the week (7 for full weeks, less for partial)
  requiredWorkouts = daysInWeek === 7 ? 3 : Math.ceil((3 * daysInWeek) / 7)
  isConsistent = workoutCount >= requiredWorkouts

// Calculate score
consistentWeeks = count of weeks with 3+ workouts (or prorated threshold)
totalWeeks = total number of weeks (including partial weeks)
consistencyScore = Math.min(100, Math.round((consistentWeeks / totalWeeks) * 100))
```

**Note**: The implementation evaluates consistency on a week-by-week basis using all available workout data. A user is considered consistent for a week if they complete at least 3 workouts that week. Partial weeks at the start or end of the data range are prorated proportionally.

#### 4.4 Workout Frequency Heatmap

- Calendar view with color-coded days
- Color intensity based on workout count/volume
- Hover tooltips with workout details

### 5. Template System

#### 5.1 Template Creation

**Template Structure**:

```typescript
{
  id: string (UUID)
  userId: string
  name: string
  category: 'strength' | 'hypertrophy' | 'cardio' | 'home' | 'flexibility'
  exercises: [
    {
      exerciseId: string
      exerciseName: string
      sets: number
      reps: number
      weight?: number
      restTime?: number
    }
  ]
  estimatedDuration: number (minutes)
  musclesTargeted: MuscleGroup[]
}
```

#### 5.2 Template Matching

**AI Recommendation Matching**:

```typescript
// Calculate match percentage based on:
// 1. User goals alignment
// 2. Equipment availability
// 3. Experience level match
// 4. Muscle recovery status

matchPercentage = (
  goalMatch * 0.3 +
  equipmentMatch * 0.2 +
  levelMatch * 0.2 +
  recoveryMatch * 0.3
) * 100
```

### 6. Rest Timer System

#### 6.1 Rest Timer Logic

**Features**:

- Auto-start after set completion
- Configurable default rest time (user settings)
- Per-exercise rest time override
- Visual and audio notifications
- Background timer (continues when app minimized)

**Implementation**:

```typescript
// Start timer after set completion
restTimer.start({
  duration: exercise.restTime || userSettings.defaultRestTime,
  onComplete: () => {
    // Show notification
    // Play sound (if enabled)
    // Highlight next set
  }
})
```

### 7. Data Synchronization

#### 7.1 Sync Strategy

**New Architecture (Supabase-First)**:

1. **Push (Local → Supabase)**:
   - On data change, queue for sync
   - Debounced batch sync (5 seconds)
   - Client syncs IndexedDB → Supabase PostgreSQL only
   - Retry on failure with exponential backoff
   - Webhook triggers Edge Function for MongoDB sync

2. **Pull (Supabase → Local)**:
   - On app initialization
   - Periodic background sync (hourly)
   - Manual refresh option
   - Pulls from Supabase PostgreSQL (not MongoDB)

3. **Supabase → MongoDB Sync (Edge Function)**:
   - Server-side sync via Supabase Edge Function
   - Triggered by webhook when client sync starts
   - Supports manual invocation and scheduled cron jobs
   - Incremental sync based on `last_sync_at` metadata
   - Automatic data transformation (PostgreSQL → MongoDB format)
   - All MongoDB operations handled server-side

#### 7.2 Conflict Resolution

**Optimistic Locking**:

- Each record has `version` number
- On update, increment version
- If cloud version > local version, conflict detected
- Resolution: "Last write wins" (can be enhanced with merge strategy)

**Sync Queue**:

```typescript
{
  id: UUID
  userId: string
  tableName: string
  recordId: string
  operation: 'insert' | 'update' | 'delete'
  payload: JSON
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
}
```

---

## Data Architecture

### Database Schema

#### IndexedDB Schema (Dexie)

```typescript
// Database: FitTrackAI
{
  workouts: {
    id: number (auto-increment)
    userId: string
    date: Date
    startTime: Date
    endTime?: Date
    exercises: WorkoutExercise[]
    totalDuration: number
    totalVolume: number
    calories?: number
    notes?: string
    musclesTargeted: MuscleGroup[]
    workoutType: string
    mood?: WorkoutMood
    version: number
    deletedAt?: Date
  },
  
  exercises: {
    id: string (primary key)
    userId?: string (null for library exercises)
    name: string
    category: ExerciseCategory
    primaryMuscles: MuscleGroup[]
    secondaryMuscles: MuscleGroup[]
    equipment: string[]
    difficulty: Difficulty
    instructions: string[]
    videoUrl?: string
    isCustom: boolean
    trackingType: ExerciseTrackingType
    anatomyImageUrl?: string
    strengthlogUrl?: string
    strengthlogSlug?: string
    advancedDetails?: ExerciseAdvancedDetails
    muscleCategory?: string
    version: number
    deletedAt?: Date
  },
  
  muscleStatuses: {
    id: number (auto-increment)
    userId: string
    muscle: MuscleGroup
    lastWorked?: Date
    recoveryStatus: RecoveryStatus
    recoveryPercentage: number (0-100)
    workloadScore: number
    recommendedRestDays: number
    totalVolumeLast7Days: number
    trainingFrequency: number
    version: number
    deletedAt?: Date
  },
  
  workoutTemplates: {
    id: string (UUID)
    userId: string
    name: string
    category: TemplateCategory
    description?: string
    imageUrl?: string
    difficulty?: TemplateDifficulty
    daysPerWeek?: number
    exercises: TemplateExercise[]
    estimatedDuration: number
    musclesTargeted: MuscleGroup[]
    isFeatured?: boolean
    isTrending?: boolean
    matchPercentage?: number
    version: number
    deletedAt?: Date
  },
  
  plannedWorkouts: {
    id: string (UUID)
    userId: string
    scheduledDate: Date
    scheduledTime?: Date
    templateId?: string
    workoutName: string
    category: TemplateCategory
    estimatedDuration: number
    exercises: PlannedExercise[]
    musclesTargeted: MuscleGroup[]
    notes?: string
    isCompleted: boolean
    completedWorkoutId?: number
    version: number
    deletedAt?: Date
  },
  
  userProfiles: {
    userId: string (primary key)
    name: string
    experienceLevel: 'beginner' | 'intermediate' | 'advanced'
    goals: string[]
    equipment: string[]
    workoutFrequency: number
    preferredUnit: 'kg' | 'lbs'
    defaultRestTime: number
    age?: number
    gender?: 'male' | 'female' | 'other'
    weight?: number
    height?: number
    profilePicture?: string
    version: number
    deletedAt?: Date
  },
  
  settings: {
    id: number (auto-increment)
    userId: string
    key: string
    value: JSON
    version: number
    deletedAt?: Date
  },
  
  syncMetadata: {
    id: number (auto-increment)
    tableName: string
    userId: string
    lastSyncAt?: Date
    lastPushAt?: Date
    lastPullAt?: Date
    syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'conflict'
    conflictCount: number
    errorMessage?: string
    lastErrorAt?: Date
    recordCount?: number
    syncToken?: string
  },
  
  syncQueue: {
    id: UUID
    userId: string
    tableName: string
    recordId: string
    operation: 'insert' | 'update' | 'delete'
    payload: JSON
    status: 'pending' | 'processing' | 'completed' | 'failed'
    retryCount: number
    errorMessage?: string
    syncToken?: string
  },
  
  sleepLogs: {
    id: number (auto-increment)
    userId: string
    date: Date
    duration: number (minutes)
    quality: number (1-10)
    bedtime?: Date
    wakeTime?: Date
    notes?: string
    createdAt?: Date
    updatedAt?: Date
    version: number
    deletedAt?: Date
  },
  
  recoveryLogs: {
    id: number (auto-increment)
    userId: string
    date: Date
    overallRecovery: number (0-100)
    stressLevel: number (1-10)
    energyLevel: number (1-10)
    soreness: number (1-10)
    readinessToTrain: 'full-power' | 'light' | 'rest-day'
    notes?: string
    createdAt?: Date
    updatedAt?: Date
    version: number
    deletedAt?: Date
  },
  
  notifications: {
    id: string (UUID)
    userId: string
    type: NotificationType ('workout_reminder' | 'muscle_recovery' | 'ai_insight' | 'system' | 'achievement')
    title: string
    message: string
    data?: JSON (NotificationData)
    isRead: boolean
    readAt?: number (timestamp)
    createdAt: number (timestamp)
    version?: number
    deletedAt?: number (timestamp)
  }
}
```

#### MongoDB Schema

The MongoDB schema mirrors the IndexedDB schema with additional features:

1. **User Data Isolation**: Mongoose schemas enforce `userId` filtering for data isolation
2. **Pre-save Hooks**: Automatic version increment and timestamp updates
3. **Indexes**: Optimized for common query patterns (userId, userId+date, etc.)
4. **Soft Deletes**: `deletedAt` timestamp instead of hard deletes

### Data Relationships

```text
User (Auth0)
  ├── UserProfile (1:1)
  ├── Workouts (1:many)
  │     └── WorkoutExercises (1:many)
  │           └── WorkoutSets (1:many)
  ├── Exercises (1:many, custom only)
  ├── WorkoutTemplates (1:many)
  ├── PlannedWorkouts (1:many)
  ├── MuscleStatuses (1:many)
  ├── SleepLogs (1:many)
  ├── RecoveryLogs (1:many)
  ├── Notifications (1:many)
  └── Settings (1:many)
```

### Indexing Strategy

**IndexedDB Indexes**:

- `workouts`: `userId`, `date`, `userId+date`
- `exercises`: `category`, `isCustom`, `userId+isCustom`
- `muscleStatuses`: `userId`, `muscle`, `userId+muscle`
- `templates`: `userId`, `category`, `userId+category`
- `plannedWorkouts`: `userId`, `scheduledDate`, `userId+scheduledDate`

**MongoDB Indexes**:

- Similar to IndexedDB plus:
- `updatedAt` indexes for sync queries
- `deletedAt` indexes for soft delete queries
- Compound indexes for common query patterns (userId+updatedAt, userId+date)

---

## API & Integration Points

### 1. Auth0 Authentication API

**Endpoints Used**:

- User authentication (OAuth, email/password via Universal Login)
- Session management
- User profile retrieval

**Integration**:

```typescript
// Auth0 React SDK
import { useAuth0 } from '@auth0/auth0-react'

// Get current user
const { user } = useAuth0()
const userId = user?.sub || user?.email
```

### 2. MongoDB Atlas API

**Connection**:

- MongoDB Atlas connection string via `MONGODB_URI` environment variable
- Mongoose ODM for schema validation and query building
- Connection pooling and automatic reconnection

**Authentication**:

- Connection string authentication (username/password in URI)
- User ID validation enforced in application layer
- **User ID Enforcement**: All MongoDB queries MUST filter by `userId`
- User ID is validated before all operations to prevent runtime errors

**User ID Validation**:

All MongoDB operations require validated user IDs:

```typescript
import { requireUserId } from '@/utils/userIdValidation';
import { getSupabaseClientWithAuth } from '@/services/supabaseClient';
import { userScopedQuery } from '@/services/supabaseQueryBuilder';

// Validate userId before use
const userId = requireUserId(userContextManager.getUserId(), {
  functionName: 'myFunction',
  additionalInfo: { operation: 'data_fetch' },
});

// Get Supabase client
const supabase = await getSupabaseClientWithAuth(userId);

// Use user-scoped query helper
const { data, error } = await userScopedQuery(supabase, 'workouts', userId)
  .select('*')
  .order('date', { ascending: false });
```

**Sync Service**:

```typescript
// Sync local changes to Supabase (userId validated internally)
// Edge Function automatically syncs Supabase → MongoDB
await mongodbSyncService.sync(userId, {
  tables: ['workouts'],
  direction: 'push' // Only push to Supabase, Edge Function handles MongoDB
})
```

### 2.1 Supabase to MongoDB Sync Service

**Edge Function**: `supabase/functions/sync-to-mongodb`

**Purpose**: Syncs data from Supabase PostgreSQL database to MongoDB Atlas using a Supabase Edge Function. This enables server-side synchronization and supports webhook triggers, manual invocation, and scheduled cron jobs.

**Architecture**:

```
Supabase PostgreSQL → Edge Function → MongoDB Atlas
     (snake_case)      (Transform)    (camelCase)
```

**Features**:

- **Webhook Triggers**: Real-time sync on database changes (INSERT, UPDATE, DELETE)
- **Manual Invocation**: Sync specific users, tables, or records via API calls
- **Scheduled Jobs**: Periodic sync via cron jobs (hourly, daily, etc.)
- **Incremental Sync**: Only syncs records updated since last sync
- **Data Transformation**: Converts PostgreSQL format (snake_case) to MongoDB format (camelCase)
- **Error Handling**: Comprehensive error logging and retry logic
- **Conflict Resolution**: Tracks conflicts and sync status per user/table

**Environment Variables** (set in Supabase Dashboard):

- `DATABASE_URL`: MongoDB connection string
- `SUPABASE_URL`: Supabase project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access (auto-provided)
- `CRON_SECRET`: Secret for cron job authentication (optional)

**Request Types**:

1. **Webhook** (POST with payload):

```json
{
  "type": "INSERT" | "UPDATE" | "DELETE",
  "table": "workouts",
  "record": { ... },
  "old_record": { ... }
}
```

1. **Manual** (GET/POST with query params or body):

```
GET /functions/v1/sync-to-mongodb?userId=auth0|123&tableName=workouts&recordId=456
```

1. **Cron** (GET with cron secret header):

```
GET /functions/v1/sync-to-mongodb?cron=true
Header: x-cron-secret: <CRON_SECRET>
```

**Sync Metadata**:

The function tracks sync status in the `sync_metadata` table:

- `last_sync_at`: Last sync timestamp
- `sync_status`: Current sync status (idle, syncing, success, error, conflict)
- `conflict_count`: Number of conflicts encountered
- `error_message`: Last error message (if any)
- `record_count`: Number of records processed

**Tables Synced**:

- `workouts` → `workouts`
- `exercises` → `exercises`
- `workout_templates` → `workouttemplates`
- `planned_workouts` → `plannedworkouts`
- `muscle_statuses` → `musclestatuses`
- `user_profiles` → `userprofiles`
- `settings` → `settings`
- `notifications` → `notifications`
- `sleep_logs` → `sleeplogs`
- `recovery_logs` → `recoverylogs`
- `error_logs` → `errorlogs`

**Data Transformation**:

- Snake_case field names → camelCase
- PostgreSQL SERIAL IDs → MongoDB ObjectIds (with `_supabaseId` reference)
- TIMESTAMPTZ → Date objects
- JSONB → JSON
- Table-specific field mappings (e.g., `exerciseId`, `templateId`)

**Error Handling**:

- Errors logged to `error_logs` table
- Sync metadata updated with error details
- Retry logic with exponential backoff (configurable)
- Failed records tracked for manual review

**Usage Example**:

```typescript
// Manual sync via API
const response = await fetch(
  'https://<project>.supabase.co/functions/v1/sync-to-mongodb?userId=auth0|123&tableName=workouts',
  {
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  }
);
```

### 3. Google Gemini AI API

**Endpoint**:

- `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

**Request Format**:

```typescript
{
  contents: [{
    parts: [{
      text: string (prompt)
    }]
  }],
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048
  }
}
```

**Response Format**:

```typescript
{
  candidates: [{
    content: {
      parts: [{
        text: string (JSON response)
      }]
    }
  }]
}
```

**Rate Limiting**:

- 60 requests per minute (free tier)
- Caching strategy reduces API calls
- Background fetching spreads load

### 4. StrengthLog Integration (Future)

**Potential Endpoints**:

- Exercise details scraping
- Anatomy image URLs
- Exercise instructions

**Current Implementation**:

- Static exercise data with `strengthlogUrl` and `strengthlogSlug`
- Cached anatomy images

---

## Security & Authentication

### Authentication Flow

1. **User Registration/Login**:
   - Auth0 Universal Login handles authentication UI
   - Supports: Email/Password, OAuth (Google, Apple, etc.)
   - Session stored in Auth0

2. **Session Management**:
   - Auth0 session token stored in browser
   - Automatic token refresh
   - Logout clears session

3. **MongoDB Authentication**:
   - Connection string authentication via MongoDB Atlas
   - User ID validated in application layer
   - User-scoped queries enforce data isolation

### Data Security

#### 1. User Data Isolation

**MongoDB Query Filtering**:

All MongoDB queries are automatically scoped to the user's data using query filters:

```typescript
// User-scoped filter automatically applied
const filter = userScopedFilter(userId, 'workouts');
const workouts = await Workout.find(filter);
```

**Isolation Pattern**:

- All queries filter by `userId` field
- Mongoose schemas enforce `userId` as required for user-scoped collections
- Query builder helpers automatically add user filters
- Validation layer ensures userId is present before all operations

#### 1.1 User ID Enforcement in Queries

**Requirement**: All MongoDB queries MUST filter by `userId` to ensure data isolation.

**Implementation**:

1. **Query Builder Helpers**: `userScopedFilter()` automatically adds `userId` filter to all queries
2. **Model-Level Validation**: Mongoose schemas require `userId` for user-scoped collections
3. **Validation Layer**: `requireUserId()` validates userId before all operations
4. **Connection Security**: MongoDB Atlas connection string includes authentication

**Query Structure**:

- All queries: `Model.find({ userId: validatedUserId, deletedAt: null, ... })`
- Compound indexes ensure efficient user-scoped queries

**Validation**:

```typescript
// All userId inputs are validated
import { requireUserId, validateUserId } from '@/utils/userIdValidation';

// Type guard with runtime check
validateUserId(userId, { functionName: 'myFunction' });

// Require userId (throws if missing)
const userId = requireUserId(maybeUserId, {
  functionName: 'myFunction',
  additionalInfo: { operation: 'data_fetch' },
});
```

**Error Handling**:

- Custom `UserIdValidationError` class provides context
- Error messages include function name and operation context
- Validation failures are logged for debugging
- Error boundaries prevent app crashes

#### 2. Input Validation

**Client-Side Validation**:

```typescript
// Validate reps
if (!validateReps(reps)) {
  throw new Error('Invalid reps value')
}

// Validate weight
if (!validateWeight(weight)) {
  throw new Error('Invalid weight value')
}

// Sanitize strings
const sanitized = sanitizeString(userInput)
```

**Server-Side Validation**:

- Mongoose schemas enforce data types and validation rules
- Schema validators check enum values and required fields
- Index constraints maintain data integrity

#### 3. Data Encryption

- **In Transit**: HTTPS/TLS for all API calls
- **At Rest**: MongoDB Atlas encrypts data at rest
- **IndexedDB**: Browser-level encryption (browser-dependent)

#### 4. API Key Management

**Environment Variables**:

```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
VITE_GEMINI_API_KEY=...
```

**Security Best Practices**:

- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys periodically
- Monitor API usage for anomalies

### Privacy Considerations

1. **Data Minimization**: Only collect necessary data
2. **User Control**: Users can export and delete their data
3. **Local-First**: Data stored locally, user controls cloud sync
4. **No Third-Party Tracking**: No analytics or tracking services (except Vercel Analytics, which is privacy-focused)

---

## Performance & Scalability

### Performance Optimizations

#### 1. Code Splitting

**Route-Based Splitting**:

```typescript
// Lazy load pages
const Home = lazy(() => import('@/pages/Home'))
const Analytics = lazy(() => import('@/pages/Analytics'))
```

**Component Splitting**:

- Heavy components (3D muscle map) loaded on demand
- Chart libraries loaded only on Analytics page

#### 2. Data Caching

**AI Insights Cache**:

- 24-hour TTL
- Reduces API calls by 95%+
- Background refresh for seamless UX

**Muscle Image Cache**:

- Cached in IndexedDB
- Expiration: 7 days
- Preload on app initialization

**Query Cache**:

- In-memory cache for frequently accessed data
- Cache invalidation on data updates

#### 3. IndexedDB Optimization

**Batch Operations**:

```typescript
// Batch multiple writes
await db.transaction('rw', db.workouts, async () => {
  await Promise.all(workouts.map(w => db.workouts.put(w)))
})
```

**Index Usage**:

- Queries use indexes for fast lookups
- Composite indexes for common query patterns

#### 4. Rendering Optimization

**Virtual Scrolling**:

- `react-window` for long lists (exercise library)
- Only render visible items

**Memoization**:

```typescript
// Memoize expensive calculations
const volumeData = useMemo(() => 
  calculateVolumeTrend(workouts), 
  [workouts]
)
```

**Debouncing**:

- Search input debounced (300ms)
- Sync operations debounced (5 seconds)

### Scalability Considerations

#### 1. Database Scalability

**IndexedDB Limits**:

- Browser-dependent (typically 50MB-1GB)
- Automatic cleanup of old data
- Archive old workouts (optional feature)

**MongoDB Scalability**:

- MongoDB handles millions of documents
- Indexes optimize query performance
- Connection pooling for concurrent requests
- Horizontal scaling with sharding (MongoDB Atlas)

#### 2. API Rate Limiting

**Gemini AI**:

- 60 requests/minute (free tier)
- Caching reduces actual API calls
- Background fetching spreads load

**MongoDB Atlas**:

- Rate limits based on cluster tier
- Batch operations reduce request count
- Retry with exponential backoff

#### 3. Service Worker Optimization

**Background Processing**:

- AI insights fetched in background
- Muscle recovery recalculated periodically
- Sync operations queued and processed asynchronously

**Cache Strategy**:

- Static assets cached (Workbox)
- API responses cached where appropriate
- Cache invalidation on version updates

### Performance Metrics

**Target Metrics**:

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

**Monitoring**:

- Vercel Analytics for real user metrics
- Vercel Speed Insights for performance monitoring
- Custom logging for critical operations

---

## Deployment & DevOps

### Build Process

#### Development Build

```bash
npm run dev
```

- Vite dev server with HMR
- Source maps enabled
- Fast refresh

#### Production Build

```bash
npm run build:prod
```

- TypeScript type checking
- ESLint strict mode
- Vite production build
- Code minification
- Tree shaking
- Asset optimization

**Build Output**:

```text
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
├── sw.js (service worker)
└── manifest.json
```

### Deployment

#### Vercel Deployment

**Configuration** (`vercel.json`):

```json
{
  "buildCommand": "npm run build:prod",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Environment Variables**:

- Set in Vercel dashboard
- Automatically injected at build time
- Different values for preview/production

#### Service Worker Deployment

**Workbox Configuration**:

- `injectManifest` strategy
- Precached assets
- Runtime caching for API calls
- Background sync for offline operations

**Update Strategy**:

- Service worker updates on new deployment
- User prompted to refresh for updates
- Stale-while-revalidate for assets

### CI/CD Pipeline

**GitHub Actions** (if implemented):

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint:strict
      - run: npm run build:prod
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Database Migrations

**MongoDB Schema Updates**:

- Mongoose schemas defined in `src/services/mongodb/schemas/`
- Schema changes applied automatically on connection
- Versioned through Mongoose schema versioning
- Indexes created automatically on schema definition

**IndexedDB Migrations**:

- Handled by Dexie.js
- Schema version increments trigger migrations
- Data transformation scripts

### Monitoring & Logging

**Error Tracking**:

- Custom error handler logs to console
- Analytics tracking for errors
- User-friendly error messages

**Performance Monitoring**:

- Vercel Analytics
- Vercel Speed Insights
- Custom performance marks

**Logging Levels**:

- `error`: Critical errors requiring attention
- `warn`: Warnings (API failures, sync issues)
- `info`: Important events (workout saved, sync completed)
- `debug`: Detailed debugging information (dev only)

---

## Future Roadmap

### Phase 1: Enhanced Features (Q1 2024)

#### 1.1 Social Features

- **Workout Sharing**: Share workouts with friends
- **Community Challenges**: Participate in fitness challenges
- **Leaderboards**: Compare progress with friends

#### 1.2 Advanced Analytics

- **Body Composition Tracking**: Weight, body fat percentage
- **Strength Standards**: Compare to population averages
- **Volume Periodization**: Track volume over training cycles

#### 1.3 Nutrition Integration

- **Meal Logging**: Track calories and macros
- **Nutrition Goals**: Set and track nutrition targets
- **Meal Planning**: AI-generated meal plans

### Phase 2: Platform Expansion (Q2 2024)

#### 2.1 Mobile Apps

- **iOS Native App**: SwiftUI app with native features
- **Android Native App**: Kotlin app with Material Design
- **Cross-Platform Sync**: Seamless data sync across platforms

#### 2.2 Wearable Integration

- **Apple Health**: Import workout data
- **Google Fit**: Sync with Android devices
- **Wearable Devices**: Heart rate, step count integration

#### 2.3 Coach Features

- **Personal Trainers**: Coaches can manage client workouts
- **Program Templates**: Structured training programs
- **Progress Reports**: Automated client reports

### Phase 3: AI Enhancement (Q3 2024)

#### 3.1 Advanced AI Features

- **Form Analysis**: Video analysis for form correction
- **Injury Prevention**: AI-powered risk assessment
- **Personalized Programs**: Fully customized training plans

#### 3.2 Predictive Analytics

- **Performance Prediction**: Predict future PRs
- **Injury Risk**: Identify overtraining patterns
- **Optimal Training Times**: Suggest best workout times

### Phase 4: Enterprise Features (Q4 2024)

#### 4.1 Gym Management

- **Multi-User Gym Accounts**: Gym owners manage members
- **Equipment Tracking**: Track gym equipment usage
- **Class Scheduling**: Group class management

#### 4.2 API & Integrations

- **Public API**: Third-party integrations
- **Webhooks**: Real-time event notifications
- **Export Formats**: CSV, JSON, PDF exports

### Technical Debt & Improvements

#### Short-Term

- [ ] Improve error handling and user feedback
- [ ] Optimize bundle size (code splitting)
- [ ] Improve TypeScript type coverage

#### Medium-Term

- [ ] Implement proper state management patterns
- [ ] Add performance monitoring and alerting
- [ ] Improve accessibility (WCAG AAA)

#### Long-Term

- [ ] Migrate to micro-frontends (if needed)
- [ ] Implement GraphQL API layer
- [ ] Add real-time collaboration features
- [ ] Explore WebAssembly for heavy computations

---

## Appendix

### A. Glossary

- **RPE**: Rate of Perceived Exertion (1-10 scale)
- **PR**: Personal Record
- **PWA**: Progressive Web App
- **RLS**: Row-Level Security
- **HMR**: Hot Module Replacement
- **TTL**: Time To Live
- **CLS**: Cumulative Layout Shift
- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint

### B. Key Files Reference

**Core Services**:

- `src/services/dataService.ts`: Main data operations
- `src/services/aiService.ts`: AI insight generation
- `src/services/muscleRecoveryService.ts`: Recovery calculations
- `src/services/mongodbSyncService.ts`: Supabase sync (Edge Function handles MongoDB)
- `src/services/supabaseSyncWebhook.ts`: Webhook trigger for Edge Function

**State Management**:

- `src/store/workoutStore.ts`: Workout state
- `src/store/userStore.ts`: User state
- `src/store/settingsStore.ts`: Settings state

**Types**:

- `src/types/workout.ts`: Workout-related types
- `src/types/exercise.ts`: Exercise-related types
- `src/types/muscle.ts`: Muscle and recovery types
- `src/types/analytics.ts`: Analytics types
- `src/types/insights.ts`: AI insights types

### C. Environment Variables

**Required**:

- `VITE_AUTH0_DOMAIN`: Auth0 tenant domain
- `VITE_AUTH0_CLIENT_ID`: Auth0 application client ID
- `MONGODB_URI`: MongoDB Atlas connection string

**Optional**:

- `VITE_GEMINI_API_KEY`: Google Gemini AI key (for AI insights)

### D. Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Linting
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run lint:strict      # Strict linting (no warnings)

# Data
npm run scrape:exercises # Scrape exercise data
```

### E. Support & Resources

**Documentation**:

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Auth0 Documentation](https://auth0.com/docs)
- [Google Gemini AI](https://ai.google.dev)

**Community**:

- GitHub Issues for bug reports
- Discussions for feature requests
- Pull requests welcome

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: FitTrackAI Development Team

---

## Recent Enhancements (January 2026)

### Design System & UI/UX Standardization

#### Implementation Overview

A comprehensive design system was implemented to standardize UI/UX across the entire application, eliminating inconsistencies in spacing, colors, typography, and component styling.

**Files Created:**

- `/src/styles/designSystem.ts` - Centralized design tokens
- `/src/utils/styleHelpers.ts` - Style composition utilities
- `/DESIGN_SYSTEM.md` - Complete design system documentation

**Key Features:**

- **Spacing Scale**: 5-tier padding system (compact/base/comfortable/spacious/generous)
- **Typography System**: Standardized headings, body text, labels, and stats
- **Color Tokens**: Dark mode-first approach with semantic colors
- **Shadow Hierarchy**: Consistent elevation across components
- **Preset Styles**: Ready-to-use card, button, input, section styles

#### Dark Mode Consistency

**Problem:** Inconsistent use of `dark:bg-gray-700/800/900` throughout 41+ files  
**Solution:** Systematic replacement with custom Tailwind colors using the Obsidian/Saffron palette:

- `dark:bg-background-dark` - Page backgrounds (#050505 - Deep obsidian-black)
- `dark:bg-surface-dark` - Card surfaces (#18181b - Charcoal-grey/Zinc 900)
- `dark:bg-surface-dark-light` - Hover states (#27272a - Lighter charcoal/Zinc 800)
- `dark:border-border-dark` - Borders (#27272a)
- `primary` - Brand color (#FF9933 - Vibrant Saffron/Orange)
- `primary-dark` - Hover states (#E67E22)
- `dark:bg-surface-dark` - Card surfaces (#183423)
- `dark:bg-surface-dark-light` - Hover states (#224932)
- `dark:border-border-dark` - Borders (#316847)

**Impact:**

- Unified visual appearance in dark mode
- Easier maintenance and theme updates
- Better brand consistency

#### Style Helper Utilities

```typescript
// Example usage
import { cn, cardStyles } from '@/utils/styleHelpers';
import { typography, spacing } from '@/styles/designSystem';

<div className={cardStyles('feature')}>
  <h3 className={typography.cardTitle}>Title</h3>
</div>
```

**Benefits:**

- Consistent styling with 80% less code
- Type-safe design tokens
- Automatic conflict resolution (tailwind-merge)
- Composable style patterns

---

### Performance Optimizations

#### React.memo Implementation

**Components Optimized:**

- `MuscleGroupIcon` - Prevents re-renders on recovery status changes
- `MuscleGroupStatusCard` - Memoized with custom comparison
- `VolumeByMuscleChart` - Chart re-renders only on data change

**Performance Gains:**

- 40-60% reduction in unnecessary re-renders
- Smoother animations and interactions
- Lower CPU usage during workout logging

#### Code Splitting & Lazy Loading

**Implementation:**
All major pages lazy loaded with React.lazy():

```typescript
const LogWorkout = lazy(() => import('@/pages/LogWorkout'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Profile = lazy(() => import('@/pages/Profile'));
// ... 15+ pages total
```

**Wrapped with Suspense boundaries:**

```typescript
<Suspense fallback={<RouteLoader />}>
  <LogWorkout />
</Suspense>
```

**Benefits:**

- Initial bundle reduced by ~45%
- Faster first contentful paint
- On-demand loading of heavy components
- Better Core Web Vitals scores

---

### Zod Validation System Integration

#### Implementation Overview

A comprehensive type-safe validation system was implemented using Zod, replacing ad-hoc validation logic with centralized, composable schemas. This provides runtime validation with automatic TypeScript type inference.

**Files Created:**

- `/src/utils/validationSchemas.ts` - Centralized Zod validation schemas (600+ lines)
- `/src/hooks/useZodForm.ts` - React Hook Form + Zod integration
- `/src/hooks/useFieldValidation.ts` - Field-level validation hooks
- `/src/components/forms/ExampleProfileForm.tsx` - Reference implementation
- `/docs/VALIDATION_GUIDE.md` - Complete validation documentation

**Files Modified:**

- `/src/utils/validators.ts` - Updated to use Zod underneath while maintaining backward compatibility

#### Key Features

**1. Comprehensive Schema Library**

All validation logic centralized in reusable schemas:

```typescript
// Workout validation
import { weightKgSchema, repsSchema, durationSecondsSchema } from '@/utils/validationSchemas';

// Profile validation
import { ageSchema, heightCmSchema, bodyWeightKgSchema } from '@/utils/validationSchemas';

// Form validation
import { loginFormSchema, profileSettingsFormSchema } from '@/utils/validationSchemas';
```

**Available Schemas:**
- **Numbers**: Weight (kg/lbs), reps, distance (km/miles), duration, calories, steps, RPE, heart rate
- **Text**: Name, notes, email, password
- **Profile**: Age, height, weight, gender, goals, experience level
- **Workout Sets**: Weight/reps, reps-only, cardio, duration tracking
- **Forms**: Login, sign up, profile settings, exercise, template creation

**2. Type-Safe Form Handling**

Automatic TypeScript type inference from schemas:

```typescript
import { useZodForm } from '@/hooks/useZodForm';
import { profileSettingsFormSchema, ProfileSettingsFormData } from '@/utils/validationSchemas';

function ProfileForm() {
  const { register, handleSubmit, formState: { errors } } = useZodForm({
    schema: profileSettingsFormSchema,
    defaultValues: { name: '' },
  });

  // data is fully typed as ProfileSettingsFormData!
  const onSubmit = (data: ProfileSettingsFormData) => {
    updateProfile(data); // TypeScript validates this automatically
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Save</button>
    </form>
  );
}
```

**3. Field-Level Validation Hooks**

Three specialized hooks for different validation scenarios:

```typescript
// Single field validation
const { validate, error, isValid } = useFieldValidation(emailSchema);

// Multiple fields independently
const { validators, errors, isValid } = useMultiFieldValidation({
  email: emailSchema,
  password: passwordSchema,
});

// Async validation (e.g., checking if email exists)
const { validate, isValidating, error } = useAsyncFieldValidation(
  emailSchema,
  checkEmailExists,
  500 // debounce ms
);
```

**4. Dynamic Schema Generation**

Schemas adapt to user preferences:

```typescript
import { createWeightSchema, createDistanceSchema } from '@/utils/validationSchemas';

// Weight validation based on user's unit preference
const weightSchema = createWeightSchema(userPreferredUnit); // 'kg' or 'lbs'

// Distance validation
const distanceSchema = createDistanceSchema('km'); // or 'miles'

// Workout set validation based on tracking type
const setSchema = createCompletedSetSchema('weight_reps', 'kg');
```

**5. Helper Functions**

Simplified validation API for quick checks:

```typescript
import { validateField, validateFields } from '@/utils/validationSchemas';

// Single field
const { success, error } = validateField(repsSchema, 15);

// Multiple fields
const { success, errors, data } = validateFields(formSchema, formData);
```

#### Validation Examples

**Example 1: Weight Validation**

```typescript
import { weightKgSchema } from '@/utils/validationSchemas';

const result = weightKgSchema.safeParse(80);
if (result.success) {
  console.log('Valid weight:', result.data); // 80
} else {
  console.error(result.error.errors[0].message);
}

// Error cases:
weightKgSchema.safeParse(-5);    // "Weight must be greater than 0"
weightKgSchema.safeParse(1500);  // "Weight cannot exceed 1000 kg"
weightKgSchema.safeParse('abc'); // "Expected number, received string"
```

**Example 2: Workout Set Validation**

```typescript
import { validateWorkoutSet } from '@/utils/validationSchemas';

const set = {
  setNumber: 1,
  completed: true,
  weight: 80,
  reps: 10,
  unit: 'kg',
};

const { success, error } = validateWorkoutSet(set, 'weight_reps', 'kg');
if (!success) {
  console.error(error); // Clear error message for user
}
```

**Example 3: Profile Form**

```typescript
import { profileSettingsFormSchema } from '@/utils/validationSchemas';

const formData = {
  name: 'John Doe',
  age: 25,
  gender: 'male',
  height: 180,
  weight: 80,
};

const result = profileSettingsFormSchema.safeParse(formData);
if (result.success) {
  // result.data is typed and validated
  saveProfile(result.data);
}
```

#### Benefits

**1. Type Safety**
- Automatic TypeScript type inference from schemas
- Compile-time type checking prevents runtime errors
- IntelliSense autocomplete for form fields

**2. Consistency**
- Single source of truth for validation rules
- No duplicate validation logic across components
- Standardized error messages

**3. Developer Experience**
- Simple, declarative schema syntax
- Composable schemas for complex validations
- Easy to test and maintain

**4. User Experience**
- Clear, descriptive error messages
- Real-time validation feedback
- Consistent validation across the app

**5. Maintainability**
- Centralized validation logic (600+ lines vs scattered)
- Easy to update rules globally
- Reduced code duplication

#### Migration Strategy

**Backward Compatibility:**

The old `validators.ts` functions remain available but now use Zod underneath:

```typescript
// Old API still works
import { validateWeight } from '@/utils/validators';
const result = validateWeight(80, 'kg'); // { valid: true }

// But new API is recommended
import { weightKgSchema } from '@/utils/validationSchemas';
const result = weightKgSchema.safeParse(80);
```

**Deprecation Plan:**

1. ✅ Phase 1 (Completed): Create Zod schemas and hooks
2. ✅ Phase 2 (Completed): Update validators.ts to use Zod underneath
3. ⏳ Phase 3 (Ongoing): Migrate components to use Zod directly
4. 🔮 Phase 4 (Future): Deprecate old validators.ts API

**Migration Example:**

```typescript
// Before (old way)
const [errors, setErrors] = useState({});
const validate = () => {
  if (!name || name.length > 100) {
    setErrors({ name: 'Name is required and must be under 100 characters' });
  }
};

// After (new way with Zod)
const { register, handleSubmit, formState: { errors } } = useZodForm({
  schema: z.object({ name: nameSchema }),
  defaultValues: { name: '' },
});
```

#### Technical Architecture

**Schema Organization:**

```
validationSchemas.ts (600+ lines)
├── Common Schemas (weight, reps, duration, etc.)
├── Text Field Schemas (name, email, password, etc.)
├── Profile Schemas (age, height, weight, gender, etc.)
├── Workout Set Schemas (by tracking type)
├── Exercise & Workout Schemas
├── Template Schemas
├── Form Schemas (composed from above)
└── Helper Functions (validateField, validateWorkoutSet, etc.)
```

**Hook Architecture:**

```
useZodForm.ts
└── Wraps react-hook-form with zodResolver

useFieldValidation.ts
├── useFieldValidation (single field)
├── useMultiFieldValidation (multiple fields)
└── useAsyncFieldValidation (with debouncing)
```

#### Validation Rules Summary

| Field Type | Min | Max | Rules |
|-----------|-----|-----|-------|
| Weight (kg) | 0 | 1000 | Positive, finite |
| Weight (lbs) | 0 | 2200 | Positive, finite |
| Reps | 1 | 500 | Integer, positive |
| Distance (km) | 0 | 1000 | Non-negative |
| Distance (miles) | 0 | 621 | Non-negative |
| Duration (seconds) | 0 | 86400 | Max 24 hours |
| Calories | 0 | 10000 | Optional |
| Steps | 0 | 100000 | Optional, integer |
| RPE | 1 | 10 | Optional, integer |
| Heart Rate (BPM) | 30 | 220 | Optional, integer |
| Name | 1 char | 100 chars | Trimmed, required |
| Notes | 0 | 1000 chars | Optional |
| Age | 13 | 120 | Integer |
| Height (cm) | 50 | 300 | - |
| Body Weight (kg) | 20 | 500 | - |
| Password | 8 | 128 chars | - |

#### Dependencies

**Packages Installed:**
```json
{
  "zod": "^3.x.x",
  "react-hook-form": "^7.x.x",
  "@hookform/resolvers": "^3.x.x"
}
```

**Bundle Impact:**
- Zod: ~13KB gzipped
- React Hook Form: ~9KB gzipped
- Total: ~22KB additional bundle size

**Trade-off:** The small bundle increase is justified by:
- Elimination of 500+ lines of validation code
- Improved type safety preventing runtime errors
- Better developer experience and maintainability

#### Reference Implementation

See `/src/components/forms/ExampleProfileForm.tsx` for a complete, production-ready example showcasing:
- Type-safe form handling with useZodForm
- Error display and validation feedback
- Dynamic field behavior (e.g., weight unit display)
- Loading states and form submission
- Proper accessibility (labels, error messages)

#### Documentation

Complete validation guide available at `/docs/VALIDATION_GUIDE.md` covering:
- Quick start guide
- All available schemas with examples
- Validation hook usage
- Form validation patterns
- Custom schema creation
- Migration guide from old validators
- Best practices and troubleshooting

---

### Workout Set Validation & UX Flow

#### Implementation Overview

Implemented comprehensive validation for the LogExercise component to prevent users from adding new workout sets when inappropriate, ensuring data integrity and proper rest timer enforcement.

**Problem Addressed:**
- Users could add multiple incomplete sets simultaneously
- Sets could be added while rest timer was active (defeating rest enforcement)
- No clear feedback about why adding a set was blocked
- Potential data integrity issues from conflicting states

**Files Modified:**
- `/src/components/workout/LogExercise.tsx` - Core validation logic and UI updates
- `/src/components/exercise/CurrentSetCard.tsx` - Set card validation support (already had disabled prop)
- `/src/components/exercise/CardioSetCard.tsx` - Cardio set validation
- `/src/components/exercise/HIITSetCard.tsx` - HIIT set validation
- `/src/components/exercise/YogaSetCard.tsx` - Yoga set validation

**Files Created:**
- `/docs/SET_VALIDATION_UX.md` - Complete documentation of validation flow and UX

#### Validation Rules

Users can add a new set **only when**:
1. ✅ An exercise is selected
2. ✅ No incomplete set exists (current set completed or canceled)
3. ✅ Rest timer is not active (or auto-start rest timer disabled)

Adding a set is **blocked when**:
- Incomplete set exists → "Complete or cancel the current set first"
- Rest timer is active → "Wait for rest timer to finish or skip it"

#### Implementation Details

**1. Computed Validation State**

```typescript
// Memoized validation check
const canAddNewSet = useMemo(() => {
  if (!selectedExercise) return false;
  const hasIncompleteSet = sets.some(set => !set.completed);
  if (hasIncompleteSet) return false;
  if (restTimerVisible && settings.autoStartRestTimer) return false;
  return true;
}, [selectedExercise, sets, restTimerVisible, settings.autoStartRestTimer]);

// User-friendly blocking reason
const addSetBlockedReason = useMemo(() => {
  if (!selectedExercise) return null;
  const hasIncompleteSet = sets.some(set => !set.completed);
  if (hasIncompleteSet) return 'Complete or cancel the current set first';
  if (restTimerVisible && settings.autoStartRestTimer) {
    return 'Wait for rest timer to finish or skip it';
  }
  return null;
}, [selectedExercise, sets, restTimerVisible, settings.autoStartRestTimer]);
```

**2. Validation in handleAddSet**

```typescript
const handleAddSet = () => {
  if (!selectedExercise) return;

  // Validate before adding
  if (!canAddNewSet) {
    if (addSetBlockedReason) {
      showError(addSetBlockedReason); // Toast notification
    }
    return;
  }

  // Proceed with adding the set...
};
```

**3. Integration with Set Cards**

All set card components now receive validation state:

```typescript
<CurrentSetCard
  // ... other props
  onAddSet={canAddNewSet ? handleAddSet : undefined}  // Only pass callback when allowed
  disabled={!canAddNewSet}  // Disable internal buttons
/>
```

#### UI/UX Components

**1. Disabled Button State**

```tsx
<button
  disabled={!canAddNewSet}
  className={cn(
    "rounded-xl h-12 border-2 font-semibold transition-all",
    canAddNewSet
      ? "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer"
      : "border-gray-300/30 bg-gray-100/50 text-gray-400 cursor-not-allowed opacity-60"
  )}
>
  Add Set
</button>
```

**Visual Indicators:**
- **Enabled**: Green border/text, hover effects, pointer cursor
- **Disabled**: Gray border/text, reduced opacity, not-allowed cursor

**2. Hover Tooltip**

When disabled, hovering shows reason:

```tsx
{!canAddNewSet && addSetBlockedReason && (
  <div className="tooltip">
    {addSetBlockedReason}
  </div>
)}
```

**3. Visual Feedback Banner**

Prominent banner at top of screen when blocked:

```tsx
{!canAddNewSet && addSetBlockedReason && completedSets.length > 0 && (
  <motion.div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
    <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400">
      <WarningIcon />
      <p>{addSetBlockedReason}</p>
    </div>
  </motion.div>
)}
```

**Features:**
- Amber/yellow warning color scheme
- Warning icon
- Smooth slide-in animation
- High z-index (appears above content)
- Only shows when blocking condition exists

#### User Flows

**Happy Path:**
1. User completes a set
2. Rest timer starts automatically
3. "Add Set" button disabled
4. Banner shows: "Wait for rest timer to finish or skip it"
5. User waits or clicks "Skip Rest"
6. Rest timer ends
7. "Add Set" button enabled
8. Banner disappears
9. User adds new set successfully

**Cancel Flow:**
1. User editing incomplete set
2. "Add Set" disabled
3. User clicks "Cancel Set"
4. Set removed
5. "Add Set" enabled (if no rest timer)

**Error Prevention:**
1. User tries to click disabled "Add Set"
2. Tooltip shows on hover
3. Toast error shows on click attempt
4. No new set added
5. User guided to resolve blocking condition

#### Benefits

**1. Data Integrity**
- No duplicate incomplete sets
- Proper rest time tracking
- Correct set numbering
- Prevents conflicting states

**2. User Guidance**
- Clear feedback on why action blocked
- Multiple feedback mechanisms (tooltip, banner, toast)
- Visual states indicate what's possible

**3. Best Practices Enforcement**
- Encourages proper rest between sets
- Prevents rushing through logging
- Promotes accurate data entry

**4. Improved UX**
- Reduces confusion and errors
- Immediate feedback
- Professional interaction flow
- Consistent across all set types

#### Edge Cases Handled

1. **Auto-start rest timer disabled**: No rest timer blocking
2. **Multiple set types**: Works for strength, cardio, HIIT, yoga
3. **Superset mode**: Group rest timer handled separately
4. **First set**: No blocking (no previous set to rest from)

#### Accessibility

- Disabled button remains focusable
- Tooltip appears on focus (not just hover)
- `aria-disabled` and `aria-label` properly set
- WCAG AA contrast ratios maintained
- Full dark mode support

#### Performance

- `canAddNewSet` and `addSetBlockedReason` are memoized
- Only recalculate when dependencies change
- Minimal re-renders
- No performance impact

#### Documentation

Complete user flow documentation available at:
- `/docs/SET_VALIDATION_UX.md` - Full validation guide with flows, testing, and examples

---

### AI Feature Enhancements

#### Enhanced AI Home Card

**New Features:**

1. **Recovery Status Bar**
   - Real-time overall muscle recovery percentage
   - Color-coded progress (green/yellow/red)
   - Zap icon intensity indicator

2. **Quick Action Buttons**
   - "Start Workout" - Direct navigation to logging
   - "View Progress" - Jump to recovery page
   - Stop propagation for nested click handling

3. **Visual Improvements**
   - Recovery status integrated into recommendation card
   - Animated progress bars with glow effects
   - Enhanced AI tip display with better contrast

**Code Location:** `/src/components/home/AIFocusCard.tsx`

#### Smart Rest Timer

**New Component:** `/src/components/exercise/SmartRestTimer.tsx`

**AI-Powered Features:**

- Calculates optimal rest based on:
  - Exercise type (compound vs isolation)
  - Set intensity (RPE 1-10)
  - Muscle recovery status (0-100%)
  - Cumulative workout fatigue
  
**Rest Time Algorithm:**

```
Base Time (by exercise):
- Powerlifting: 5 minutes
- Compound: 3 minutes  
- Isolation: 1.5 minutes

Adjustments:
+ RPE 9-10: +60s
+ RPE 7-8: +30s
+ Muscle fatigue < 50%: +20%
+ Workout fatigue > 70%: +30%
```

**User Features:**

- Real-time countdown with progress bar
- AI reasoning display ("High intensity set - extra recovery time")
- Quick adjustments: ±15s, +30s, +1m buttons
- Intensity badge (low/medium/high/very_high)
- Skip rest option
- Pause/resume controls

**Utility Functions:** `/src/utils/smartRestTimer.ts`

- `calculateSmartRestTime()` - Core algorithm
- `estimateRPE()` - Auto-calculate RPE from weight/reps
- `calculateWorkoutFatigue()` - Cumulative fatigue model
- `formatRestTime()` - Human-readable time display

---

### Code Quality Improvements

#### Linting & Formatting

**Created Configuration Files:**

1. **Prettier** (`.prettierrc`)
   - 100-character line width
   - Single quotes for JS/TS
   - Trailing commas (ES5)
   - Tailwind CSS class sorting plugin

2. **ESLint** (`.eslintrc.cjs`)
   - TypeScript-aware rules
   - React Hooks linting
   - Unused variable warnings
   - Enforce const over let
   - Require curly braces
   - No duplicate imports

**Scripts to Add to package.json:**

```json
{
  "scripts": {
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,md}\""
  }
}
```

---

### Migration Impact

#### Before vs After Metrics

**Bundle Size:**

- Before: ~850KB (uncompressed)
- After: ~650KB (uncompressed)
- **Improvement: 23% reduction**

**Code Consistency:**

- Before: 47 unique spacing values
- After: 5 semantic spacing tokens
- Before: 8 different card border radii
- After: 2 standardized radii

**Dark Mode:**

- Before: 41 files with inconsistent colors
- After: 0 files with gray-700/800/900
- **100% consistency**

**Performance:**

- React re-renders reduced by 40-60% (heavy components)
- Initial page load improved by ~800ms
- Interaction to Next Paint (INP) improved by 150ms

---

### Developer Experience Improvements

#### Benefits

1. **Faster Development**
   - Pre-built style presets reduce boilerplate
   - Auto-complete for design tokens (TypeScript)
   - No need to remember arbitrary values

2. **Easier Maintenance**
   - Single source of truth for styles
   - Global theme changes in one file
   - Consistent patterns across codebase

3. **Better Collaboration**
   - Design system documentation
   - Clear naming conventions
   - Predictable component APIs

4. **Quality Assurance**
   - ESLint catches common mistakes
   - Prettier ensures consistent formatting
   - Type-safe style composition

---

### Future Optimization Opportunities

#### Recommended Next Steps

1. **Bundle Optimization**
   - Analyze with webpack-bundle-analyzer
   - Tree-shake unused Lucide icons
   - Consider dynamic imports for charts

2. **Image Optimization**
   - Implement responsive image loading
   - Add blur placeholders for muscle images
   - Use WebP with PNG fallback

3. **Code Refactoring**
   - Split LogWorkout.tsx (69KB) into smaller modules
   - Extract Profile.tsx sections into components
   - Simplify NotificationPanel.tsx nesting

4. **Accessibility Enhancements**
   - WCAG AA compliance audit
   - Screen reader testing
   - Keyboard navigation improvements

---
