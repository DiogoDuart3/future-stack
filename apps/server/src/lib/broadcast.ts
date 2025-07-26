import type { Env } from "../types/global";

/**
 * Broadcast a message to all connected admin chat WebSocket clients
 * @param env - The environment containing the ADMIN_CHAT binding
 * @param message - The message to broadcast
 * @returns Promise that resolves when the message is sent
 */
export async function broadcastToAdminChat(env: Env, message: string): Promise<void> {
  try {
    // Get the durable object instance
    const id = env.ADMIN_CHAT.idFromName("admin-chat-room");
    const durableObject = env.ADMIN_CHAT.get(id);

    // Create a request to the durable object's /send endpoint
    const broadcastRequest = new Request(`${env.BETTER_AUTH_URL}/api/admin-chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message.trim() }),
    });

    // Send the request to the durable object
    const response = await durableObject.fetch(broadcastRequest);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to broadcast message: ${errorText}`);
    }
  } catch (error) {
    console.error("Error broadcasting to admin chat:", error);
    throw error;
  }
}

/**
 * Broadcast a system notification to admin chat
 * @param env - The environment containing the ADMIN_CHAT binding
 * @param notification - The notification message
 * @returns Promise that resolves when the notification is sent
 */
export async function broadcastSystemNotification(env: Env, notification: string): Promise<void> {
  const systemMessage = `🔔 System Notification: ${notification}`;
  await broadcastToAdminChat(env, systemMessage);
}

/**
 * Broadcast an error notification to admin chat
 * @param env - The environment containing the ADMIN_CHAT binding
 * @param error - The error message
 * @returns Promise that resolves when the error notification is sent
 */
export async function broadcastErrorNotification(env: Env, error: string): Promise<void> {
  const errorMessage = `❌ Error: ${error}`;
  await broadcastToAdminChat(env, errorMessage);
}

/**
 * Broadcast a success notification to admin chat
 * @param env - The environment containing the ADMIN_CHAT binding
 * @param message - The success message
 * @returns Promise that resolves when the success notification is sent
 */
export async function broadcastSuccessNotification(env: Env, message: string): Promise<void> {
  const successMessage = `✅ Success: ${message}`;
  await broadcastToAdminChat(env, successMessage);
} 