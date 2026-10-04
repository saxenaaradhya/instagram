"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/lib/pdfjs";

type Doc = { numPages: number; getPage: (n: number) => Promise<any>; destroy: () => void };

export default function PdfViewer({ id, name }: { id: string; name: string }) {
  const url = `/api/pdfs/${encodeURIComponent(id)}`;
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1); // multiplier on fit-to-width
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [width, setWidth] = useState(0);

  // Load document
  useEffect(() => {
    let d: Doc | null = null, dead = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        d = await pdfjs.getDocument(url).promise;
        if (dead) return d.destroy();
        setDoc(d); setStatus("ready");
      } catch (e: any) {
        if (dead) return;
        setError(e?.name === "MissingPDFException" ? "This PDF no longer exists." : "This PDF couldn't be opened.");
        setStatus("error");
      }
    })();
    return () => { dead = true; d?.destroy(); };
  }, [url]);

  // Track container width for fit-to-width
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el); setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Render current page
  useEffect(() => {
    if (!doc || !width) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null, dead = false;
    setRendering(true);
    (async () => {
      try {
        const p = await doc.getPage(page);
        const fit = (width - 32) / p.getViewport({ scale: 1 }).width;
        const dpr = window.devicePixelRatio || 1;
        const vp = p.getViewport({ scale: fit * zoom * dpr });
        const c = canvas.current!;
        c.width = vp.width; c.height = vp.height;
        c.style.width = `${vp.width / dpr}px`; c.style.height = `${vp.height / dpr}px`;
        task = p.render({ canvasContext: c.getContext("2d")!, viewport: vp });
        await task!.promise;
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException" && !dead) { setError("Couldn't display this page."); setStatus("error"); }
      } finally { if (!dead) setRendering(false); }
    })();
    return () => { dead = true; task?.cancel(); };
  }, [doc, page, zoom, width]);

  const go = useCallback((n: number) => doc && setPage(Math.min(Math.max(1, n), doc.numPages)), [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(page + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page]);

  const clamp = (z: number) => Math.min(4, Math.max(0.4, Math.round(z * 100) / 100));

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-200">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-white px-3 py-2 sm:px-5">
        <Link href="/pdfs" className="btn-ghost !px-3" aria-label="Back to documents">Back</Link>
        <h1 className="min-w-0 flex-1 truncate font-semibold" title={name}>{name}</h1>

        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-3" onClick={() => go(page - 1)} disabled={!doc || page <= 1} aria-label="Previous page">‹</button>
          <span className="flex items-center gap-1 text-sm">
            <input aria-label="Page number" className="w-12 rounded-lg border border-line px-1 py-1.5 text-center" inputMode="numeric"
              key={page} defaultValue={page} disabled={!doc}
              onKeyDown={(e) => e.key === "Enter" && go(parseInt((e.target as HTMLInputElement).value) || page)}
              onBlur={(e) => go(parseInt(e.target.value) || page)} />
            / {doc?.numPages ?? "–"}
          </span>
          <button className="btn-ghost !px-3" onClick={() => go(page + 1)} disabled={!doc || page >= doc.numPages} aria-label="Next page">›</button>
        </div>

        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-3" onClick={() => setZoom(clamp(zoom - 0.25))} disabled={!doc || zoom <= 0.4} aria-label="Zoom out">−</button>
          <button className="btn-ghost !px-2 w-16 tabular-nums" onClick={() => setZoom(1)} disabled={!doc} title="Fit to width">{Math.round(zoom * 100)}%</button>
          <button className="btn-ghost !px-3" onClick={() => setZoom(clamp(zoom + 0.25))} disabled={!doc || zoom >= 4} aria-label="Zoom in">+</button>
        </div>

        <a className="btn-primary" href={`${url}?download=1`} aria-label="Download PDF">Download</a>
      </header>

      <div ref={wrap} className="relative flex-1 overflow-auto p-4">
        {status === "error" ? (
          <div className="mx-auto mt-16 max-w-sm rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-semibold text-red-700">{error}</p>
            <Link href="/pdfs" className="btn-primary mt-5">Choose another document</Link>
          </div>
        ) : (
          <>
            <canvas ref={canvas} className="mx-auto block bg-white shadow-xl" />
            {(status === "loading" || rendering) && (
              <div className={`${status === "loading" ? "absolute inset-0" : "fixed bottom-5 left-1/2 -translate-x-1/2"} grid place-items-center pointer-events-none`}>
                <span className="flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {status === "loading" ? "Loading PDF…" : "Rendering…"}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
