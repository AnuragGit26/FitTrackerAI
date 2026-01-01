/**
 * Setup Prisma environment variables
 * This must run BEFORE importing PrismaClient
 */
import 'dotenv/config';

const accelerateUrl = process.env.VITE_ORM_PRISMA_DATABASE_URL || process.env.ORM_PRISMA_DATABASE_URL;
const mongoDbUri = process.env.VITE_MONGODB_URI || process.env.MONGODB_URI;

function cleanMongoDbUri(uri: string): string {
    let cleaned = uri.trim();
    while (cleaned.includes('MONGODB_URI=')) {
        cleaned = cleaned.replace(/^MONGODB_URI\s*=\s*/i, '');
    }
    cleaned = cleaned.replace(/^["'](.+)["']$/, '$1');
    cleaned = cleaned.replace(/^["']+|["']+$/g, '');
    return cleaned.trim();
}

let databaseUrl: string;
if (accelerateUrl && accelerateUrl.includes('prisma+mongodb://')) {
    databaseUrl = accelerateUrl;
} else if (accelerateUrl && accelerateUrl.includes('prisma+postgres://')) {
    if (mongoDbUri) {
        databaseUrl = cleanMongoDbUri(mongoDbUri);
    } else {
        throw new Error('Need MongoDB connection string. Set MONGODB_URI in .env');
    }
} else if (mongoDbUri) {
    databaseUrl = cleanMongoDbUri(mongoDbUri);
} else {
    throw new Error('No valid database connection URL found. Set either ORM_PRISMA_DATABASE_URL or MONGODB_URI in .env');
}

// Ensure MongoDB connection string has a database name
if (databaseUrl.startsWith('mongodb')) {
    const urlParts = databaseUrl.split('?');
    const baseUrl = urlParts[0];
    const queryString = urlParts[1] || '';
    
    if (!baseUrl.includes('/') || baseUrl.endsWith('/') || baseUrl.split('/').length < 4) {
        const dbName = 'fittrackai';
        if (baseUrl.endsWith('/')) {
            databaseUrl = `${baseUrl}${dbName}${queryString ? '?' + queryString : ''}`;
        } else {
            databaseUrl = `${baseUrl}/${dbName}${queryString ? '?' + queryString : ''}`;
        }
    }
}

// Set DATABASE_URL - this MUST be set before PrismaClient is imported
process.env.DATABASE_URL = databaseUrl;

console.log(`[Prisma Setup] DATABASE_URL set: ${databaseUrl.substring(0, 50)}...`);
console.log(`[Prisma Setup] DATABASE_URL length: ${databaseUrl.length}`);
console.log(`[Prisma Setup] DATABASE_URL starts with mongodb: ${databaseUrl.startsWith('mongodb')}`);

export { databaseUrl };

