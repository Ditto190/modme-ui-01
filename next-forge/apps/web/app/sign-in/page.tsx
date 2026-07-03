"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

/**
 * Sign-in page for credentials provider
 * Handles form submission via Auth.js credentials endpoint
 */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/en/catalog";

  const [email, setEmail] = useState("dev@modme.local");
  const [password, setPassword] = useState("devpassword");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // POST to Auth.js credentials endpoint
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
        redirect: "manual",
      });

      if (response.status === 302) {
        // Redirect after successful sign-in
        const location = response.headers.get("location");
        if (location) {
          router.push(
            location.includes("callbackUrl") ? location : callbackUrl
          );
        }
      } else if (response.status === 401) {
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        setError("Sign in failed. Please try again.");
        setIsLoading(false);
      }
    } catch (_err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-bold text-2xl">Sign in to ModMe</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Enter your credentials to continue
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              data-testid="email-input"
              disabled={isLoading}
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@modme.local"
              required
              type="email"
              value={email}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              data-testid="password-input"
              disabled={isLoading}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full"
            data-testid="signin-button"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Dev Info */}
        <div className="rounded-md bg-muted p-4 text-center text-muted-foreground text-xs">
          <p>Dev credentials pre-filled for testing</p>
          <p className="mt-1">Email: dev@modme.local</p>
          <p>Password: devpassword</p>
        </div>
      </div>
    </div>
  );
}
