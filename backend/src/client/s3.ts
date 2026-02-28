// src/vendors/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const { AWS_REGION, S3_BUCKET } = process.env;

if (!AWS_REGION) {
  throw new Error(" Missing env AWS_REGION");
}
if (!S3_BUCKET) {
  throw new Error(" Missing env S3_BUCKET");
}

export const s3 = new S3Client({
  region: AWS_REGION,
  requestHandler: new NodeHttpHandler({
    requestTimeout: 15_000,
    connectionTimeout: 5_000,
  }),
  maxAttempts: 2,
});

/**
 * Upload a file buffer to S3
 */
 export async function uploadImageToS3({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new Error(" body must be a non-empty Buffer");
  }

  const out = await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return {
    bucket: S3_BUCKET!,
    key,
    s3Uri: `s3://${S3_BUCKET}/${key}`,
    status: out.$metadata.httpStatusCode ?? 0,
    requestId: out.$metadata.requestId,
  };
}
/**
 * Generate a signed GET URL for a given key
 */
export async function getSignedUrlForKey(
  key: string,
  expiresInSec = 3600
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

/**
 * Build a unique S3 key for an image
 */
export function buildImageKey(
  fileId: string,
  originalName = "image.jpg",
  folder = "items"
) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const safe = originalName.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  return `${folder}/${fileId}/${y}/${m}/${day}/${Date.now()}_${safe}`;
}