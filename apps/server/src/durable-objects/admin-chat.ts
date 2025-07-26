import { db } from "@/db";
import { adminChatMessages } from "@/db/schema/admin_chat_messages";
import { eq, desc } from "drizzle-orm";
import type { Env, ChatMessage, AuthenticatedWebSocket, UserInfo } from "../types/global";

export interface DurableObjectEnv {
  ADMIN_CHAT: DurableObjectNamespace;
}

export class AdminChat {
  private state: DurableObjectState;
  private sessions: Set<AuthenticatedWebSocket>;
  private messages: ChatMessage[];
  private initialized: boolean = false;

  constructor(state: DurableObjectState, env: DurableObjectEnv) {
    this.state = state;
    this.sessions = new Set();
    this.messages = [];
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // Load the last 100 messages from the database, ordered by creation time
      const dbMessages = await db
        .select({
          id: adminChatMessages.id,
          message: adminChatMessages.message,
          userId: adminChatMessages.userId,
          userName: adminChatMessages.userName,
          userEmail: adminChatMessages.userEmail,
          createdAt: adminChatMessages.createdAt,
        })
        .from(adminChatMessages)
        .orderBy(desc(adminChatMessages.createdAt))
        .limit(100);

      // Transform database records to ChatMessage format
      this.messages = dbMessages
        .reverse() // Reverse to get chronological order
        .map((msg) => ({
          id: msg.id.toString(),
          userId: msg.userId,
          userName: msg.userName,
          message: msg.message,
          timestamp: msg.createdAt.getTime(),
        }));

      this.initialized = true;
    } catch (error) {
      console.error("Error loading messages from database:", error);
      this.initialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Initialize messages from database on first request
    await this.initialize();

    const { pathname } = new URL(request.url);
    if (request.method === "POST" && pathname === "/api/admin-chat/send") {
      const { message } = (await request.json()) as { message: string };

      if (!message || message.trim().length === 0) {
        return new Response("Message is required", { status: 400 });
      }

      await this.broadcast({
        id: crypto.randomUUID(),
        userId: "system",
        userName: "System",
        message,
        timestamp: Date.now(),
      });
      return new Response(null, { status: 200 });
    }

    // Extract validated user info from headers (set by the main worker)
    const userId = request.headers.get("x-user-id");
    const userName = request.headers.get("x-user-name");
    const userEmail = request.headers.get("x-user-email");

    if (!userId || !userName) {
      return new Response("Unauthorized", { status: 401 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    await this.handleSession(server as AuthenticatedWebSocket, {
      userId,
      userName,
      userEmail,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(
    webSocket: AuthenticatedWebSocket,
    userInfo: UserInfo
  ) {
    webSocket.accept();

    // Store user info on the WebSocket
    webSocket.userId = userInfo.userId;
    webSocket.userName = userInfo.userName;
    webSocket.userEmail = userInfo.userEmail || "";

    this.sessions.add(webSocket);

    // Send recent messages to new connection
    const recentMessages = this.messages.slice(-50); // Last 50 messages
    webSocket.send(
      JSON.stringify({
        type: "history",
        messages: recentMessages,
      })
    );

    // Send join notification to other users
    const joinMessage = {
      type: "user_joined",
      userId: userInfo.userId,
      userName: userInfo.userName,
      timestamp: Date.now(),
    };

    this.sessions.forEach((session) => {
      if (session !== webSocket && session.readyState === WebSocket.OPEN) {
        try {
          session.send(JSON.stringify(joinMessage));
        } catch (err) {
          this.sessions.delete(session);
        }
      }
    });

    webSocket.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === "message") {
          // Use the server-validated user info, not client-provided data
          const message: ChatMessage = {
            id: crypto.randomUUID(),
            userId: webSocket.userId!,
            userName: webSocket.userName!,
            message: data.message,
            timestamp: Date.now(),
          };

          // Basic message validation
          if (!message.message || message.message.trim().length === 0) {
            return;
          }

          // Sanitize message (basic)
          message.message = message.message.trim().substring(0, 1000); // Max 1000 chars

          this.messages.push(message);

          // Keep only last 100 messages in memory
          if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
          }

          // Broadcast to all connected clients
          const messageData = JSON.stringify({
            type: "message",
            message,
          });

          this.sessions.forEach((session) => {
            if (session.readyState === WebSocket.OPEN) {
              try {
                session.send(messageData);
              } catch (err) {
                // Remove closed connections
                this.sessions.delete(session);
              }
            }
          });

          await db.insert(adminChatMessages).values({
            message: message.message,
            userId: message.userId,
            userName: message.userName,
            userEmail: webSocket.userEmail || "",
            createdAt: new Date(message.timestamp),
            updatedAt: new Date(message.timestamp),
          });
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });

    webSocket.addEventListener("close", () => {
      this.sessions.delete(webSocket);

      // Send leave notification to other users
      const leaveMessage = {
        type: "user_left",
        userId: userInfo.userId,
        userName: userInfo.userName,
        timestamp: Date.now(),
      };

      this.sessions.forEach((session) => {
        if (session.readyState === WebSocket.OPEN) {
          try {
            session.send(JSON.stringify(leaveMessage));
          } catch (err) {
            this.sessions.delete(session);
          }
        }
      });
    });

    webSocket.addEventListener("error", () => {
      this.sessions.delete(webSocket);
    });
  }

  async broadcast(message: ChatMessage) {
    const messageData = JSON.stringify({
      type: "message",
      message,
    });
    this.sessions.forEach((session) => {
      if (session.readyState === WebSocket.OPEN) {
        session.send(messageData);
      }
    });
  }
}