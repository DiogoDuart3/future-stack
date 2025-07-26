import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  uptime: string | number;
  responseTime: string;
  checks: {
    database: {
      status: "healthy" | "unhealthy";
      responseTime: string;
    };
    storage: {
      status: "healthy" | "unhealthy" | "unknown";
      error?: string;
    };
    durableObjects: {
      status: "healthy" | "unhealthy" | "unknown";
      error?: string;
    };
  };
}

export const Route = createFileRoute("/health")({
  component: HealthPage,
});

function HealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startTime = Date.now();
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/health`);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: HealthStatus = await response.json();
      setHealthStatus(data);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setHealthStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Set up periodic health checks every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "unhealthy":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case "degraded":
        return <Badge variant="secondary" className="bg-yellow-500">Degraded</Badge>;
      case "unhealthy":
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">System Health</h1>
        <p className="text-muted-foreground">
          Real-time status of the application and its dependencies
        </p>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(healthStatus?.status || "unknown")}
            Overall System Status
          </CardTitle>
          <CardDescription>
            Last checked: {lastChecked ? lastChecked.toLocaleString() : "Never"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold">
                {healthStatus?.status ? healthStatus.status.toUpperCase() : "UNKNOWN"}
              </p>
              <p className="text-sm text-muted-foreground">
                Version: {healthStatus?.version || "Unknown"} | 
                Environment: {healthStatus?.environment || "Unknown"}
              </p>
            </div>
            <div className="flex gap-2">
              {healthStatus && getStatusBadge(healthStatus.status)}
              <button
                onClick={checkHealth}
                disabled={loading}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Checking..." : "Refresh"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Health Check Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !healthStatus && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>Checking system health...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Health Checks */}
      {healthStatus && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Database Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthStatus.checks.database.status)}
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(healthStatus.checks.database.status)}
                </div>
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span className="text-sm">{healthStatus.checks.database.responseTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthStatus.checks.storage.status)}
                Storage (R2)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(healthStatus.checks.storage.status)}
                </div>
                {healthStatus.checks.storage.error && (
                  <div className="text-sm text-red-600 mt-2">
                    Error: {healthStatus.checks.storage.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Durable Objects Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthStatus.checks.durableObjects.status)}
                Durable Objects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(healthStatus.checks.durableObjects.status)}
                </div>
                {healthStatus.checks.durableObjects.error && (
                  <div className="text-sm text-red-600 mt-2">
                    Error: {healthStatus.checks.durableObjects.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Information */}
      {healthStatus && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Backend Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span>{healthStatus.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span>{healthStatus.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span>{healthStatus.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span>{healthStatus.responseTime}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Frontend Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>User Agent:</span>
                    <span className="text-xs truncate max-w-32">
                      {navigator.userAgent}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Online Status:</span>
                    <span>{navigator.onLine ? "Online" : "Offline"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <span>
                      {(navigator as any).connection 
                        ? `${(navigator as any).connection.effectiveType || "Unknown"}`
                        : "Unknown"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 