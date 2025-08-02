import { protectedProcedure, publicProcedure, o } from "../lib/orpc";
import { todoRouter } from "./todo";
import { adminChatRouter } from "./admin-chat";
import { profileRouter } from "./profile";
import { publicChatRouter } from "./public-chat";

export const appRouter = o.router({
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
  profile: profileRouter,
  // publicChat: publicChatRouter,
});

export type AppRouter = typeof appRouter;
