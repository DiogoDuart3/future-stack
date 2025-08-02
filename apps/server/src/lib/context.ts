import type { Context as HonoContext } from "hono";
import { createAuth } from "./auth";
import type { Env } from "../types/global";

export type CreateContextOptions = {
  context: HonoContext<{ Bindings: Env }>;
};

export async function createContext({ context }: CreateContextOptions) {
  const auth = createAuth();
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    env: context.env,
    req: context.req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
