// src/routes/chat/chatRoutes.ts
import type { FastifyInstance } from "fastify";
import { getSession, getNextQuestion, submitAnswer, cancelSession, listManualQueue, manuallyLinkClaim } from "../../controllers/chat/chatController";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/sessions/:sessionId",           getSession);
  app.post("/sessions/:sessionId/next",     getNextQuestion);
  app.post("/sessions/:sessionId/answer",   submitAnswer);
   app.post("/sessions/:sessionId/cancel",   cancelSession);
  app.get("/manual",                        listManualQueue);
  app.post("/manual/link",                  manuallyLinkClaim);
}
