import { analytics } from "@repo/analytics/server";
import { NextResponse } from "next/server";

export const POST = async (): Promise<Response> => {
  await analytics?.shutdown();
  return NextResponse.json({ message: "Not configured", ok: false });
};
