import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose.mongooseCache ?? { conn: null, promise: null };

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cache;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.local.example to .env.local and fill it in.'
    );
  }
  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    console.error('[mongodb] Invalid URI scheme. Starts with:', JSON.stringify(MONGODB_URI.slice(0, 40)));
    throw new Error(
      `Invalid MONGODB_URI scheme. Expected "mongodb://" or "mongodb+srv://", got: ${MONGODB_URI.slice(0, 40)}`
    );
  }
  try {
    if (cache.conn) return cache.conn;
    if (!cache.promise) {
      cache.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      });
    }
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (err) {
    const e = err as { name?: string; code?: string; message?: string; reason?: { message?: string; topologyDescription?: unknown } };
    console.error('[mongodb] connect failed', {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      reasonMessage: e?.reason?.message,
      topologyDescription: e?.reason?.topologyDescription,
    });
    cache.promise = null;
    throw err;
  }
}