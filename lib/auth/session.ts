import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_DURATION_SECONDS } from "@/lib/auth/constants";
import { createAdminJwt, verifyAdminJwt, type AdminJwtPayload } from "@/lib/auth/jwt";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";

type CookieAdapter = {
  set: (name: string, value: string, options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  }) => void;
  delete: (name: string) => void;
};

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  };
}

export async function authenticateAdmin(email: string, password: string) {
  await connectToDatabase();

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}

export async function writeAdminSession(cookieStore: CookieAdapter, payload: Pick<AdminJwtPayload, "sub" | "email" | "name">) {
  const token = await createAdminJwt(payload);
  cookieStore.set(ADMIN_SESSION_COOKIE, token, getSessionCookieOptions());
}

export function clearAdminSession(cookieStore: CookieAdapter) {
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAdminJwt(token);

  if (!payload) {
    return null;
  }

  if (!Types.ObjectId.isValid(payload.sub)) {
    return null;
  }

  await connectToDatabase();

  const user = await User.findById(payload.sub).select({ _id: 1, name: 1, email: 1 }).lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin");
  }

  return session;
}