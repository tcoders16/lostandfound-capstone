// testPinecone.js
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,

});




//  Get your index name from .env
const indexName = process.env.PINECONE_INDEX_NAME!;

async function testPinecone() {
  // Get the specific index
  const index = pinecone.index(indexName);


  //  Insert a dummy vector
  await index.upsert([
    {
      id: "test-001",
      values: Array(3072).fill(0.02), // 3072-dim vector
      metadata: { caption: "Hello Pinecone!" },
    },
  ]);

  

  console.log("Successfully inserted a test vector into Pinecone!");
}

//  Run the test
testPinecone().catch(console.error);