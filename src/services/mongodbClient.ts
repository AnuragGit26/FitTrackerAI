import mongoose from 'mongoose';
import { requireUserId } from '@/utils/userIdValidation';

// SECURITY WARNING: MongoDB connection strings contain credentials.
// In production, consider using a backend API proxy instead of connecting directly from the browser.
// If you must connect from the browser, ensure:
// 1. MongoDB Atlas IP whitelist is configured
// 2. Database user has minimal required permissions
// 3. Connection string uses a read-only or limited-access user
const mongodbUri = import.meta.env.VITE_MONGODB_URI || import.meta.env.MONGODB_URI;

if (!mongodbUri) {
    throw new Error(
        'VITE_MONGODB_URI (or MONGODB_URI) is required. Please add it to your .env file.\n' +
        'Note: Vite requires the VITE_ prefix for client-side environment variables.\n' +
        'Get your connection string from: https://www.mongodb.com/cloud/atlas'
    );
}

// Type assertion: we've already checked that mongodbUri is not null/undefined
const mongoUri: string = mongodbUri;

let isConnected = false;
let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Connect to MongoDB using Mongoose
 * Handles connection pooling and reconnection automatically
 */
export async function connectToMongoDB(): Promise<typeof mongoose> {
    if (isConnected && mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
    }).then((mongooseInstance) => {
        isConnected = true;
        connectionPromise = null;
        return mongooseInstance;
    }).catch((error) => {
        connectionPromise = null;
        isConnected = false;
        console.error('MongoDB connection error:', error);
        throw error;
    });

    // Set up connection event handlers
    mongoose.connection.on('connected', () => {
        isConnected = true;
        // eslint-disable-next-line no-console
        console.log('MongoDB connected');
    });

    mongoose.connection.on('error', (error) => {
        isConnected = false;
        // eslint-disable-next-line no-console
        console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        // eslint-disable-next-line no-console
        console.log('MongoDB disconnected');
    });

    return connectionPromise;
}

/**
 * Get MongoDB connection status
 */
export function getMongoDBConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
} {
    return {
        isConnected: isConnected && mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
    };
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromMongoDB(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        isConnected = false;
    }
}

/**
 * Ensure MongoDB connection is established
 * Validates userId before operations
 * 
 * @param userId - REQUIRED: The user ID to validate
 * @returns Mongoose instance
 * @throws {UserIdValidationError} If userId is missing or invalid
 */
export async function getMongoDBConnection(userId?: string): Promise<typeof mongoose> {
    if (userId) {
        requireUserId(userId, {
            functionName: 'getMongoDBConnection',
            additionalInfo: { operation: 'mongodb_connection' },
        });
    }

    return connectToMongoDB();
}

/**
 * Reset MongoDB connection (useful for testing)
 */
export function resetMongoDBConnection(): void {
    isConnected = false;
    connectionPromise = null;
}

