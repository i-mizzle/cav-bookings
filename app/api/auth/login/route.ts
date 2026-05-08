import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateAdmin, writeAdminSession } from "@/lib/auth/session";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;
  const email = body?.email?.trim() ?? "";
  const password = body?.password?.trim() ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email address and password are required." },
      { status: 400 }
    );
  }

  const user = await authenticateAdmin(email, password);

  if (!user) {
    return NextResponse.json(
      { message: "Invalid email address or password." },
      { status: 401 }
    );
  }

  await writeAdminSession(await cookies(), {
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({
    user,
  });
}