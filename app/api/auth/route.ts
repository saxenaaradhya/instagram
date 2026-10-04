import { NextResponse } from "next/server";
import { COOKIE, isAdmin, makeToken, passwordOk } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ authed: isAdmin() });
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSWORD || !process.env.AUTH_SECRET)
    return NextResponse.json({ error: "Server is missing ADMIN_PASSWORD or AUTH_SECRET." }, { status: 500 });
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!passwordOk(String(password ?? ""))) return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const res = NextResponse.json({ authed: true });
  res.cookies.set(COOKIE, makeToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ authed: false });
  res.cookies.delete(COOKIE);
  return res;
}
