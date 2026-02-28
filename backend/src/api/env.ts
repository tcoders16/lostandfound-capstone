import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

// Load environment variables from .env file into process.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log("Environment variables loaded.", `NODE_ENV=${process.env.NODE_ENV}`);
console.log("Environment variables loaded.", `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`);
console.log("Environment variables loaded.", `PINECONE_API_KEY=${process.env.PINECONE_API_KEY}`);
console.log("Environment variables loaded.", `MONGODB_URI=${process.env.MONGODB_URI}`)

// Define schema for all environment variables
const schema = z.object({
  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Firebase (optional for local dev)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
 
  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Pinecone (optional for local dev)
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().optional(),

  // Google Cloud Storage
  GCS_BUCKET: z.string().optional(),

  //MongoDB URI
  MONGODB_URI: z.string().optional(),
});

// Parse and validate environment variables
const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.warn("Invalid or missing environment variables:", parsed.error.format());
}

// Export a guaranteed, typed object (with defaults applied)
export const env = parsed.success ? parsed.data : (process.env as any);
export type Env = typeof env;

// Feature flags to check if integrations are usable

// export const hasFirebase =



//   !!env.FIREBASE_PROJECT_ID && !!env.FIREBASE_CLIENT_EMAIL && !!env.FIREBASE_PRIVATE_KEY && !!env.GCS_BUCKET;
export const hasPinecone = !!env.PINECONE_API_KEY && !!env.PINECONE_INDEX;