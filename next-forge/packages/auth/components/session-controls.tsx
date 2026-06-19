"use client";

import { DEFAULT_ORG_ID } from "@repo/auth/constants";
import { signOut, useSession } from "next-auth/react";

interface OrganizationSwitcherProperties {
  afterSelectOrganizationUrl?: string;
  hidePersonal?: boolean;
}

export const OrganizationSwitcher = ({
  afterSelectOrganizationUrl: _afterSelectOrganizationUrl,
  hidePersonal: _hidePersonal,
}: OrganizationSwitcherProperties) => {
  const { data: session } = useSession();
  const orgId =
    (session?.user as { orgId?: string } | undefined)?.orgId ?? DEFAULT_ORG_ID;

  return (
    <div className="flex h-9 w-full items-center rounded-md border px-3 text-sm">
      <span className="truncate">{orgId}</span>
    </div>
  );
};

interface UserButtonProperties {
  afterSignOutUrl?: string;
}

export const UserButton = ({ afterSignOutUrl = "/" }: UserButtonProperties) => {
  const { data: session } = useSession();

  return (
    <div className="flex items-center gap-2">
      <span className="truncate text-sm">
        {session?.user?.name ?? session?.user?.email ?? "User"}
      </span>
      <button
        className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
        onClick={() => signOut({ callbackUrl: afterSignOutUrl })}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
};
