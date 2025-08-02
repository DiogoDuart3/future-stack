import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Users, User } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  userProfilePicture?: string;
}

interface PublicChatProps {
  className?: string;
}

export default function PublicChat({ className = "" }: PublicChatProps) {
  const { data: session } = authClient.useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setIsLoading(true);

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${import.meta.env.VITE_SERVER_URL.replace(
          "http://",
          ""
        ).replace("https://", "")}/ws/public-chat`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setIsLoading(false);
          if (isGuest) {
            toast.success("Connected to public chat (view only)");
          } else {
            toast.success("Connected to public chat");
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case "history":
                setMessages(data.messages || []);
                break;
              case "message":
                setMessages((prev) => [...prev, data.message]);
                break;
              case "online_users":
                setOnlineUsers(data.users || []);
                break;
              case "typing_users":
                setTypingUsers(data.users || []);
                break;
              case "user_joined":
                toast.info(`${data.userName} joined the chat`);
                break;
              case "user_left":
                toast.info(`${data.userName} left the chat`);
                break;
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          toast.error("Disconnected from chat");
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
          toast.error("Connection error");
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Failed to connect to chat:", error);
        setIsLoading(false);
        toast.error("Failed to connect to chat");
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session?.user?.id]);

  const sendMessage = () => {
    if (
      !newMessage.trim() ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: "message",
        message: newMessage.trim(),
      })
    );

    setNewMessage("");
  };

  const handleTyping = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isGuest) return;

    if (!isTyping) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({ type: "typing_start" }));
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "typing_stop" }));
      }
    }, 1000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isGuest = !session?.user?.id;

  // Allow the component to render even without session for guest access
  // The WebSocket connection will handle guest authentication

  return (
    <div className={`flex flex-col h-[600px] ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <CardTitle>Public Chat</CardTitle>
              {isGuest && (
                <Badge variant="secondary" className="text-xs">
                  View Only
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {onlineUsers.length}
              </Badge>
            </div>
          </div>
          <CardDescription>
            {isGuest 
              ? "View the conversation in real-time (sign in to send messages)" 
              : "Chat with other users in real-time"
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Connecting to chat...
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No messages yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Be the first to say hello!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.userId === session?.user?.id
                        ? "flex-row-reverse"
                        : ""
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.userProfilePicture ? (
                        <img
                          src={message.userProfilePicture}
                          alt={message.userName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {getUserInitials(message.userName)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`flex-1 max-w-[70%] ${
                        message.userId === session?.user?.id ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          message.userId === session?.user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {message.userName}
                          </span>
                          <span className="text-xs opacity-70">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Typing Indicator */}
          <div className="px-4 py-2 border-t bg-muted/50 min-h-[40px] flex items-center">
            {typingUsers.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {typingUsers.join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </p>
            ) : (
              <div className="h-4" /> // Invisible spacer to maintain height
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              {isGuest ? (
                <>
                  <div className="flex-1 flex items-center justify-center py-2 px-3 bg-muted/50 rounded-md border border-dashed">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        Sign in to send messages
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = '/login'}
                      >
                        Sign In
                      </Button>
                    </div>
                  </div>
                  <Button
                    disabled
                    size="icon"
                    className="opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    onInput={handleTyping}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!isConnected || !newMessage.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
