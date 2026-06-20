"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface AuthProviderProperties {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProperties) => (
  <SessionProvider>{children}</SessionProvider>
);
