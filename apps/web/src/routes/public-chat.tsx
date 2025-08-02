import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogIn } from "lucide-react";
import PublicChat from "@/components/public-chat";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/public-chat')({
  component: PublicChatPage,
});

function PublicChatPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
          <div className="h-[600px] bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Public Chat</h1>
            <p className="text-muted-foreground mb-6">
              View the conversation in real-time or sign in to participate
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate({ to: "/login" })} className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In to Chat
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Continue as Guest
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>About Public Chat</CardTitle>
              <CardDescription>
                Connect with other users in our community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">💬</div>
                  <h3 className="font-medium mb-1">Real-time Messaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Send and receive messages instantly
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">👥</div>
                  <h3 className="font-medium mb-1">Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with users from around the world
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">🖼️</div>
                  <h3 className="font-medium mb-1">Profile Pictures</h3>
                  <p className="text-sm text-muted-foreground">
                    Show your personality with custom avatars
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Chat View */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Live Chat (View Only)</h2>
            <PublicChat />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Public Chat</h1>
          <p className="text-muted-foreground">
            Chat with other users in real-time. Be respectful and have fun!
          </p>
        </div>

        <PublicChat />
      </div>
    </div>
  );
} 