import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "admin_session";
const TTL_MS = 1000 * 60 * 60 * 12;
const secret = () => process.env.AUTH_SECRET || "";
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");

export function passwordOk(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || !secret()) return false;
  const a = Buffer.from(sign(input)), b = Buffer.from(sign(real));
  return timingSafeEqual(a, b);
}

export function makeToken(): string {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function isAdmin(): boolean {
  const token = cookies().get(COOKIE)?.value;
  if (!token || !secret()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
