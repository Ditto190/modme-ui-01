"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export const SignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState("dev@modme.local");
  const [password, setPassword] = useState("devpassword");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Invalid credentials. Use dev@modme.local / devpassword.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-4"
      onSubmit={onSubmit}
    >
      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};
