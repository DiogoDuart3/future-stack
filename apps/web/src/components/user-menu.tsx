import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";
import { orpc } from "@/utils/orpc";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const loadProfilePicture = async () => {
      try {
        const result = await orpc.profile.getProfilePictureUrl.call({
          userId: session.user.id
        });
        setProfilePictureUrl(result.imageUrl);
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    };

    loadProfilePicture();
  }, [session?.user?.id]);

  if (isPending) {
    return <Skeleton className="h-9 w-20 md:w-24" />;
  }

  if (!session) {
    return (
      <Button variant="outline" size="sm" className="text-sm md:text-base" asChild>
        <Link to="/login">Sign In</Link>
      </Button>
    );
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-sm md:text-base max-w-[120px] md:max-w-none truncate flex items-center gap-2"
        >
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt={session.user.name}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {getUserInitials(session.user.name)}
              </span>
            </div>
          )}
          <span className="truncate">{session.user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card w-48 md:w-56" align="end">
        <DropdownMenuLabel className="text-sm md:text-base">My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-sm md:text-base break-all">
          {session.user.email}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Profile Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/public-chat" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Public Chat
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Button
            variant="destructive"
            size="sm"
            className="w-full text-sm md:text-base flex items-center gap-2"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
