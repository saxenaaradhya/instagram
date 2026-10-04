"use client";
import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/lib/pdfjs";

/** Renders page 1 of a PDF to a small canvas once it scrolls into view. */
export default function PdfThumb({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "error">("idle");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      try {
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument(src).promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 360 / base.width });
        const c = canvas.current!;
        c.width = viewport.width; c.height = viewport.height;
        await page.render({ canvasContext: c.getContext("2d")!, viewport }).promise;
        if (!cancelled) setState("ready");
        doc.destroy();
      } catch { if (!cancelled) setState("error"); }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, [src]);

  return (
    <div ref={box} className="relative aspect-[3/4] w-full overflow-hidden bg-fog">
      <canvas ref={canvas} className={`h-full w-full object-cover object-top transition-opacity ${state === "ready" ? "opacity-100" : "opacity-0"}`} />
      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center text-sm text-ink/40">
          {state === "error" ? "No preview" : <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />}
        </div>
      )}
    </div>
  );
}
