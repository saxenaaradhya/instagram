import Link from "next/link";
import { logoVersion } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const v = await logoVersion().catch(() => null);
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#ffffff,#EEF2F5_60%,#DCE6EC)]" />
      {v ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/logo?v=${v}`} alt="Site logo" className="mb-10 max-h-40 w-auto max-w-[80%] object-contain sm:max-h-52" />
      ) : (
        <div className="mb-10 grid h-28 w-28 place-items-center rounded-3xl bg-ink text-4xl font-bold text-white">PDF</div>
      )}
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">Read every document in one place.</h1>
      <p className="mt-5 max-w-md text-lg text-ink/70">Open any PDF in your browser. Zoom, jump between pages, or download a copy.</p>
      <Link href="/pdfs" className="btn-primary mt-10 !px-10 !py-4 !text-lg shadow-lg shadow-brand/25">Open viewer</Link>
      <Link href="/admin" className="absolute bottom-5 right-6 text-sm text-ink/50 hover:text-ink">Admin</Link>
    </main>
  );
}
