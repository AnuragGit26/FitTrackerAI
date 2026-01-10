# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
npm run dev              # Start Vite dev server on port 3000
npm run dev:api          # Start development API server (port 3001)
npm run dev:all          # Run both dev server and API concurrently
```

### Building & Linting

```bash
npm run build            # Standard build (allows up to 1000 warnings)
npm run build:prod       # Production build (strict: 0 warnings, type checks)
npm run preview          # Preview production build locally

npm run lint             # Check for lint issues (max 1000 warnings)
npm run lint:strict      # Strict lint check (0 warnings allowed)
npm run lint:fix         # Auto-fix lint issues
npm run lint:check       # Same as lint (CI-friendly)
```

### Testing

```bash
npm run test             # Run test suite
tsc --noEmit             # Type check without emitting files
```

### Utilities

```bash
npm run scrape:exercises # Scrape exercise data from StrengthLog
```

## Architecture Overview

FitTrackAI is an **offline-first Progressive Web App** for gym tracking with AI-powered insights. The architecture prioritizes local-first data with eventual server synchronization.

### Core Data Flow Pattern

```
User Action → Zustand Store → IndexedDB (via dataService) → Event Emission → Store Reload → MongoDB/Supabase Sync Queue
```

**Key principle**: IndexedDB is the source of truth. Server sync is asynchronous and non-blocking.

### Database Architecture (Three-Tier)

1. **IndexedDB (Dexie)** - Primary storage
   - Location: `src/services/database.ts`
   - Database name: `FitTrackAIDB`
   - Current schema version: 13
   - Tables: workouts, exercises, muscleStatuses, settings, workoutTemplates, plannedWorkouts, syncMetadata, pendingSyncQueue, aiCacheMetadata, sleepLogs, recoveryLogs, notifications, errorLogs
   - All tables use composite indexes with `userId` for user isolation
   - Version-based conflict resolution via `updatedAt` timestamps

2. **LocalStorage** - Profile pictures only
   - Format: `fitTrackAI_profilePicture_{userId}`
   - Stores base64 or Supabase URLs

3. **Supabase + MongoDB** - Server sync
   - Supabase: Anonymous auth, edge functions, cross-device sync
   - MongoDB: Canonical server data store
   - Sync via `mongodbSyncService.ts` with bidirectional conflict resolution

### State Management (Zustand)

Stores are in `src/store/`:

- `userStore.ts` - User profile, Auth0 sync
- `workoutStore.ts` - Current workout, workout history
- `settingsStore.ts` - App settings
- `templateStore.ts` - Workout templates
- `plannedWorkoutStore.ts` - Scheduled workouts

**Pattern**: Stores call `dataService` methods which save to IndexedDB and emit events. Event listeners reload store state to trigger UI updates.

### Service Layer Architecture

**Data Services** (`src/services/`):

- `dataService.ts` - Central event emitter, sync queue manager
- `dataSync.ts` - Connects stores to dataService events on app boot
- `mongodbSyncService.ts` - Bidirectional MongoDB sync with conflict resolution
- `syncMetadataService.ts` - Tracks last sync timestamps per table
- `userContextManager.ts` - Global userId management (prevents cross-user leaks)

**AI Services**:

- `aiService.ts` - Google Gemini API integration (2.5-flash model)
- `aiRefreshService.ts` - 24-hour refresh rule, new workout detection
- `aiChangeDetector.ts` - Data fingerprinting for cache invalidation
- `aiCallManager.ts` - Rate limiting and response caching
- `aiDataProcessor.ts` - Data preprocessing for AI consumption

**Analysis Services**:

- `workoutAnalysisService.ts` - Workout pattern detection, recommendations
- `muscleRecoveryService.ts` - Per-muscle workload and recovery calculation
- `recoveryCalculator.ts` - Multi-factor recovery scores
- `analyticsService.ts` - Progress tracking, personal records

**Other Key Services**:

- `exerciseLibrary.ts` - Exercise database with search/filtering
- `templateService.ts` - Workout template CRUD
- `notificationService.ts` - Browser notifications
- `restTimerService.ts` - Rest period tracking

### Critical Patterns

1. **User-Scoped Data**: All queries filtered by `userId` via `UserContextManager`
2. **Event-Driven Updates**: `dataService.emit(eventType)` triggers store reloads
3. **Persistent Sync Queue**: Failed syncs stored in IndexedDB, retry on reconnection
4. **Debounced Sync**: 5-second debounce before MongoDB sync attempts
5. **Local-First Conflict Resolution**: Local changes always win initially, server merge later
6. **Session State Persistence**: Active workouts survive page refresh via `workoutStatePersistence.ts`
7. **Version-Based CRDTs**: Simple conflict detection via `version` field timestamps

### Authentication Flow

```
Auth0Provider → App.tsx checks isAuthenticated → useAuth0() hook → userStore.initializeUser() → syncWithAuth0() bidirectional sync
```

- Auth0 handles authentication
- User profiles stored in IndexedDB + synced to Auth0 metadata
- Auth state changes trigger `UserContextManager` listeners

### Initialization Sequence

On app load (`App.tsx`):

1. Check cache version (clear if stale)
2. Load settings (parallel)
3. Initialize exercise library (parallel)
4. Start dataSync (attach event listeners)
5. Preload muscle images (background)
6. Wait for Auth0 callback
7. Initialize user profile
8. Pull notifications from MongoDB
9. Start periodic notification pulls (1hr interval)
10. Initialize planned workouts
11. Start background AI refresher

### PWA Configuration

- Service worker: `src/sw.ts` (inject manifest strategy)
- Workbox caching: Google Fonts, AI responses (24hr), static assets
- Offline support: All core features work without network
- Install prompt: Custom implementation in `src/components/common/InstallPrompt.tsx`

## Important File Locations

- **Environment Config**: `.env` (not committed) - see README.md for required variables
- **Database Schema**: `src/services/database.ts` (Dexie schema versions)
- **Type Definitions**: `src/types/` (workout, exercise, muscle, insights)
- **Stores**: `src/store/` (Zustand state management)
- **Services**: `src/services/` (business logic layer)
- **Components**: `src/components/` (organized by feature)
- **Pages**: `src/pages/` (route-level components)
- **Utils**: `src/utils/` (helper functions, validation)
- **Data**: `src/data/strengthlogExercises.ts` (exercise seed data)

## TypeScript Configuration

- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Target: ES2020
- Bundler module resolution
- Excludes: `supabase/functions/**`

## Styling System

**Tailwind CSS** with custom theme (`tailwind.config.js`):

- Primary color: `#0df269` (bright green)
- Dark mode: class-based (`darkMode: 'class'`)
- Recovery colors: fresh (green) → recovering (yellow) → sore (orange) → overworked (red)
- Custom font: Lexend
- Border radius: rounded corners with consistent spacing
- Custom animations: bounce-slow, pulse-slow, celebration

Follow `.cursor/rules/designrule.mdc` for UI consistency.

## Development Guidelines

### Code Quality (from `.cursor/rules/appfunctionrule.mdc`)

1. **End-to-End Integration**: All features must work from UI → persistence → rehydration
2. **Error Handling**: Zero unhandled runtime errors - graceful degradation everywhere
3. **Offline-First**: Test all features in offline mode
4. **User-Scoped**: Always filter by `userId` in queries
5. **Event-Driven**: Use `dataService.emit()` after data changes
6. **Defensive Programming**: Null checks, schema validation, AI output sanitization

### Adding New Features

1. **Plan first**: Document data flow, ownership, failure modes
2. **Update schema**: Increment Dexie version if adding tables/fields
3. **Create service layer**: Business logic in `src/services/`
4. **Add Zustand store** (if needed): State management with event listeners
5. **Build UI components**: Mobile-first, responsive, accessible
6. **Handle all states**: Loading, empty, error, offline
7. **Test E2E**: Verify user journey works end-to-end
8. **Update docs**: README, TECHNICAL_DOCUMENTATION.md (if exists)

### Database Schema Changes

When modifying IndexedDB schema:

1. Increment version number in `database.ts`
2. Add upgrade function: `db.version(newVersion).stores({ ... }).upgrade(tx => { ... })`
3. Test migration path from previous version
4. Update TypeScript types in `src/types/`
5. Clear browser storage in dev: `localStorage.clear()` + IndexedDB deletion

### Working with AI Services

- AI responses are cached for 24 hours (fingerprint-based)
- New workouts trigger AI refresh
- Rate limiting: Check `aiCallManager.ts` before calling Gemini API
- Always validate AI output against schema contracts
- Never render raw AI responses - sanitize via `aiResponseCleaner.ts`

### Sync Service Development

- Sync is asynchronous and non-blocking
- Failed syncs queue in IndexedDB `pendingSyncQueue` table
- 5-second debounce before sync attempts
- Local changes win initially (local-first)
- Version conflicts resolved in `mongodbSyncService.ts`
- Test offline → online → sync flow

### Component Patterns

- Use functional components with TypeScript
- Mobile-first responsive design
- Minimum touch target: 44x44px
- Loading states: Skeleton components in `src/components/common/`
- Error boundaries: Wrap routes with `ErrorBoundary.tsx`
- Animations: Framer Motion for transitions
- Icons: Lucide React

## Common Pitfalls

1. **Forgetting userId filter**: Always scope queries to current user via `UserContextManager.getCurrentUserId()`
2. **Not emitting events**: After data changes, call `dataService.emit(eventType)` to update UI
3. **Blocking on sync**: Never await MongoDB sync in UI - it's async by design
4. **Breaking offline mode**: Test features without network connection
5. **Cache invalidation**: Clear AI cache when data model changes significantly
6. **Profile picture storage**: Use `dataService.saveProfilePicture()`, not direct LocalStorage
7. **Version conflicts**: Increment `version` timestamp when updating records

## Environment Variables

Required (see README.md for details):

- `VITE_AUTH0_DOMAIN` - Auth0 tenant domain
- `VITE_AUTH0_CLIENT_ID` - Auth0 client ID
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional:

- `VITE_GEMINI_API_KEY` - Google Gemini AI API key (AI insights disabled without it)

**Note**: Vite requires `VITE_` prefix for client-side access. `REACT_APP_` variables are mapped for backward compatibility in `vite.config.ts`.

## Performance Considerations

- Code splitting: Lazy load routes with `React.lazy()`
- Chunk optimization: `manualChunks` in `vite.config.ts` separates React, Three.js, Recharts vendors
- Image optimization: `imageProcessor.ts` handles HEIC conversion and compression
- Muscle images: Preloaded and cached in IndexedDB (`muscleImageCache.ts`)
- AI response caching: 24-hour cache reduces API costs
- IndexedDB indexes: Composite indexes for efficient user-scoped queries
- Service worker caching: Static assets, fonts, AI responses

## Testing Guidelines

- Test offline scenarios (service worker must work)
- Test cross-device sync (multiple browser tabs)
- Test version conflicts (concurrent updates to same record)
- Test AI fallbacks (when API fails or key missing)
- Test workout state recovery (page refresh during workout)
- Test muscle recovery calculations (validate scoring formulas)
- Verify user isolation (switch users, check no data leaks)

## Debugging Tips

- IndexedDB inspector: Chrome DevTools → Application → IndexedDB → FitTrackAIDB
- Network tab: Check MongoDB sync requests (should be async, not blocking UI)
- Console filters: `dataService`, `sync`, `ai`, `workout` for targeted logging
- Service worker: Application → Service Workers → check for errors
- Error logs: Stored in `errorLogs` IndexedDB table
- Clear everything: `localStorage.clear()` + delete FitTrackAIDB + unregister service worker
