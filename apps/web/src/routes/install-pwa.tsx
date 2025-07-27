import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Wifi, WifiOff, Zap, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/install-pwa')({
  component: InstallPWAPage,
});

function InstallPWAPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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

  const features = [
    {
      icon: <Wifi className="h-5 w-5" />,
      title: "Online Sync",
      description: "Sync your todos across all devices when connected"
    },
    {
      icon: <WifiOff className="h-5 w-5" />,
      title: "Offline Support",
      description: "Work on your todos even without internet connection"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Fast Performance",
      description: "Lightning-fast loading and smooth interactions"
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: "Native Feel",
      description: "Works like a native app on your device"
    }
  ];

  if (isInstalled || isStandalone) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">App Already Installed!</CardTitle>
            <CardDescription>
              Ecomantem is already installed on your device. You can access it from your home screen or app drawer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/todos-offline">Open App</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="mx-auto mb-6 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <Download className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Install Ecomantem</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Get the full experience with offline support and native app features
        </p>
        <div className="flex justify-center gap-2 mb-8">
          <Badge variant="secondary">Offline-First</Badge>
          <Badge variant="secondary">Image Support</Badge>
          <Badge variant="secondary">Cross-Platform</Badge>
        </div>
      </div>

      {/* Install Button */}
      <div className="text-center mb-12">
        <Button 
          onClick={handleInstallClick}
          size="lg" 
          className="text-lg px-8 py-6 h-auto"
        >
          <Download className="mr-2 h-5 w-5" />
          Install Ecomantem
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Free • No ads • No tracking
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manual Installation Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Installation</CardTitle>
          <CardDescription>
            If the install button doesn't work, follow these steps:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-semibold mb-2">iOS Safari</h3>
              <p className="text-sm text-muted-foreground">
                Tap the Share button → "Add to Home Screen"
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-semibold mb-2">Android Chrome</h3>
              <p className="text-sm text-muted-foreground">
                Tap menu → "Add to Home Screen" or "Install App"
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">💻</div>
              <h3 className="font-semibold mb-2">Desktop</h3>
              <p className="text-sm text-muted-foreground">
                Click install icon in address bar or browser menu
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About Ecomantem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">What you get:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Offline todo management with image support</li>
                <li>• Automatic sync when you're back online</li>
                <li>• Native app experience on your device</li>
                <li>• No downloads or app store required</li>
                <li>• Works on all your devices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Privacy & Security:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Your data stays on your device</li>
                <li>• No tracking or analytics</li>
                <li>• Open source and transparent</li>
                <li>• No account required</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 