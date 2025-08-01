import { protectedProcedure, publicProcedure } from "../lib/orpc";
import { todoRouter } from "./todo";
import { adminChatRouter } from "./admin-chat";

export const appRouter: {
  healthCheck: ReturnType<typeof publicProcedure.handler>;
  privateData: ReturnType<typeof protectedProcedure.handler>;
  todo: typeof todoRouter;
  adminChat: typeof adminChatRouter;
} = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  todo: todoRouter,
  adminChat: adminChatRouter,
};
export type AppRouter = typeof appRouter;
