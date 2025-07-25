import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export function createR2Client(env: CloudflareBindings) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function uploadImage(
  r2: S3Client,
  bucketName: string,
  key: string,
  file: File | ArrayBuffer,
  contentType: string
) {
  const body = file instanceof File ? await file.arrayBuffer() : file;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: new Uint8Array(body),
    ContentType: contentType,
  });

  await r2.send(command);
  return key;
}

export function generateImageKey(todoId: number, filename: string): string {
  const timestamp = Date.now();
  const extension = filename.split('.').pop();
  return `todos/${todoId}/${timestamp}.${extension}`;
}

export function getImageUrl(accountId: string, bucketName: string, key: string): string {
  return `https://pub-${accountId}.r2.dev/${key}`;
}