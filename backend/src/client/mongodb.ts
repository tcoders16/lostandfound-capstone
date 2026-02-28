// src/client/mongodb.ts
import mongoose from "mongoose";

let ready: Promise<typeof mongoose> | null = null;


export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing");

  // helpful logs
  mongoose.connection.on("connected", () => console.log("[mongo] connected"));
  mongoose.connection.on("error", err => console.error("[mongo] error", err));
  mongoose.connection.on("disconnected", () => console.log("[mongo] disconnected"));

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || "lostfound",
  });
}