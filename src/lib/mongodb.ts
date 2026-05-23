import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

const MONGODB_URI = "mongodb+srv://rbaskeyofficial:rbaskeyofficial@cluster0.lnstw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGODB_DB_NAME = "movie1";

interface MongoDBCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

// Extend the NodeJS.Global interface to include the MongoDB cache
declare global {
  // eslint-disable-next-line no-var
  var mongodb: MongoDBCache;
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global.mongodb) {
    global.mongodb = { client: null, promise: null };
  }
}

export async function connectToDatabase(): Promise<{ client: MongoClient, db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const options: MongoClientOptions = {};

  let client: MongoClient;
  let promise: Promise<MongoClient>;

  if (process.env.NODE_ENV === 'development') {
    if (!global.mongodb.promise) {
      global.mongodb.client = new MongoClient(MONGODB_URI, options);
      global.mongodb.promise = global.mongodb.client.connect();
    }
    client = global.mongodb.client!;
    promise = global.mongodb.promise!;
  } else {
    client = new MongoClient(MONGODB_URI, options);
    promise = client.connect();
  }

  try {
    await promise;
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    throw new Error("Failed to connect to MongoDB");
  }
  
  const db: Db = client.db(MONGODB_DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
