// src/services/pinecone/embeddingService.ts
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_openaiClient) return _openaiClient;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }
  
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}

export const EmbeddingService = {
  /**
   * Generates a dense vector embedding for text using OpenAI.
   * @param text - The text content to embed
   * @returns Array<number> (embedding vector)
   */
  async embedText(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text input required for embedding");
    }

    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });

    const embedding = response.data[0].embedding;
    console.log("🧠 [EmbeddingService] Generated embedding (dims:", embedding.length, ")");
    return embedding;
  },
};