import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Menu, X, MessageCircle } from "lucide-react";

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
    { to: "/public-chat", label: "Public Chat", icon: MessageCircle },
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-xl font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">A</span>
            </div>
            <span className="hidden sm:inline-block">App</span>
          </Link>
        </div>

        {/* Desktop Navigation - Hidden on tablet, shown on desktop */}
        <nav className="hidden lg:flex items-center space-x-1">
          {links.map(({ to, label, icon: Icon }) => {
            return (
              <Link 
                key={to} 
                to={to}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all duration-200 whitespace-nowrap"
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right Side */}
        <div className="flex items-center space-x-2">
          <ModeToggle />
          <UserMenu />
          
          {/* Mobile/Tablet Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
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
        </div>
      </div>

      {/* Mobile/Tablet Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
          />
          
          {/* Menu */}
          <div className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="flex flex-col py-2">
              {links.map(({ to, label, icon: Icon }) => {
                return (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-accent transition-colors text-sm font-medium"
                    onClick={closeMobileMenu}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
