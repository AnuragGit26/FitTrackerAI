import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// Mock Clerk for all tests
vi.mock('@clerk/clerk-react', () => {
    return {
        ClerkProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
        useAuth: () => ({
            isSignedIn: false,
            isLoaded: true,
            userId: null,
        }),
        useUser: () => ({
            user: null,
            isLoaded: true,
        }),
        useSignIn: () => ({
            signIn: null,
            setActive: null,
        }),
        useSignUp: () => ({
            signUp: null,
            setActive: null,
        }),
        AuthenticateWithRedirectCallback: () => null,
    };
});

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() {
        return [];
    }
    unobserve() { }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
} as any;

