// src/db/mongo.ts
/**
 * MongoDB Connection (Mongoose)
 * -----------------------------
 * - Connects once and reuses the same connection.
 * - Logs connection success/failure.
 * - Uses .env MONGODB_URI (default: mongodb://127.0.0.1:27017/lostfound)
 */

import mongoose from "mongoose";

let isConnected = false;

/** Connect to MongoDB only once per process */
export async function connectMongo(
  uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lostfound"
) {
  if (isConnected) return mongoose.connection;

  try {
    await mongoose.connect(uri, {
      autoIndex: true,              // builds indexes defined in schemas
      maxPoolSize: 10,              // limit concurrent connections
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log("MongoDB connected at", uri);
    return mongoose.connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
  
}

/** Export mongoose itself for schema/model use */
export { mongoose };