// src/services/lostItem/openai/client.ts
import OpenAI from "openai";
import { env } from "../api/env"; // <- use your central env

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const key = env.OPENAI_API_KEY;        // <- read from validated env
  if (!key) {
    // Don’t crash the process; let the handler return 503
    throw new Error("OPENAI_API_KEY missing");
  }
  if (_client) return _client;
  _client = new OpenAI({ apiKey: key });
  return _client;
}