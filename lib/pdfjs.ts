// Client-only loader for pdf.js (v3). Call from effects/event handlers, never during SSR.
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
  return pdfjs;
}
