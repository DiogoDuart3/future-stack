import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error(`Error: ${error.message}`);
    },
  }),
});

export const link = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

// Use a more generic type that ORPC can work with
export const client = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);