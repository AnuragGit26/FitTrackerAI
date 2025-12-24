import { afterEach, vi } from 'vitest';
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
    constructor(_callback?: IntersectionObserverCallback, _options?: IntersectionObserverInit) { }
    disconnect() { }
    observe(_target: Element) { }
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
    unobserve(_target: Element) { }
    root: Element | null = null;
    rootMargin = '';
    thresholds: ReadonlyArray<number> = [];
} as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor(_callback?: ResizeObserverCallback) { }
    disconnect() { }
    observe(_target: Element, _options?: ResizeObserverOptions) { }
    unobserve(_target: Element) { }
} as typeof ResizeObserver;

