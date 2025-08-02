// Global type definitions for the entire API

export interface Env {
  ADMIN_CHAT: DurableObjectNamespace;
  PUBLIC_CHAT: DurableObjectNamespace;
  TODO_IMAGES: R2Bucket;
  CORS_ORIGIN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DATABASE_URL: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  NODE_ENV: string;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  userProfilePicture?: string;
}

// WebSocket with user authentication
export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userProfilePicture?: string;
}

// User info for WebSocket connections
export interface UserInfo {
  userId: string;
  userName: string;
  userEmail: string | null;
  userProfilePicture?: string;
  isGuest?: boolean;
}

// Broadcast message request
export interface BroadcastMessageRequest {
  message: string;
}

// Broadcast message response
export interface BroadcastMessageResponse {
  success: boolean;
  message: string;
}

// Error response
export interface ErrorResponse {
  error: string;
} 