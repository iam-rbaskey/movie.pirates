import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

const MONGODB_URI = "mongodb+srv://rbaskeyofficial:rbaskeyofficial@cluster0.lnstw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGODB_DB_NAME = "movie1";

// Module-level cache — persists across requests within the same serverless container instance.
// This is the correct pattern for both development (avoids HMR re-connections)
// and production (avoids creating a new MongoClient on every invocation).
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectionPromise: Promise<MongoClient> | null = null;

// MongoDB connection options tuned for serverless environments.
// connectTimeoutMS / serverSelectionTimeoutMS: how long to wait for a connection.
// socketTimeoutMS: max time for an individual DB operation.
// Netlify free tier functions have a 10s limit; paid/background has 26s+.
const MONGO_OPTIONS: MongoClientOptions = {
  connectTimeoutMS: 8000,
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,       // keep a connection pool
  minPoolSize: 0,
};

export async function connectToDatabase(): Promise<{ client: MongoClient, db: Db }> {
  // Fast path: return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If a connection is already in progress, wait for it (prevents duplicate connections)
  if (!connectionPromise) {
    const client = new MongoClient(MONGODB_URI, MONGO_OPTIONS);
    connectionPromise = client.connect().then(() => {
      cachedClient = client;
      cachedDb = client.db(MONGODB_DB_NAME);
      return client;
    }).catch((err) => {
      // Reset promise so next call retries
      connectionPromise = null;
      cachedClient = null;
      cachedDb = null;
      throw err;
    });
  }

  try {
    await connectionPromise;
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
    throw new Error("Failed to connect to MongoDB. Please check the connection string and network access.");
  }

  return { client: cachedClient!, db: cachedDb! };
}
