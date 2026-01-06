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
11. [Testing Strategy](#testing-strategy)
12. [Future Roadmap](#future-roadmap)

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
- **Implementation**: IndexedDB-first architecture with background sync to MongoDB

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

**Business Rules**:

- Insights generated daily using last 30 days of workout data
- Recommendations prioritize muscles with recovery status "ready"
- Alerts triggered for overworked muscles or low readiness scores
- AI responses cached for 24 hours to reduce API costs

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
2. **Background Sync**: Bidirectional sync with MongoDB Atlas when online
3. **Service Worker**: Background processing and offline support
4. **Component-Based**: React component architecture with code splitting

### Architecture Diagram

```
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
5. **Background Sync** → Queued for MongoDB sync when online
6. **UI Update** → Component re-renders with new data

### Key Architectural Patterns

#### 1. Offline-First Pattern

- All data operations write to IndexedDB first
- MongoDB sync happens asynchronously in background
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

- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **ESLint**: Code linting
- **TypeScript**: Type checking

---

## Core Features & Business Logic

### 1. Workout Logging System

#### 1.1 Workout Creation Flow

```
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

```
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

**Bidirectional Sync**:

1. **Push (Local → Cloud)**:
   - On data change, queue for sync
   - Debounced batch sync (5 seconds)
   - Retry on failure with exponential backoff

2. **Pull (Cloud → Local)**:
   - On app initialization
   - Periodic background sync (hourly)
   - Manual refresh option

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

```
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
import { connectToMongoDB } from '@/services/mongodbClient';
import { userScopedFilter } from '@/services/mongodbQueryBuilder';
import { Workout } from '@/services/mongodb/schemas';

// Validate userId before use
const userId = requireUserId(userContextManager.getUserId(), {
  functionName: 'myFunction',
  additionalInfo: { operation: 'data_fetch' },
});

// Connect to MongoDB
await connectToMongoDB();

// Use user-scoped filter helper
const filter = userScopedFilter(userId, 'workouts');
const data = await Workout.find(filter).sort({ date: -1 });
```

**Sync Service**:

```typescript
// Sync local changes with MongoDB (userId validated internally)
await mongodbSyncService.sync(userId, {
  tables: ['workouts'],
  direction: 'bidirectional'
})
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

```
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
      - run: npm run test
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

## Testing Strategy

### Unit Testing

**Framework**: Vitest

**Test Coverage Targets**:

- Services: 80%+
- Utilities: 90%+
- Hooks: 70%+

**Example Test**:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateVolume } from '@/utils/calculations'

describe('calculateVolume', () => {
  it('calculates volume correctly', () => {
    const sets = [
      { reps: 10, weight: 100, completed: true },
      { reps: 8, weight: 100, completed: true }
    ]
    expect(calculateVolume(sets)).toBe(1800)
  })
})
```

### Integration Testing

**Service Layer Tests**:

- Test service interactions
- Mock IndexedDB and API calls
- Verify data transformations

**Component Tests**:

- React Testing Library
- Test user interactions
- Verify state updates

### End-to-End Testing

**Framework**: Playwright

**Test Scenarios**:

1. User registration and login
2. Complete workout logging flow
3. View analytics and insights
4. Create and use workout template
5. Offline functionality

**Example E2E Test**:

```typescript
import { test, expect } from '@playwright/test'

test('log workout flow', async ({ page }) => {
  await page.goto('/log-workout')
  await page.click('text=Start Workout')
  await page.fill('[data-testid=exercise-search]', 'bench press')
  await page.click('text=Bench Press')
  await page.fill('[data-testid=reps-input]', '10')
  await page.fill('[data-testid=weight-input]', '100')
  await page.click('text=Complete Set')
  await page.click('text=Finish Workout')
  await expect(page.locator('text=Workout saved')).toBeVisible()
})
```

### Manual Testing Checklist

**Workout Logging**:

- [ ] Create new workout
- [ ] Add multiple exercises
- [ ] Log sets with different tracking types
- [ ] Complete workout
- [ ] Verify data saved correctly

**Muscle Recovery**:

- [ ] Verify recovery status updates after workout
- [ ] Check recovery percentage calculation
- [ ] Test recovery status display on muscle map

**AI Insights**:

- [ ] Generate insights with valid API key
- [ ] Verify insights display correctly
- [ ] Test caching (should not regenerate within 24 hours)

**Offline Functionality**:

- [ ] Disable network
- [ ] Log workout offline
- [ ] Verify data saved locally
- [ ] Re-enable network
- [ ] Verify sync completes

**Data Sync**:

- [ ] Make changes on device A
- [ ] Verify sync to MongoDB
- [ ] Check device B receives updates
- [ ] Test conflict resolution

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
- [ ] Add comprehensive test coverage
- [ ] Improve TypeScript type coverage

#### Medium-Term

- [ ] Refactor service layer for better testability
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
- `src/services/mongodbSyncService.ts`: Cloud sync

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

# Testing
npm run test             # Run unit tests
npm run test:ui          # Run tests with UI
npm run test:e2e         # Run E2E tests

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
