// src/server.ts
/**
 * Lost & Found API
 * - Fastify + TypeScript
 * - Static serving for /uploads/*
 * - CORS, multipart, routes, health endpoints
 * - Mongo connection
 */

import path from "node:path";
import fs from "node:fs";
import Fastify, { FastifyInstance, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { config as loadEnv } from "dotenv";

loadEnv(); // load .env first

// ── Config ────────────────────────────────────────────────────────────────────
import { UPLOAD_DIR as CFG_UPLOAD_DIR } from "./config/storage";
const UPLOAD_DIR = "./upload";

// ── DB ────────────────────────────────────────────────────────────────────────
import { connectMongo } from "./db/mongo";

// ── Routes ────────────────────────────────────────────────────────────────────
import { itemsRoutes } from "./routes/lostItem/item";
import searchRoutes from "./routes/pinecone/searchRoutes";
import { claimsRoutes } from './routes/claims/claimsRoutes';
import { chatRoutes } from "./routes/chat/chatRoutes";

// If you created admin login earlier, keep this.
// Otherwise, comment out the next line.
// import { adminRoutes } from "./routes/admin/auth.routes";

// Legacy route (keep only if still needed)


// ── Logger setup (pretty in dev, lean in prod) ────────────────────────────────
const isProd = process.env.NODE_ENV === "production";
function getLoggerConfig() {
  if (isProd) return { level: "info" as const };
  try {
    require.resolve("pino-pretty");
    return {
      level: "debug" as const,
      transport: {
        target: "pino-pretty",
        options: { translateTime: "SYS:standard", colorize: true },
      },
    };
  } catch {
    return { level: "debug" as const };
  }
}

// Simple 501 helper for stubs
export function notImplemented(reply: FastifyReply, hint: string) {
  return reply.code(501).send({ error: "NOT_IMPLEMENTED", message: `TODO: ${hint}` });
}

// ── Factory: build the Fastify app ────────────────────────────────────────────
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: getLoggerConfig(),
    bodyLimit: 10 * 1024 * 1024, // 10MB JSON/body
    trustProxy: true,
  });


// Ensure the upload directory exists
const uploadRoot = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
  app.log.info({ uploadRoot }, "Created upload directory");
}
  // Connect Mongo (non-fatal if it fails; you'll see logs)
  try {
    await connectMongo();
    app.log.info("MongoDB connected");
  } catch (e) {
    app.log.error(e, "MongoDB connection failed");
  }

  // CORS: allow browser requests
  await app.register(cors, {
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Multipart: accept file uploads (must be before routes using it)
  await app.register(multipart, {
    limits: { files: 1, fileSize: 20 * 1024 * 1024 }, // 20MB/file
  });

  // Serve static files from the upload folder at /uploads/*
await app.register(fastifyStatic, {
  root: uploadRoot,
  prefix: "/upload/", // 👈 important: adds /upload/ prefix to the file path
  decorateReply: false,
});
  // Health + root info
  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async () => ({ ready: true }));
  app.get("/", async () => ({
    ok: true,
    service: "lostfound-api",
    version: process.env.npm_package_version ?? "0.0.0",
    env: process.env.NODE_ENV ?? "development",
  }));

  // ── Feature routes ──────────────────────────────────────────────────────────
  app.register(itemsRoutes, { prefix: "/api/items" });
  app.register(searchRoutes, { prefix: "/api/search" });
  app.register(claimsRoutes, { prefix: "/api/claims" });
  app.register(chatRoutes, { prefix: "/api/chat" });

  // Admin login (uncomment if you created adminRoutes)
  // app.register(adminRoutes, { prefix: "/api/admin" });

  // Legacy Mongo save endpoint (keep only if you still call it)


  // 404
  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({ error: "NOT_FOUND", path: req.url })
  );

  // Error handler
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const status = (err as any).statusCode ?? 500;
    reply.code(status).send({
      error: status === 500 ? "INTERNAL" : "BAD_REQUEST",
      message: isProd ? "Something went wrong" : (err as Error).message,
    });
  });

  return app;
}

// ── Boot when run directly: node dist/server.js ───────────────────────────────
if (require.main === module) {
  buildServer()
    .then((app) =>
      app
        .listen({ host: "0.0.0.0", port: Number(process.env.PORT || 4000) })
        .then(() => app.log.info(`API listening on :${process.env.PORT || 4000}`))
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });

  // Graceful shutdown
  const stop = async (signal: NodeJS.Signals) => {
    console.log(`\n${signal} received, shutting down...`);
    try {
      process.exit(0);
    } catch (e) {
      console.error("Shutdown error", e);
      process.exit(1);
    }
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
