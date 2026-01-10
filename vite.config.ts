import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import eslint from 'vite-plugin-eslint'
import path from 'path'
import { versionPlugin } from './vite-plugin-version'
import { excludePrismaPlugin } from './vite-plugin-exclude-prisma'

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
  plugins: [
    react(),
    versionPlugin(),
    excludePrismaPlugin(),
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
      includeAssets: ['assets/img/Icon2.png'],
      manifest: {
        name: 'Fit Track AI',
        short_name: 'Fit Track AI',
        description: 'Track workouts, visualize muscle recovery, and get AI insights',
        theme_color: '#0df269',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        // Icon purposes explained:
        // - 'any': Standard display icons (using Icon2.png - transparent RGBA)
        // - 'maskable': Adaptive icons for platform-specific masks (using Icon2.png - proper RGBA with safe zone)
        //   Content MUST fit within 80% safe zone (40% radius from center) to avoid white background
        //   overflow on iOS and Android when system applies shaped masks
        // Icon2.png is 1024x1024 RGBA with transparent background, designed to work for both purposes
        icons: [
          {
            src: 'assets/img/Icon2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'assets/img/Icon2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'assets/img/Icon2.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'assets/img/Icon2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'assets/img/Icon2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'assets/img/Icon2.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable'
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
    open: true,
    proxy: {
      '/api/prisma': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for security
    chunkSizeWarningLimit: 500, // Only warn for chunks > 500 KB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          // React Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'react-router';
          }
          // Auth0
          if (id.includes('node_modules/@auth0/')) {
            return 'auth-vendor';
          }
          // Lucide Icons (split to reduce Profile bundle size)
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons-vendor';
          }
          // Three.js and related
          if (id.includes('node_modules/three/') || id.includes('node_modules/@react-three/')) {
            return 'three-vendor';
          }
          // Charts library
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'chart-vendor';
          }
          // Google Generative AI
          if (id.includes('node_modules/@google/generative-ai/')) {
            return 'ai-vendor';
          }
          // Framer Motion
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion-vendor';
          }
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          // Dexie (IndexedDB wrapper)
          if (id.includes('node_modules/dexie/')) {
            return 'dexie-vendor';
          }
          // All other node_modules as common vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        }
      }
    },
    // Configure for Prisma Client browser compatibility
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Redirect runtime Prisma Client imports to stub (type imports still work)
      '@prisma/client$': path.resolve(__dirname, './src/stubs/prisma-client-stub.ts'),
    },
  },
  optimizeDeps: {
    // Exclude Prisma Client from optimization - it doesn't work in browsers
    exclude: ['@prisma/client', '@prisma/extension-accelerate']
  },
  ssr: {
    // Externalize Prisma Client - don't bundle it
    external: ['@prisma/client', '@prisma/extension-accelerate']
  }
  }
})

