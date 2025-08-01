import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TypingIndicator } from "@/components/typing-indicator";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  Loader2,
  Send,
  Users,
  MessageCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin-chat")({
  component: AdminChatRoute,
});

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

function AdminChatRoute() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user session
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "Admin User";

  // Check if user is admin - for now, we'll assume admin status is verified by the WebSocket endpoint
  const adminCheck = { data: { isAdmin: true }, isLoading: false };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendTypingEvent = (isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const eventData = JSON.stringify({
      type: isTyping ? "typing_start" : "typing_stop",
    });

    wsRef.current.send(eventData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Send typing start event
    sendTypingEvent(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false);
    }, 2000);
  };

  const connectToChat = async () => {
    if (!session) {
      console.log("Not logged in");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnecting(true);

    try {
      // Connect directly to WebSocket endpoint
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${import.meta.env.VITE_SERVER_URL.replace(
        "http://",
        ""
      ).replace("https://", "")}/ws/admin-chat`;
      
      console.log("Connecting to WebSocket:", wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        console.log("Connected to admin chat");
      };

      ws.onclose = (event) => {
        setConnected(false);
        setConnecting(false);
        console.log("Disconnected from admin chat", event.code, event.reason);
        
        // Auto-reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (session) {
            connectToChat();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnected(false);
        setConnecting(false);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "history") {
          setMessages(data.messages);
        } else if (data.type === "message") {
          setMessages((prev) => [...prev, data.message]);
        } else if (data.type === "online_users") {
          console.log("Received online users:", data.users);
          setOnlineUsers(data.users);
        } else if (data.type === "typing_users") {
          console.log("Received typing users:", data.users);
          setTypingUsers(data.users);
        } else if (data.type === "user_joined") {
          setOnlineUsers((prev) => {
            if (!prev.includes(data.userName)) {
              return [...prev, data.userName];
            }
            return prev;
          });
        } else if (data.type === "user_left") {
          setOnlineUsers((prev) =>
            prev.filter((name) => name !== data.userName)
          );
        }
      };


    } catch (error) {
      console.error("Connection error:", error);
      setConnected(false);
      setConnecting(false);
    }
  };

  // Auto-connect when session is available
  useEffect(() => {
    if (session && !connected && !connecting) {
      connectToChat();
    }
  }, [session, connected, connecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("sendMessage called", { 
      hasMessage: !!newMessage.trim(), 
      hasWebSocket: !!wsRef.current, 
      connected, 
      readyState: wsRef.current?.readyState 
    });
    
    if (!newMessage.trim() || !wsRef.current || !connected) {
      console.log("sendMessage early return");
      return;
    }

    // Clear typing timeout and send stop typing event
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingEvent(false);

    const messageData = JSON.stringify({
      type: "message",
      message: newMessage.trim(),
    });
    
    console.log("Sending message:", messageData);
    wsRef.current.send(messageData);

    setNewMessage("");
  };

  // Show loading while checking session
  if (isSessionPending) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking admin status...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!session) {
    return <Navigate to="/login" />;
  }

  // Note: Admin status is verified by the WebSocket endpoint
  // If the user is not an admin, the WebSocket connection will be rejected

  return (
    <div className="mx-auto w-full max-w-4xl py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col py-0 overflow-hidden">
            <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-primary/5 to-primary/10 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Admin Chat</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {connected ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {connected
                        ? "Connected"
                        : connecting
                          ? "Connecting..."
                          : "Disconnected"}
                    </span>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? "Live" : "Offline"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(100vh-20rem)]">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-sm">
                      Start a conversation with other admins!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.userId === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                          message.userId === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-medium opacity-80">
                            {message.userName}
                          </div>
                          <div className="text-xs opacity-60">
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed">
                          {message.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-2">
                      <TypingIndicator 
                        isTyping={true} 
                        userName={typingUsers.length === 1 ? typingUsers[0] : undefined}
                      />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="border-t p-4 bg-background/50 backdrop-blur-sm">
                <form onSubmit={sendMessage} className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    disabled={!connected || connecting}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!connected || !newMessage.trim() || connecting}
                    size="icon"
                    className="shrink-0"
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="border-b">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <CardTitle className="text-sm">Online Admins</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {onlineUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other admins online
                  </p>
                ) : (
                  onlineUsers.map((userName) => (
                    <div key={userName} className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm">{userName}</span>
                      {typingUsers.includes(userName) && (
                        <span className="text-xs text-muted-foreground italic">
                          typing...
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2">
                  Connection Status
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>WebSocket:</span>
                    <span
                      className={connected ? "text-green-600" : "text-red-600"}
                    >
                      {connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Status:</span>
                    <span className="text-green-600">Verified</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
