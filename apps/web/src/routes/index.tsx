import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Code2, 
  Zap, 
  Shield, 
  Smartphone, 
  Database, 
  Globe, 
  Palette, 
  Layers,
  Rocket,
  CheckCircle,
  ArrowRight,
  Github,
  ExternalLink
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  const technologies = [
    {
      name: "React 19",
      description: "Latest React with concurrent features",
      icon: <Code2 className="h-5 w-5" />,
      category: "Frontend"
    },
    {
      name: "TanStack Router",
      description: "Type-safe file-based routing",
      icon: <Layers className="h-5 w-5" />,
      category: "Frontend"
    },
    {
      name: "TanStack Query",
      description: "Powerful data synchronization",
      icon: <Database className="h-5 w-5" />,
      category: "Frontend"
    },
    {
      name: "TailwindCSS",
      description: "Utility-first CSS framework",
      icon: <Palette className="h-5 w-5" />,
      category: "Styling"
    },
    {
      name: "shadcn/ui",
      description: "Beautiful, accessible components",
      icon: <Layers className="h-5 w-5" />,
      category: "UI"
    },
    {
      name: "Hono",
      description: "Lightweight, fast web framework",
      icon: <Zap className="h-5 w-5" />,
      category: "Backend"
    },
    {
      name: "oRPC",
      description: "End-to-end type-safe APIs",
      icon: <Shield className="h-5 w-5" />,
      category: "Backend"
    },
    {
      name: "Drizzle ORM",
      description: "TypeScript-first database toolkit",
      icon: <Database className="h-5 w-5" />,
      category: "Database"
    },
    {
      name: "PostgreSQL",
      description: "Advanced open-source database",
      icon: <Database className="h-5 w-5" />,
      category: "Database"
    },
    {
      name: "Better Auth",
      description: "Modern authentication solution",
      icon: <Shield className="h-5 w-5" />,
      category: "Auth"
    },
    {
      name: "PWA Support",
      description: "Progressive Web App capabilities",
      icon: <Smartphone className="h-5 w-5" />,
      category: "Mobile"
    },
    {
      name: "Cloudflare Workers",
      description: "Edge computing platform",
      icon: <Globe className="h-5 w-5" />,
      category: "Infrastructure"
    }
  ];

  const features = [
    "Type-safe end-to-end development",
    "File-based routing with full type safety",
    "Real-time chat with WebSocket support",
    "Offline-first todos with sync",
    "Progressive Web App (PWA) support",
    "Modern authentication with Better Auth",
    "Database migrations with Drizzle",
    "Monorepo structure with Turborepo",
    "TailwindCSS for rapid UI development",
    "shadcn/ui component library",
    "Image compression and handling",
    "Dark/light theme support"
  ];

  const categories = [...new Set(technologies.map(tech => tech.category))];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PWAInstallPrompt />
      
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Rocket className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Future Stack</h1>
        </div>
        <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
          A modern, full-stack TypeScript starter kit that combines the best technologies 
          for building scalable web applications with type safety, performance, and developer experience.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <a href="https://github.com/AmanVarshney01/create-better-t-stack" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-2" />
              View on GitHub
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">
              <ArrowRight className="h-4 w-4 mr-2" />
              Explore Demo
            </a>
          </Button>
        </div>
      </div>

      {/* API Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`} />
            API Status
          </CardTitle>
          <CardDescription>
            Real-time connection status to the backend API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {healthCheck.isLoading
                ? "Checking connection..."
                : healthCheck.data
                  ? "✅ Connected to backend API"
                  : "❌ Disconnected from backend API"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Technologies Grid */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Technology Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {technologies
                    .filter(tech => tech.category === category)
                    .map(tech => (
                      <div key={tech.name} className="flex items-center gap-3 p-2 rounded-lg border">
                        <div className="text-primary">{tech.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{tech.name}</div>
                          <div className="text-sm text-muted-foreground">{tech.description}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Get up and running with Future Stack in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="font-mono text-sm">
                <div className="text-muted-foreground"># Install dependencies</div>
                <div className="text-foreground">bun install</div>
                <br />
                <div className="text-muted-foreground"># Set up database</div>
                <div className="text-foreground">bun db:push</div>
                <br />
                <div className="text-muted-foreground"># Start development</div>
                <div className="text-foreground">bun dev</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <a href="/dashboard">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Try the Demo
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com/AmanVarshney01/create-better-t-stack" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Learn More
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why Choose Future Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Why Choose Future Stack?</CardTitle>
          <CardDescription>
            Built with modern best practices and developer experience in mind
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Type Safety</span>
              </div>
              <p className="text-sm text-muted-foreground">
                End-to-end type safety from database to UI with TypeScript, oRPC, and Drizzle ORM.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-medium">Performance</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Built on Cloudflare Workers for edge computing and optimal performance worldwide.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="font-medium">PWA Ready</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Progressive Web App support with offline capabilities and native app-like experience.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Developer Experience</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Hot reload, type checking, and modern tooling for the best development experience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
