import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";

export interface ORPCClientConfig {
  serverUrl: string;
  onError?: (error: Error) => void;
  fetch?: typeof fetch;
}

/**
 * Creates an ORPC client exactly like the main web app
 */
export function createEcomantezORPCClient(config: ORPCClientConfig) {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: config.onError || ((error) => {
        console.error(`Error: ${error.message}`);
      }),
    }),
  });

  const link = new RPCLink({
    url: `${config.serverUrl}/rpc`,
    fetch: config.fetch || ((url, options) => {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    }),
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

/**
 * Creates a simple fetch-based client for manual ORPC calls
 */
export function createSimpleORPCClient(serverUrl: string) {
  const baseUrl = serverUrl;
  
  async function call(path: (string | number)[], input: any = null) {
    const response = await fetch(`${baseUrl}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path, input }),
    });
    
    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.result;
  }

  return {
    call,
    todo: {
      getAll: () => call(['todo', 'getAll']),
      getAllWithImages: () => call(['todo', 'getAllWithImages']),
      create: (input: { text: string; imageUrl?: string }) => call(['todo', 'create'], input),
      toggle: (input: { id: number; completed: boolean }) => call(['todo', 'toggle'], input),
      delete: (input: { id: number }) => call(['todo', 'delete'], input),
      uploadImage: (input: { todoId: number; filename: string; contentType: string; fileData: string }) => 
        call(['todo', 'uploadImage'], input),
    },
  };
}