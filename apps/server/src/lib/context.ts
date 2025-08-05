import type { Context as HonoContext } from "hono";
import type { Env } from "../types/global";
import { createAuth } from "./auth";

export type CreateContextOptions = {
  context: HonoContext<{ Bindings: Env }>;
  auth: ReturnType<typeof createAuth>;
};

export async function createContext({ context, auth }: CreateContextOptions) {
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
