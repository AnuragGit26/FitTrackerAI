import { describe, it, expect } from 'vitest';
import { AppError, getUserFriendlyErrorMessage, withErrorHandling } from '../errorHandler';

describe('errorHandler', () => {
    describe('AppError', () => {
        it('creates an error with all properties', () => {
            const originalError = new Error('Original error');
            const appError = new AppError(
                'User-friendly message',
                'TEST_CODE',
                500,
                originalError,
                { userId: '123' }
            );

            expect(appError.message).toBe('User-friendly message');
            expect(appError.code).toBe('TEST_CODE');
            expect(appError.statusCode).toBe(500);
            expect(appError.originalError).toBe(originalError);
            expect(appError.context).toEqual({ userId: '123' });
        });
    });

    describe('getUserFriendlyErrorMessage', () => {
        it('returns message from AppError', () => {
            const error = new AppError('User-friendly message');
            expect(getUserFriendlyErrorMessage(error)).toBe('User-friendly message');
        });

        it('handles network errors', () => {
            const error = new Error('NetworkError: Failed to fetch');
            expect(getUserFriendlyErrorMessage(error)).toContain('Network error');
        });

        it('handles timeout errors', () => {
            const error = new Error('Request timeout');
            expect(getUserFriendlyErrorMessage(error)).toContain('timed out');
        });

        it('returns default message for unknown errors', () => {
            expect(getUserFriendlyErrorMessage('unknown')).toContain('unexpected error');
        });
    });

    describe('withErrorHandling', () => {
        it('returns result when function succeeds', async () => {
            const result = await withErrorHandling(async () => 'success');
            expect(result).toBe('success');
        });

        it('retries on failure', async () => {
            let attempts = 0;
            const result = await withErrorHandling(
                async () => {
                    attempts++;
                    if (attempts < 2) {
                        throw new Error('Fail');
                    }
                    return 'success';
                },
                { retries: 2, retryDelay: 10 }
            );

            expect(result).toBe('success');
            expect(attempts).toBe(2);
        });

        it('throws AppError after all retries fail', async () => {
            await expect(
                withErrorHandling(
                    async () => {
                        throw new Error('Always fails');
                    },
                    { retries: 1, retryDelay: 10, errorMessage: 'Custom error' }
                )
            ).rejects.toThrow('Custom error');
        });
    });
});

