import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listPdfs, savePdf } from "@/lib/storage";

export const dynamic = "force-dynamic";
const MAX = (Number(process.env.MAX_UPLOAD_MB) || 50) * 1024 * 1024;

export async function GET() {
  try { return NextResponse.json({ pdfs: await listPdfs() }); }
  catch (e) { console.error(e); return NextResponse.json({ error: "Could not load PDFs." }, { status: 500 }); }
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid upload." }, { status: 400 }); }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });

  const uploaded = [], errors: { name: string; error: string }[] = [];
  for (const file of files) {
    try {
      if (file.size > MAX) throw new Error(`Larger than ${MAX / 1024 / 1024} MB.`);
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("Not a valid PDF.");
      uploaded.push(await savePdf(file.name, buf));
    } catch (e) {
      errors.push({ name: file.name, error: e instanceof Error ? e.message : "Upload failed." });
    }
  }
  return NextResponse.json({ uploaded, errors }, { status: uploaded.length ? 200 : 400 });
}
