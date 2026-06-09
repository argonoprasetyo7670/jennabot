import { S3Client } from "@aws-sdk/client-s3"

const endpoint = process.env.MINIO_ENDPOINT || "https://cdn.jennabot.pro"
const accessKeyId = process.env.MINIO_ACCESS_KEY || ""
const secretAccessKey = process.env.MINIO_SECRET_KEY || ""

export const s3Client = new S3Client({
  region: "us-east-1", // MinIO default region
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Required for MinIO
})

export const BUCKET_NAME = process.env.MINIO_BUCKET || "jennabot-media"
