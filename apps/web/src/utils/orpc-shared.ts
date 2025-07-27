import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";

export interface CreateORPCClientConfig {
  serverUrl: string;
  onError?: (error: Error) => void;
}

/**
 * Creates the same ORPC client setup used by the main web app
 */
export function createSharedORPCClient(config: CreateORPCClientConfig) {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: config.onError || ((error) => {
        console.error(`Error: ${error.message}`);
      }),
    }),
  });

  const link = new RPCLink({
    url: `${config.serverUrl}/rpc`,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });

  const client = createORPCClient(link);
  const orpc = createTanstackQueryUtils(client);

  return {
    queryClient,
    client,
    orpc,
    link,
  };
}