# PDF Viewer (Next.js 14 + TypeScript + Tailwind)

Public site: home page with your logo → document grid (with first-page thumbnails) → full-page PDF.js viewer
(page navigation, zoom, download, mobile-friendly). Admin panel at `/admin` for uploading/deleting PDFs and changing the logo.

## Run locally
```bash
npm install
cp .env.example .env.local     # then edit it
npm run dev                    # http://localhost:3000
```
Set in `.env.local`:
- `ADMIN_PASSWORD` – the password for `/admin`
- `AUTH_SECRET` – any long random string (`openssl rand -hex 32`)

With no `BLOB_READ_WRITE_TOKEN`, files are stored in `./data/pdfs` and `./data/logo`.

## Deploy to Vercel
Vercel's filesystem is not persistent, so production uses **Vercel Blob**:
1. Push the project to GitHub and import it in Vercel.
2. In the project: **Storage → Create → Blob**, connect it (this adds `BLOB_READ_WRITE_TOKEN`).
3. Add `ADMIN_PASSWORD` and `AUTH_SECRET` under **Settings → Environment Variables**, then redeploy.

Note: Vercel serverless functions accept request bodies up to ~4.5 MB, so large PDFs fail to upload on
Vercel (the admin panel will show an error). Upload bigger files locally/self-hosted (`npm run build && npm start`
on a VPS or Docker keeps `./data` on disk), or switch to Vercel Blob client uploads.

## Security notes
- Admin session: signed, httpOnly, SameSite=Strict cookie (12 h). Uploads/deletes require it.
- Uploads are checked for the `%PDF-` signature and size (`MAX_UPLOAD_MB`); file IDs are validated against a strict pattern (no path traversal).
- PDFs are served only through `/api/pdfs/[id]`, never from a public folder. Note that anyone with a PDF's link can read it; this app has no per-user access control.
- This is a single-password setup, with no rate limiting on login. Use a strong password.
