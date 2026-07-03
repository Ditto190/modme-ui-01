import { authMiddleware } from "@repo/auth/proxy";
import { parseError } from "@repo/observability/error";
import { secure } from "@repo/security";
import {
  noseconeOptions,
  noseconeOptionsWithToolbar,
  securityMiddleware,
} from "@repo/security/proxy";
import { type NextProxy, type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const config = {
  // matcher tells Next.js which routes to run the middleware on. This runs the
  // middleware on all routes except for static assets and Posthog ingest
  matcher: [
    "/((?!_next/static|_next/image|ingest|favicon.ico|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

const securityHeaders = env.FLAGS_SECRET
  ? securityMiddleware(noseconeOptionsWithToolbar)
  : securityMiddleware(noseconeOptions);

// Custom middleware for Arcjet security checks
const arcjetMiddleware = async (request: NextRequest) => {
  if (!env.ARCJET_KEY) {
    return;
  }

  try {
    await secure(
      [
        // See https://docs.arcjet.com/bot-protection/identifying-bots
        "CATEGORY:SEARCH_ENGINE", // Allow search engines
        "CATEGORY:PREVIEW", // Allow preview links to show OG images
        "CATEGORY:MONITOR", // Allow uptime monitoring services
      ],
      request
    );
  } catch (error) {
    const message = parseError(error);
    return NextResponse.json({ error: message }, { status: 403 });
  }
};

// Default middleware chain - simplified for development
export default authMiddleware(async (auth, request, _event) => {
  try {
    // Authentication enforcement: redirect unauthenticated users to sign-in on protected routes
    const pathname = request.nextUrl.pathname;
    const isSignInPage = pathname.startsWith("/sign-in");
    const isPublicRoute =
      isSignInPage ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next");

    if (!(auth?.user || isPublicRoute)) {
      const signInUrl = new URL("/sign-in", request.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Run security headers (primary security layer)
    const headersResponse = securityHeaders();

    // Apply Arcjet if configured
    if (env.ARCJET_KEY) {
      try {
        await arcjetMiddleware(request);
      } catch (arcjetError) {
        console.warn("Arcjet validation failed (continuing):", arcjetError);
      }
    }

    // Return secure response
    return headersResponse;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}) as unknown as NextProxy;
