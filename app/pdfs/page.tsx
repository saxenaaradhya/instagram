import Link from "next/link";
import PdfThumb from "@/components/PdfThumb";
import { listPdfs, PdfItem } from "@/lib/storage";

export const dynamic = "force-dynamic";

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default async function PdfList() {
  let pdfs: PdfItem[] = [], failed = false;
  try { pdfs = await listPdfs(); } catch (e) { console.error(e); failed = true; }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-ink/60">{pdfs.length} available</p>
        </div>
        <Link href="/" className="btn-ghost">Home</Link>
      </header>

      {failed ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">We couldn&apos;t load the documents. Refresh the page or try again shortly.</p>
      ) : pdfs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-12 text-center text-ink/60">No PDFs yet. Upload some from the admin panel.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {pdfs.map((p) => (
            <li key={p.id}>
              <Link href={`/view/${encodeURIComponent(p.id)}`} className="group block overflow-hidden rounded-2xl border border-line bg-white transition hover:border-brand hover:shadow-lg">
                <PdfThumb src={`/api/pdfs/${encodeURIComponent(p.id)}`} />
                <div className="p-3">
                  <p className="truncate font-semibold group-hover:text-brand" title={p.name}>{p.name}</p>
                  <p className="text-xs text-ink/50">{size(p.size)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
