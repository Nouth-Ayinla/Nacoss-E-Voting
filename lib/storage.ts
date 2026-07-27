import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.STORAGE_ENDPOINT, // e.g. https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
});

const BUCKET = process.env.STORAGE_BUCKET_NAME!;

/**
 * Uploads a voter's ID card to private object storage and returns the
 * storage key (not a public URL — ID cards are never publicly accessible).
 * Admins view them via a short-lived signed URL, see getSignedIdCardUrl below.
 */
export async function uploadIdCard(file: File, matricNumber: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] || "jpg";
  // Random suffix prevents key collisions/guessing even if matric number leaks
  const key = `id-cards/${matricNumber}-${crypto.randomBytes(8).toString("hex")}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Private by default — no ACL grants public read
    })
  );

  return key;
}

/**
 * Generates a short-lived signed URL so an admin can view an ID card
 * without the file ever being publicly reachable.
 */
export async function getSignedIdCardUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Uploads a candidate's photo to the bucket under 'candidate-photos/'.
 * Returns the storage key.
 */
export async function uploadCandidatePhoto(base64Data: string, candidateId: string): Promise<string> {
  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 image data");
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const extension = contentType.split("/")[1] || "png";
  const key = `candidate-photos/${candidateId}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

/**
 * Streams a file from R2 bucket.
 */
export async function getCandidatePhotoStream(key: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);
  return {
    body: response.Body,
    contentType: response.ContentType,
  };
}
