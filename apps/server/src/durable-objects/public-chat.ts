import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { publicChatMessages } from "@/db/schema/public_chat_messages";
import { eq, desc } from "drizzle-orm";
import type { Env, ChatMessage, AuthenticatedWebSocket, UserInfo } from "../types/global";
import { createR2Client, getImageUrl } from "../lib/r2";

export interface DurableObjectEnv extends CloudflareBindings {
  PUBLIC_CHAT: DurableObjectNamespace;
}

export class PublicChat {
  private state: DurableObjectState;
  private sessions: Set<AuthenticatedWebSocket>;
  private messages: ChatMessage[];
  private typingUsers: Set<string>;
  private initialized: boolean = false;
  private db: any;

  constructor(state: DurableObjectState, env: DurableObjectEnv) {
    this.state = state;
    this.sessions = new Set();
    this.messages = [];
    this.typingUsers = new Set();
  }

  private initializeDatabase(request: Request) {
    const databaseUrl = request.headers.get("x-database-url") || "";
    const nodeEnv = request.headers.get("x-node-env") || "";
    
    const isDevelopment = nodeEnv === 'development';
    
    if (isDevelopment) {
      // Use local PostgreSQL for development
      const sql = postgres(databaseUrl || "postgresql://postgres:password@localhost:5432/ecomantem");
      this.db = drizzlePostgres(sql);
    } else {
      // Use Neon for production
      const sql = neon(databaseUrl || "");
      this.db = drizzle(sql);
    }
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // Load the last 100 messages from the database, ordered by creation time
      const dbMessages = await this.db
        .select({
          id: publicChatMessages.id,
          message: publicChatMessages.message,
          userId: publicChatMessages.userId,
          userName: publicChatMessages.userName,
          userEmail: publicChatMessages.userEmail,
          userProfilePicture: publicChatMessages.userProfilePicture,
          createdAt: publicChatMessages.createdAt,
        })
        .from(publicChatMessages)
        .orderBy(desc(publicChatMessages.createdAt))
        .limit(100);

      // Transform database records to ChatMessage format and convert R2 keys to URLs
      this.messages = await Promise.all(
        dbMessages
          .reverse() // Reverse to get chronological order
          .map(async (msg: typeof publicChatMessages.$inferSelect) => {
            let userProfilePictureUrl: string | undefined;
            
            if (msg.userProfilePicture) {
              try {
                // Convert R2 key to signed URL
                const r2 = createR2Client({} as CloudflareBindings); // We'll need to pass env through headers
                userProfilePictureUrl = await getImageUrl(r2, "ecomantem-todo-images", msg.userProfilePicture);
              } catch (error) {
                console.error("Error generating profile picture URL:", error);
              }
            }

            return {
              id: msg.id.toString(),
              userId: msg.userId,
              userName: msg.userName,
              message: msg.message,
              timestamp: msg.createdAt.getTime(),
              userProfilePicture: userProfilePictureUrl,
            };
          })
      );

      this.initialized = true;
    } catch (error) {
      console.error("Error loading messages from database:", error);
      this.initialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Initialize database connection with request headers
    this.initializeDatabase(request);
    
    // Initialize messages from database on first request
    await this.initialize();

    const { pathname } = new URL(request.url);
    if (request.method === "POST" && pathname === "/public-chat/send") {
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
    const userProfilePicture = request.headers.get("x-user-profile-picture");
    const isGuest = request.headers.get("x-is-guest") === "true";

    if (!userId || !userName) {
      return new Response("Unauthorized", { status: 401 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    await this.handleSession(server as AuthenticatedWebSocket, {
      userId,
      userName,
      userEmail,
      userProfilePicture: userProfilePicture || undefined,
      isGuest,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(
    webSocket: AuthenticatedWebSocket,
    userInfo: UserInfo & { userProfilePicture?: string; isGuest?: boolean }
  ) {
    webSocket.accept();

    // Store user info on the WebSocket
    webSocket.userId = userInfo.userId;
    webSocket.userName = userInfo.userName;
    webSocket.userEmail = userInfo.userEmail || "";
    webSocket.userProfilePicture = userInfo.userProfilePicture || "";
    (webSocket as any).isGuest = userInfo.isGuest || false;

    this.sessions.add(webSocket);

    // Send recent messages to new connection
    const recentMessages = this.messages.slice(-50); // Last 50 messages
    webSocket.send(
      JSON.stringify({
        type: "history",
        messages: recentMessages,
      })
    );

    // Send current online users to new connection
    const onlineUsers = Array.from(this.sessions)
      .filter(session => session.readyState === WebSocket.OPEN)
      .map(session => session.userName)
      .filter(Boolean);
    
    webSocket.send(
      JSON.stringify({
        type: "online_users",
        users: onlineUsers,
      })
    );

    // Send current typing users to new connection
    const typingUsers = Array.from(this.typingUsers);
    const typingUserNames = Array.from(this.sessions)
      .filter(session => typingUsers.includes(session.userId!))
      .map(session => session.userName!)
      .filter(Boolean);
    
    webSocket.send(
      JSON.stringify({
        type: "typing_users",
        users: typingUserNames,
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
          // Check if user is a guest - guests cannot send messages
          if ((webSocket as any).isGuest) {
            console.log("Guest user attempted to send message, ignoring");
            return;
          }

          // Remove user from typing indicator when they send a message
          this.typingUsers.delete(webSocket.userId!);
          this.broadcastTypingUsers();

          // Convert R2 key to URL if profile picture exists
          let userProfilePictureUrl: string | undefined;
          if (webSocket.userProfilePicture) {
            try {
              const r2 = createR2Client({} as CloudflareBindings); // We'll need to pass env through headers
              userProfilePictureUrl = await getImageUrl(r2, "ecomantem-todo-images", webSocket.userProfilePicture);
            } catch (error) {
              console.error("Error generating profile picture URL:", error);
            }
          }

          // Use the server-validated user info, not client-provided data
          const message: ChatMessage & { userProfilePicture?: string } = {
            id: crypto.randomUUID(),
            userId: webSocket.userId!,
            userName: webSocket.userName!,
            message: data.message,
            timestamp: Date.now(),
            userProfilePicture: userProfilePictureUrl,
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

          await this.db.insert(publicChatMessages).values({
            message: message.message,
            userId: message.userId,
            userName: message.userName,
            userEmail: webSocket.userEmail || "",
            userProfilePicture: webSocket.userProfilePicture, // Store the R2 key, not the URL
            createdAt: new Date(message.timestamp),
            updatedAt: new Date(message.timestamp),
          });
        } else if (data.type === "typing_start") {
          // Guests cannot send typing indicators
          if ((webSocket as any).isGuest) {
            return;
          }
          // Add user to typing indicator
          this.typingUsers.add(webSocket.userId!);
          this.broadcastTypingUsers();
        } else if (data.type === "typing_stop") {
          // Guests cannot send typing indicators
          if ((webSocket as any).isGuest) {
            return;
          }
          // Remove user from typing indicator
          this.typingUsers.delete(webSocket.userId!);
          this.broadcastTypingUsers();
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });

    webSocket.addEventListener("close", () => {
      // Remove user from typing indicator when they disconnect
      this.typingUsers.delete(webSocket.userId!);
      this.broadcastTypingUsers();
      
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
      // Remove user from typing indicator when there's an error
      this.typingUsers.delete(webSocket.userId!);
      this.broadcastTypingUsers();
      
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

  private broadcastTypingUsers() {
    const typingUsers = Array.from(this.typingUsers);
    const typingUserNames = Array.from(this.sessions)
      .filter(session => typingUsers.includes(session.userId!))
      .map(session => session.userName!)
      .filter(Boolean);
    
    const typingData = JSON.stringify({
      type: "typing_users",
      users: typingUserNames,
    });

    this.sessions.forEach((session) => {
      if (session.readyState === WebSocket.OPEN) {
        try {
          session.send(typingData);
        } catch (err) {
          this.sessions.delete(session);
        }
      }
    });
  }
} 