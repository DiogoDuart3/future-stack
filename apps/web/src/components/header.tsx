import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { Button } from "./ui/button";

export default function Header() {
  const { data: session } = authClient.useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { to: "/todos-offline", label: "Offline Todos" },
    { to: "/install-pwa", label: "Install App" },
    { to: "/health", label: "Health" },
  ];

  const links = (adminCheck.data as { isAdmin: boolean })?.isAdmin
    ? [...baseLinks, { to: "/admin-chat", label: "Admin Chat" }]
    : baseLinks;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="relative">
      <div className="flex flex-row items-center justify-between px-4 py-3 md:px-6">
        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link 
                key={to} 
                to={to}
                className="hover:text-primary transition-colors"
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        {/* Desktop Right Side */}
        <div className="flex items-center gap-3">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
          />
          
          {/* Menu */}
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="flex flex-col py-4">
              {links.map(({ to, label }) => {
                return (
                  <Link
                    key={to}
                    to={to}
                    className="px-4 py-3 hover:bg-muted transition-colors text-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}

      <hr />
    </div>
  );
}
