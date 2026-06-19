"use client";

import Link from "next/link";

export const SignUp = () => (
  <div className="mx-auto max-w-sm space-y-4 text-center">
    <p className="text-muted-foreground text-sm">
      Local dev uses a single credentials account. Sign in with the default dev
      user instead.
    </p>
    <Link className="text-primary underline underline-offset-4" href="/sign-in">
      Go to sign in
    </Link>
  </div>
);
