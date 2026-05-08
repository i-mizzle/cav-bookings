import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAdminSession } from "@/lib/auth/session";

export async function POST() {
  clearAdminSession(await cookies());

  return NextResponse.json({ success: true });
}