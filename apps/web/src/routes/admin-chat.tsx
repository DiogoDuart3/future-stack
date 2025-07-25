import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
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
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get user session
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "Admin User";

  // Check if user is admin
  const adminCheck = useQuery(
    orpc.adminChat.checkAdminStatus.queryOptions(
      { userId },
      { enabled: !!userId }
    )
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = () => {
    if (!adminCheck.data?.isAdmin || !session) return;
    
    setConnecting(true);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/admin-chat`;
    
    // Create WebSocket with authentication headers
    const ws = new WebSocket(wsUrl);
    
    // Note: WebSocket doesn't support custom headers directly in the browser
    // The authentication will be handled via cookies automatically
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "history") {
        setMessages(data.messages);
      } else if (data.type === "message") {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === "user_joined") {
        // Optional: Add system message for user joining
        console.log(`${data.userName} joined the chat`);
      } else if (data.type === "user_left") {
        // Optional: Add system message for user leaving
        console.log(`${data.userName} left the chat`);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
    };

    ws.onerror = () => {
      setConnected(false);
      setConnecting(false);
    };
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !wsRef.current || !connected) return;

    wsRef.current.send(JSON.stringify({
      type: "message",
      message: newMessage.trim()
    }));

    setNewMessage("");
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Redirect if not logged in
  if (!session) {
    return <Navigate to="/login" />;
  }

  // Show loading while checking admin status
  if (adminCheck.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect non-admin users
  if (!adminCheck.data?.isAdmin) {
    return <Navigate to="/todos" />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Admin Chat</CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
              {!connected && !connecting && (
                <Button size="sm" onClick={connectToChat}>
                  Connect
                </Button>
              )}
              {connected && (
                <Button size="sm" variant="outline" onClick={disconnect}>
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start a conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.userId === userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.userId === userId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {message.userName}
                    </div>
                    <div className="text-sm">{message.message}</div>
                    <div className="text-xs opacity-50 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="border-t p-4">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={!connected || connecting}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!connected || !newMessage.trim() || connecting}
                size="icon"
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
  );
}