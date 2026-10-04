"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Pdf = { id: string; name: string; size: number };
type Msg = { kind: "ok" | "err"; text: string } | null;

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState("");
  const [logoV, setLogoV] = useState(Date.now());

  const refresh = useCallback(async () => {
    try { setPdfs((await (await fetch("/api/pdfs")).json()).pdfs ?? []); }
    catch { setMsg({ kind: "err", text: "Couldn't load the PDF list." }); }
  }, []);

  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then((d) => { setAuthed(d.authed); if (d.authed) refresh(); }).catch(() => setAuthed(false));
  }, [refresh]);

  async function login(e: FormEvent) {
    e.preventDefault(); setLoginErr("");
    const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const d = await r.json();
    if (r.ok) { setAuthed(true); setPassword(""); refresh(); } else setLoginErr(d.error || "Login failed.");
  }

  async function logout() { await fetch("/api/auth", { method: "DELETE" }); setAuthed(false); }

  async function upload(url: string, field: string, files: FileList, label: string) {
    setBusy(label); setMsg(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append(field, f));
    try {
      const r = await fetch(url, { method: "POST", body: fd });
      const text = await r.text();
      let d: any = {};
      try { d = JSON.parse(text); } catch { d = { error: r.status === 413 ? "File too large for this server." : "Upload failed." }; }
      if (r.status === 401) { setAuthed(false); return; }
      const errs: { name: string; error: string }[] = d.errors ?? [];
      if (!r.ok && !errs.length) setMsg({ kind: "err", text: d.error || "Upload failed." });
      else if (errs.length) setMsg({ kind: "err", text: `${d.uploaded?.length ?? 0} uploaded. Failed: ${errs.map((e) => `${e.name} (${e.error})`).join(", ")}` });
      else setMsg({ kind: "ok", text: field === "logo" ? "Logo updated." : `${d.uploaded.length} PDF(s) uploaded.` });
      if (field === "logo") setLogoV(Date.now());
      refresh();
    } catch { setMsg({ kind: "err", text: "Network error. Check your connection and try again." }); }
    finally { setBusy(""); }
  }

  async function remove(p: Pdf) {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    const r = await fetch(`/api/pdfs/${encodeURIComponent(p.id)}`, { method: "DELETE" });
    if (r.ok) { setMsg({ kind: "ok", text: `Deleted ${p.name}.` }); refresh(); }
    else setMsg({ kind: "err", text: (await r.json().catch(() => ({}))).error || "Delete failed." });
  }

  if (authed === null) return <main className="grid min-h-screen place-items-center text-ink/60">Loading…</main>;

  if (!authed)
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Admin sign in</h1>
          <label className="block text-sm font-medium">Password
            <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5" />
          </label>
          {loginErr && <p className="text-sm text-red-700" role="alert">{loginErr}</p>}
          <button className="btn-primary w-full" disabled={!password}>Sign in</button>
          <Link href="/" className="block text-center text-sm text-ink/50 hover:text-ink">Back to site</Link>
        </form>
      </main>
    );

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <div className="flex gap-2"><Link href="/" className="btn-ghost">View site</Link><button onClick={logout} className="btn-ghost">Sign out</button></div>
      </header>

      {msg && <p role="status" className={`rounded-xl border p-3 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{msg.text}</p>}

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold">Site logo</h2>
        <p className="mb-4 text-sm text-ink/60">PNG, JPG, WebP, GIF or SVG, up to 5 MB.</p>
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/logo?v=${logoV}`} alt="" className="h-16 max-w-[10rem] object-contain" onError={(e) => ((e.target as HTMLElement).style.display = "none")} />
          <label className={`btn-primary cursor-pointer ${busy === "logo" ? "opacity-50" : ""}`}>
            {busy === "logo" ? "Uploading…" : "Choose logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden disabled={!!busy}
              onChange={(e) => { if (e.target.files?.length) upload("/api/logo", "logo", e.target.files, "logo"); e.target.value = ""; }} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Upload PDFs</h2>
        <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line p-8 text-center hover:border-brand">
          <span className="font-medium">{busy === "pdf" ? "Uploading…" : "Choose one or more PDF files"}</span>
          <input type="file" accept="application/pdf" multiple hidden disabled={!!busy}
            onChange={(e) => { if (e.target.files?.length) upload("/api/pdfs", "files", e.target.files, "pdf"); e.target.value = ""; }} />
        </label>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Uploaded PDFs ({pdfs.length})</h2>
        {pdfs.length === 0 ? <p className="text-ink/60">Nothing uploaded yet.</p> : (
          <ul className="divide-y divide-line">
            {pdfs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <a href={`/view/${encodeURIComponent(p.id)}`} target="_blank" className="min-w-0 truncate font-medium hover:text-brand">{p.name}</a>
                <button onClick={() => remove(p)} className="btn-danger !py-1.5">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
