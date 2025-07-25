import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();

  // Check if user is admin
  const adminCheck = useQuery({
    ...orpc.adminChat.checkAdminStatus.queryOptions({
      input: { userId: session?.user?.id || "" },
    }),
    enabled: !!session?.user?.id,
  });

  const baseLinks = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/todos", label: "Todos" },
  ];

  const links = adminCheck.data?.isAdmin
    ? [...baseLinks, { to: "/admin-chat", label: "Admin Chat" }]
    : baseLinks;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
