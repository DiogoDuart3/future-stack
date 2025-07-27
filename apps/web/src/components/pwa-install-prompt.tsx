import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  variant?: "banner" | "card";
}

export default function PWAInstallPrompt({ onDismiss, variant = "banner" }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    
    // Check if app is installed via other methods
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        setIsInstalled(relatedApps.length > 0);
      });
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support beforeinstallprompt
      showInstallInstructions();
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const showInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      alert('To install: Tap the Share button and select "Add to Home Screen"');
    } else if (isAndroid) {
      alert('To install: Tap the menu button and select "Add to Home Screen" or "Install App"');
    } else {
      alert('To install: Click the install icon in your browser\'s address bar or use the browser menu');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
  };

  // Don't show if already installed or in standalone mode
  if (isInstalled || isStandalone || !showPrompt) {
    return null;
  }

  if (variant === "card") {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Install Ecomantem</CardTitle>
                <CardDescription>
                  Get the full experience with offline support
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button onClick={handleInstallClick} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Install
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/install-pwa">Learn More</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Banner variant
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Install Ecomantem</h3>
            <p className="text-sm opacity-90">Get offline support and native app features</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleInstallClick} size="sm" variant="secondary">
            Install
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 