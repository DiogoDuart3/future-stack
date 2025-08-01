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

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-sm md:text-base max-w-[120px] md:max-w-none truncate"
        >
          {session.user.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card w-48 md:w-56" align="end">
        <DropdownMenuLabel className="text-sm md:text-base">My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-sm md:text-base break-all">
          {session.user.email}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            variant="destructive"
            size="sm"
            className="w-full text-sm md:text-base"
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
            Sign Out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
