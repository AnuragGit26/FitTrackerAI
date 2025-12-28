# FitTrackAI - Advanced Gym Exercise Tracker

A comprehensive mobile-first Progressive Web App (PWA) for gym exercise tracking with muscle anatomy visualization, intelligent rest tracking, and AI-powered insights.

## Features

- **Workout Logging**: Track exercises, sets, reps, and weights with an intuitive interface
- **Muscle Recovery Tracking**: Track muscle recovery status and readiness
- **Analytics Dashboard**: View progress charts, volume trends, and workout frequency heatmaps
- **AI-Powered Insights**: Get personalized workout recommendations using Gemini AI
- **Offline-First**: All data stored locally with IndexedDB for offline functionality
- **PWA Support**: Install as a native app on mobile devices

## Tech Stack

- **Frontend**: React 18+ with TypeScript, Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **3D Visualization**: Three.js with React Three Fiber
- **Charts**: Recharts
- **Database**: IndexedDB (Dexie.js)
- **AI**: Gemini AI API
- **PWA**: Workbox service workers

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FitTrackAI
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Auth0 Authentication (Required)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_auth0_client_id_here

# Supabase Configuration (Required)
# Use VITE_ prefix (recommended) or REACT_APP_ prefix (for backward compatibility)
VITE_SUPABASE_URL=https://your-project.supabase.co
# OR: REACT_APP_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (choose one):
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
# OR: VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key_here
# OR: REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key_here

# Google Gemini AI API Key (Optional - for AI insights)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Getting your API keys:**
- **Auth0**: Get your domain and client ID from [Auth0 Dashboard](https://manage.auth0.com/)
- **Supabase**: Get your URL and anon key from [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)
- **Gemini AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey) (optional)

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/       # React components
│   ├── layout/      # Layout components (Header, Navigation)
│   ├── exercise/    # Exercise-related components
│   ├── analytics/   # Analytics charts and visualizations
│   ├── insights/    # AI insights components
│   └── common/      # Shared components (Button, Modal, etc.)
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── services/        # Business logic and API services
├── store/           # Zustand state management
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Configuration

### Required Environment Variables

The following environment variables are required for the app to function:

1. **VITE_AUTH0_DOMAIN** (Required)
   - Auth0 tenant domain for user authentication
   - Get it from: [Auth0 Dashboard](https://manage.auth0.com/)
   - Format: `your-tenant.auth0.com`
   - The app will fail to start without this variable

2. **VITE_AUTH0_CLIENT_ID** (Required)
   - Auth0 application client ID for user authentication
   - Get it from: [Auth0 Dashboard](https://manage.auth0.com/)
   - The app will fail to start without this key

3. **VITE_SUPABASE_URL** (Required)
   - Supabase project URL for data synchronization
   - Get it from: [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)
   - The app will fail to start without this variable

4. **VITE_SUPABASE_ANON_KEY** (Required)
   - Supabase anonymous/public key for API access
   - Alternative name: `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (for backward compatibility)
   - Get it from: [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)
   - The app will fail to start without this key

### Optional Environment Variables

5. **VITE_GEMINI_API_KEY** (Optional)
   - Used for AI-powered workout insights and recommendations
   - Get it from: [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Without this key, the app will still work but AI insights will show placeholder messages

## Usage

### Logging a Workout

1. Navigate to the "Workout" tab
2. Click "Start Workout"
3. Add exercises by searching and selecting from the library
4. Log sets with reps and weight
5. Complete sets and finish the workout

### Analytics

1. Navigate to the "Analytics" tab
2. View volume progression charts
3. Check workout frequency heatmap
4. Track personal records and progress

### AI Insights

1. Navigate to the "Insights" tab
2. View daily AI-generated insights
3. Get workout recommendations
4. Receive tips for optimizing training

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (recommended)

### Testing

```bash
npm run test
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

