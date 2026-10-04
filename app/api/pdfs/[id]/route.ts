import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deletePdf, readPdf } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const data = await readPdf(params.id).catch(() => null);
  if (!data) return NextResponse.json({ error: "PDF not found." }, { status: 404 });
  const name = params.id.split("__")[1];
  const dl = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(data.length),
      "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${encodeURIComponent(name)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const ok = await deletePdf(params.id).catch(() => false);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "PDF not found." }, { status: 404 });
}
