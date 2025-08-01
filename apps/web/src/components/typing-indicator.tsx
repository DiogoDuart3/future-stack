import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
}

export function TypingIndicator({ isTyping, userName }: TypingIndicatorProps) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!isTyping) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isTyping) return null;

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center space-x-1">
        <div className="flex space-x-1">
          <div
            className={`h-2 w-2 rounded-full bg-muted-foreground transition-opacity duration-200 ${
              dots >= 1 ? "opacity-100" : "opacity-30"
            }`}
          />
          <div
            className={`h-2 w-2 rounded-full bg-muted-foreground transition-opacity duration-200 ${
              dots >= 2 ? "opacity-100" : "opacity-30"
            }`}
          />
          <div
            className={`h-2 w-2 rounded-full bg-muted-foreground transition-opacity duration-200 ${
              dots >= 3 ? "opacity-100" : "opacity-30"
            }`}
          />
        </div>
      </div>
      <span className="text-xs">
        {userName ? `${userName} is typing` : "Someone is typing"}
      </span>
    </div>
  );
} 