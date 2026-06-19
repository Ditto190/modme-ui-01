import "server-only";

import { redirect } from "next/navigation";
import { auth as nextAuth } from "./auth";

export { handlers, signIn, signOut } from "./auth";

export async function auth() {
  const session = await nextAuth();

  return {
    userId: session?.user?.id ?? null,
    orgId: (session?.user as { orgId?: string | undefined })?.orgId ?? null,
    redirectToSignIn: () => redirect("/sign-in"),
  };
}

export async function currentUser() {
  const session = await nextAuth();

  if (!session?.user) {
    return null;
  }

  const nameParts = session.user.name?.split(" ") ?? [];

  return {
    id: session.user.id,
    firstName: nameParts[0] ?? null,
    lastName: nameParts.slice(1).join(" ") || null,
    imageUrl: session.user.image ?? null,
    emailAddresses: session.user.email
      ? [{ emailAddress: session.user.email }]
      : [],
  };
}

export function clerkClient() {
  return Promise.resolve({
    organizations: {
      getOrganizationMembershipList: async () => ({
        data: [
          {
            publicUserData: {
              userId: "dev-user",
              firstName: "Dev",
              lastName: "User",
              identifier: "dev@modme.local",
              imageUrl: "",
            },
          },
        ],
      }),
    },
    users: {
      getUserList: async () => ({ data: [] }),
    },
  });
}

export type UserJSON = Record<string, unknown>;
export type OrganizationJSON = Record<string, unknown>;
export type OrganizationMembershipJSON = Record<string, unknown>;
export type DeletedObjectJSON = Record<string, unknown>;
export type WebhookEvent = Record<string, unknown>;
export interface OrganizationMembership {
  publicUserData?: {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    identifier?: string;
    imageUrl?: string;
  };
}
