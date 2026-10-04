import { promises as fs } from "fs";
import path from "path";
import { del, list, put } from "@vercel/blob";

// Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise local ./data folder.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const PDF_DIR = path.join(process.cwd(), "data", "pdfs");
const LOGO_DIR = path.join(process.cwd(), "data", "logo");

export type PdfItem = { id: string; name: string; size: number; uploadedAt: number };

const ID_RE = /^\d{10,}__[\w\- ().]+\.pdf$/;
export const validId = (id: string) => ID_RE.test(id);

const toItem = (key: string, size: number): PdfItem => {
  const [ts, rest] = key.split("__");
  return { id: key, name: rest.replace(/\.pdf$/, ""), size, uploadedAt: Number(ts) };
};

export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif",
};
const extToType = (ext: string) => Object.keys(LOGO_TYPES).find((t) => LOGO_TYPES[t] === ext) || "application/octet-stream";

// ---------- PDFs ----------
export async function listPdfs(): Promise<PdfItem[]> {
  let items: PdfItem[] = [];
  if (useBlob) {
    const { blobs } = await list({ prefix: "pdfs/" });
    items = blobs.map((b) => b.pathname.slice(5)).filter(validId).map((k, i) => toItem(k, blobs[i].size));
  } else {
    await fs.mkdir(PDF_DIR, { recursive: true });
    for (const f of await fs.readdir(PDF_DIR)) {
      if (validId(f)) items.push(toItem(f, (await fs.stat(path.join(PDF_DIR, f))).size));
    }
  }
  return items.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export async function savePdf(originalName: string, data: Buffer): Promise<PdfItem> {
  const clean = originalName.replace(/\.pdf$/i, "").replace(/[^\w\- ().]+/g, "_").trim().slice(0, 100) || "document";
  const key = `${Date.now()}__${clean}.pdf`;
  if (useBlob) {
    await put(`pdfs/${key}`, data, { access: "public", addRandomSuffix: false, contentType: "application/pdf" });
  } else {
    await fs.mkdir(PDF_DIR, { recursive: true });
    await fs.writeFile(path.join(PDF_DIR, key), data);
  }
  return toItem(key, data.length);
}

export async function readPdf(id: string): Promise<Buffer | null> {
  if (!validId(id)) return null;
  if (useBlob) {
    const { blobs } = await list({ prefix: `pdfs/${id}` });
    const hit = blobs.find((b) => b.pathname === `pdfs/${id}`);
    if (!hit) return null;
    const res = await fetch(hit.url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  try { return await fs.readFile(path.join(PDF_DIR, id)); } catch { return null; }
}

export async function deletePdf(id: string): Promise<boolean> {
  if (!validId(id)) return false;
  if (useBlob) {
    const { blobs } = await list({ prefix: `pdfs/${id}` });
    const hit = blobs.find((b) => b.pathname === `pdfs/${id}`);
    if (!hit) return false;
    await del(hit.url);
    return true;
  }
  try { await fs.unlink(path.join(PDF_DIR, id)); return true; } catch { return false; }
}

// ---------- Logo ----------
export async function saveLogo(data: Buffer, mime: string) {
  const ext = LOGO_TYPES[mime];
  if (useBlob) {
    const { blobs } = await list({ prefix: "logo/" });
    if (blobs.length) await del(blobs.map((b) => b.url));
    await put(`logo/logo.${ext}`, data, { access: "public", addRandomSuffix: false, contentType: mime });
  } else {
    await fs.mkdir(LOGO_DIR, { recursive: true });
    for (const f of await fs.readdir(LOGO_DIR)) await fs.unlink(path.join(LOGO_DIR, f));
    await fs.writeFile(path.join(LOGO_DIR, `logo.${ext}`), data);
  }
}

/** Returns a version number (for cache-busting) or null if no logo exists. */
export async function logoVersion(): Promise<number | null> {
  if (useBlob) {
    const { blobs } = await list({ prefix: "logo/" });
    return blobs[0] ? new Date(blobs[0].uploadedAt).getTime() : null;
  }
  try {
    const f = (await fs.readdir(LOGO_DIR)).find((n) => n.startsWith("logo."));
    return f ? (await fs.stat(path.join(LOGO_DIR, f))).mtimeMs : null;
  } catch { return null; }
}

export async function readLogo(): Promise<{ data: Buffer; type: string } | null> {
  if (useBlob) {
    const { blobs } = await list({ prefix: "logo/" });
    if (!blobs[0]) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return { data: Buffer.from(await res.arrayBuffer()), type: extToType(blobs[0].pathname.split(".").pop()!) };
  }
  try {
    const f = (await fs.readdir(LOGO_DIR)).find((n) => n.startsWith("logo."));
    if (!f) return null;
    return { data: await fs.readFile(path.join(LOGO_DIR, f)), type: extToType(f.split(".").pop()!) };
  } catch { return null; }
}
