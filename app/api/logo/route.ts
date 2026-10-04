import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { LOGO_TYPES, readLogo, saveLogo } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await readLogo().catch(() => null);
  if (!logo) return NextResponse.json({ error: "No logo." }, { status: 404 });
  return new NextResponse(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.type,
      "Cache-Control": "public, max-age=31536000, immutable", // URL carries ?v=version
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", // neutralise scripts in SVG
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("logo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!LOGO_TYPES[file.type]) return NextResponse.json({ error: "Use PNG, JPG, WebP, GIF or SVG." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Logo must be under 5 MB." }, { status: 400 });
  try { await saveLogo(Buffer.from(await file.arrayBuffer()), file.type); }
  catch (e) { console.error(e); return NextResponse.json({ error: "Could not save logo." }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
