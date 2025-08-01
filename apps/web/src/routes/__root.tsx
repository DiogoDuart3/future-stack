import Header from "@/components/header";
import Loader from "@/components/loader";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { link, orpc } from "@/utils/orpc";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { appRouter } from "@server/routers";
import { createORPCClient } from "@orpc/client";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "My App",
      },
      {
        name: "description",
        content: "My App is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  const [client] = useState<RouterClient<typeof appRouter>>(() => createORPCClient(link));
  const [orpcUtils] = useState(() => createTanstackQueryUtils(client));

  return (
    <>
      <HeadContent />
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <OfflineIndicator />
          <div className="grid grid-rows-[auto_1fr] h-svh">
            <Header />
            {isFetching ? <Loader /> : <Outlet />}
          </div>
          <Toaster richColors />
        </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
