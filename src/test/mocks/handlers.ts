import { http, HttpResponse } from 'msw';

// Mock service worker handlers for API mocking
export const handlers = [
    // Mock AI API calls
    http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    analysis: 'Mock analysis',
                                    recommendations: ['Recommendation 1', 'Recommendation 2'],
                                }),
                            },
                        ],
                    },
                },
            ],
        });
    }),

    // Add more mock handlers as needed
];

