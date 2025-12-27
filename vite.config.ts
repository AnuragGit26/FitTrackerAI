import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import eslint from 'vite-plugin-eslint'
import path from 'path'
import { versionPlugin } from './vite-plugin-version'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Load both VITE_ and REACT_APP_ prefixed variables for backward compatibility
  const env = loadEnv(mode, process.cwd(), '')
  
  // Map REACT_APP_ variables to VITE_ equivalents for backward compatibility
  // Vite only exposes VITE_ prefixed variables, so we map REACT_APP_ vars to VITE_ equivalents
  const defineVars: Record<string, string> = {}
  Object.keys(env).forEach((key) => {
    if (key.startsWith('REACT_APP_')) {
      // Map REACT_APP_SUPABASE_URL to VITE_SUPABASE_URL if not already set
      if (key === 'REACT_APP_SUPABASE_URL' && !env.VITE_SUPABASE_URL) {
        defineVars['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify(env[key])
      }
      // Map REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY to VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY if not already set
      if (key === 'REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY' && !env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
        defineVars['import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY'] = JSON.stringify(env[key])
      }
    }
  })

  return {
  define: {
    ...defineVars,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    versionPlugin(),
    eslint({
      failOnError: false, // Don't fail build on ESLint errors in dev
      failOnWarning: false, // Don't fail build on ESLint warnings in dev
      emitError: true, // Show errors in console
      emitWarning: true, // Show warnings in console
      cache: true, // Enable caching for better performance
    }),
    VitePWA({
      registerType: 'prompt', // Changed to 'prompt' since we're handling registration manually
      devOptions: {
        enabled: true, // Enable service worker in development for end-to-end testing
        type: 'module',
        navigateFallback: 'index.html',
      },
      includeAssets: ['assests/img/Fittrack2.png'],
      manifest: {
        name: 'FitTrackAI - Gym Exercise Tracker',
        short_name: 'FitTrackAI',
        description: 'Track workouts, visualize muscle recovery, and get AI insights',
        theme_color: '#3b82f6',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'assests/img/Fittrack2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assests/img/Fittrack2.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        shortcuts: [
          {
            name: 'Start Workout',
            short_name: 'Workout',
            description: 'Start a new workout',
            url: '/log-workout',
            icons: [{ src: 'icons/dumbbell.png', sizes: '192x192' }]
          },
          {
            name: 'View Progress',
            short_name: 'Progress',
            description: 'View your analytics',
            url: '/analytics',
            icons: [{ src: 'icons/chart.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache AI-related responses
            urlPattern: ({ url }) => url.pathname.includes('/api/ai') || url.searchParams.has('ai-cache'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ai-responses',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        // Enable background sync for AI requests
        skipWaiting: true,
        clientsClaim: true,
      },
      // Use inject manifest strategy for custom service worker
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'chart-vendor': ['recharts']
        }
      }
    }
  }
  }
})

