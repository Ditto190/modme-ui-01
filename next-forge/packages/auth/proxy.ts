import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

type AuthMiddlewareCallback = (
  auth: unknown,
  request: Request,
  event: unknown
) => Response | undefined | Promise<Response | undefined>;

export function authMiddleware(callback: AuthMiddlewareCallback) {
  return auth(async (request) => {
    const response = await callback(
      request.auth,
      request as unknown as Request,
      undefined
    );
    return response ?? undefined;
  });
}

export { auth };
