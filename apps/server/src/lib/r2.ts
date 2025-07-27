import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  file: File | ArrayBuffer | Uint8Array,
  contentType: string
) {
  let body: Uint8Array;
  
  if (file instanceof File) {
    body = new Uint8Array(await file.arrayBuffer());
  } else if (file instanceof ArrayBuffer) {
    body = new Uint8Array(file);
  } else {
    body = file; // Already Uint8Array
  }
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
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

export async function getImageUrl(r2: S3Client, bucketName: string, key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  
  // Generate a signed URL with configurable expiration
  const signedUrl = await getSignedUrl(r2, command, { expiresIn });
  return signedUrl;
}

// New function to generate a fresh signed URL for an image key
export async function generateFreshImageUrl(r2: S3Client, bucketName: string, key: string, expiresIn: number = 3600): Promise<string> {
  return getImageUrl(r2, bucketName, key, expiresIn);
}