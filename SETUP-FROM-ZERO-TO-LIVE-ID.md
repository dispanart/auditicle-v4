# Auditicle V4.8.0 — Setup dari Nol sampai Live

Arsitektur produksi:

```text
auditicle.site
└── Cloudflare Worker: auditicle-v4
    ├── React + Vite + prerendered homepage
    ├── Worker Static Assets
    ├── /api/* evidence backend
    ├── BROWSER binding
    ├── QUOTA_COORDINATOR Durable Object
    ├── Cache API
    └── PageSpeed + optional AI providers
```

Tidak memerlukan Codespaces, Vercel, Pages terpisah, backend terpisah, database laporan, atau API key di browser.

## 1. Ekstrak source

Ekstrak ZIP V4.8.0. Root hasil ekstrak harus langsung berisi:

```text
package.json
package-lock.json
wrangler.jsonc
index.html
src/
worker/
public/
scripts/
tests/
benchmark/
```

Jangan upload `node_modules`, `dist`, `.wrangler`, `.dev.vars`, `.env`, API key, atau screenshot credential.

## 2. Buat repository GitHub

1. Buka GitHub → New repository.
2. Nama: `auditicle-v4`.
3. Visibility: Private.
4. Jangan membuat README/.gitignore/license otomatis.
5. Pilih **Upload files**.
6. Upload seluruh isi root hasil ekstrak, bukan ZIP dan bukan folder pembungkus.
7. Commit ke branch `main` dengan pesan `Deploy Auditicle V4.8.0`.

## 3. Siapkan Turnstile sebelum audit produksi

Source memakai:

```text
TURNSTILE_REQUIRED=true
```

Buat widget Turnstile Managed untuk:

```text
auditicle.site
www.auditicle.site
auditicle-v4.<subdomain-anda>.workers.dev
```

Simpan:

- site key → variable biasa `TURNSTILE_SITE_KEY`;
- secret key → Secret `TURNSTILE_SECRET`.

Homepage tetap dapat dibuka tanpa key, tetapi pembuatan audit session akan ditolak sampai kedua nilai tersedia.

## 4. Buat Worker dari GitHub

1. Buka Cloudflare Dashboard → Workers & Pages.
2. Create → Import repository.
3. Pilih repository `auditicle-v4` dan branch `main`.
4. Gunakan:

```text
Worker name: auditicle-v4
Root directory: /
Build command: npm run build
Deploy command: npx wrangler deploy
```

5. Deploy.

`wrangler.jsonc` otomatis mendeklarasikan:

- Static Assets dari `dist/`;
- `BROWSER` binding;
- `QUOTA_COORDINATOR` Durable Object;
- migration tag `v1` untuk class `AuditicleQuotaCoordinator`;
- `nodejs_compat`;
- CPU 10 ms dan 50 external subrequests;
- konfigurasi Free launch profile.

Jangan membuat Durable Object lain secara manual dengan nama berbeda.

## 5. Tambahkan Secrets

Cloudflare Dashboard → Worker `auditicle-v4` → Settings → Variables and Secrets.

Tambahkan sebagai **Secret**:

```text
TURNSTILE_SECRET
PAGESPEED_API_KEY
GEMINI_API_KEY
GROQ_API_KEY
OPENROUTER_API_KEY
```

Hanya `TURNSTILE_SECRET` wajib ketika Turnstile enforced. Semua AI key opsional. Provider tanpa key otomatis dilewati. PageSpeed failure tidak menggagalkan audit utama.

## 6. Tambahkan variable publik yang tidak berada di GitHub

Tambahkan sebagai plaintext variable:

```text
TURNSTILE_SITE_KEY=<site-key-anda>
```

Variable aman lain sudah memiliki nilai produksi di `wrangler.jsonc`, termasuk:

```text
SITE_URL=https://auditicle.site
PUBLIC_CONTACT_EMAIL=hello@auditicle.site
TURNSTILE_REQUIRED=true
DAILY_AUDIT_LIMIT=5
GLOBAL_DAILY_AUDIT_LIMIT=100
DONATION_URL=https://sociabuzz.com/dispa/donate
MAX_LINKS=5
LINK_BATCH_SIZE=5
MAX_LINK_BATCHES=1
AI_REPORTS_PER_SESSION=1
TRANSLATIONS_PER_SESSION=1
RENDERED_BROWSER_DAILY_LIMIT=20
AI_DAILY_REQUEST_LIMIT=30
PAGESPEED_CACHE_TTL_SECONDS=43200
ROBOTS_CACHE_TTL_SECONDS=3600
SITEMAP_CACHE_TTL_SECONDS=21600
```

`keep_vars: true` membantu mempertahankan variable dashboard ketika deployment berikutnya tidak mendefinisikannya ulang.

## 7. Uji staging Worker

Buka:

```text
https://auditicle-v4.<subdomain>.workers.dev/api/health
```

Hasil yang diharapkan:

```json
{
  "status": "ok",
  "version": "4.8.0",
  "architecture": "single-worker",
  "renderedBrowser": true
}
```

Periksa juga `/api/public-config`. Endpoint tersebut boleh menampilkan nama provider aktif dan limit, tetapi tidak boleh menampilkan secret.

### Proteksi staging

Pada hostname selain `auditicle.site`:

- halaman HTML mengirim `X-Robots-Tag: noindex, nofollow`;
- `/robots.txt` mengirim `Disallow: /`.

Jangan submit URL `workers.dev` ke Search Console dan jangan menautkannya secara publik.

### Tes fungsional staging

- Dark, Light, System.
- Homepage menampilkan content meskipun JavaScript dinonaktifkan.
- Delapan clean URL landing pages terbuka.
- Benchmark page menunjukkan `0 of 1,000` dan tidak menampilkan statistik palsu.
- Turnstile selesai.
- Audit Auto berhasil.
- Server HTML mode berhasil.
- Rendered mode berhasil atau memberi server fallback spesifik.
- TXT, JSON, Print/PDF.
- JSON tidak berisi raw HTML.
- Satu AI narrative dan satu translation per session.
- Donation membuka SociaBuzz.

## 8. Hubungkan custom domain

Jika domain masih terhubung ke Pages/Worker lama, lepaskan custom domain dari aplikasi lama terlebih dahulu tanpa menghapus zone atau Email Routing.

Worker `auditicle-v4` → Settings → Domains & Routes → Add Custom Domain:

```text
auditicle.site
www.auditicle.site
```

Source mengalihkan `www` ke apex secara permanen sambil mempertahankan path dan query.

Verifikasi:

```text
https://auditicle.site/api/health
https://auditicle.site/
https://auditicle.site/article-seo-checker
https://auditicle.site/article-readiness-benchmark-2026
https://auditicle.site/robots.txt
https://auditicle.site/sitemap.xml
```

Pada production host, halaman tidak boleh mengirim `X-Robots-Tag: noindex` dan robots harus mengizinkan public pages serta memblokir `/api/`.

## 9. Email Routing

Cloudflare zone → Email → Email Routing:

1. Verifikasi Gmail tujuan.
2. Buat `hello@auditicle.site`.
3. Forward ke Gmail tujuan.
4. Kirim email uji dari akun lain.

Jangan menghapus MX/TXT Email Routing saat membersihkan aplikasi lama.

## 10. Web Analytics

Cloudflare → Web Analytics → Add site → `auditicle.site`.

Pastikan CSP tetap mengizinkan Cloudflare Insights. Source sudah memasukkan endpoint yang dibutuhkan. Periksa page view setelah beberapa kunjungan produksi.

## 11. Google Search Console

Gunakan Domain Property `auditicle.site`.

### Submit sitemap

Submit:

```text
https://auditicle.site/sitemap.xml
```

### URL Inspection

Periksa dan, bila perlu, request indexing untuk:

```text
https://auditicle.site/
https://auditicle.site/features.html
https://auditicle.site/methodology.html
https://auditicle.site/free-article-seo-audit-tool
https://auditicle.site/article-seo-checker
https://auditicle.site/technical-seo-article-audit
https://auditicle.site/geo-readiness-audit
https://auditicle.site/aeo-readiness-checker
https://auditicle.site/rag-retrieval-readiness
https://auditicle.site/ai-citation-readiness-checker
https://auditicle.site/rendered-html-seo-audit
https://auditicle.site/article-readiness-benchmark-2026
```

URL Inspection dan sitemap submission memerlukan akses akun Search Console dan tidak dilakukan oleh source code.

## 12. Core Web Vitals setelah live

Setelah production aktif:

1. Jalankan PageSpeed Insights untuk homepage pada mobile dan desktop.
2. Catat LCP, INP, CLS, TTFB, dan blocking work.
3. Periksa Search Console → Core Web Vitals setelah field data tersedia.
4. Uji landing page terberat dan homepage.
5. Jangan menganggap satu lab test sebagai field performance final.

Homepage awal sekarang berisi content HTML sebelum React. Bundle interaktif tetap diperlukan untuk menjalankan audit.

## 13. Sitemap dan lastmod

`scripts/generate-static-pages.mjs` memakai `lastmod` eksplisit. Jangan menggantinya dengan tanggal build otomatis.

Ketika satu halaman berubah secara material:

1. perbarui `lastmod` halaman tersebut;
2. perbarui `updatedDisplay` bila ada;
3. regenerate dengan `npm run pages:generate`;
4. commit perubahan.

Jangan mengubah seluruh sitemap hanya karena redeploy.

## 14. Benchmark 2026

Saat mengumpulkan penelitian:

1. Baca `public/data/benchmark-methodology-2026.md`.
2. Gunakan ID non-identifying.
3. Jangan menyimpan URL, hostname, raw HTML, article text, IP, personal data, atau credential di `benchmark/input/`.
4. Masukkan JSON tervalidasi.
5. Jalankan `npm run benchmark:aggregate`.
6. Review output di `public/data/`.
7. Jangan ubah `resultsPublished` menjadi true sebelum 1.000 record selesai, duplicate review selesai, exclusion log selesai, dan metodologi final dibekukan.

## 15. Memantau Free tier

Pantau Cloudflare Observability dan provider dashboards untuk:

- Error 1102/CPU.
- External subrequest limit.
- Browser rendering 429/allowance.
- PageSpeed quota.
- AI provider 429.
- Global audit quota.

Saat browser budget habis, source tetap memakai server HTML dan memberi status provisional bila rendering diperlukan.

Bila CPU/subrequest limit sering tercapai atau pengguna aktif meningkat, pindah ke Workers Paid dan naikkan batas secara bertahap—jangan menghapus abuse controls sekaligus.

## 16. ads.txt

Biarkan placeholder aman sampai AdSense memberi seller line resmi. Setelah menerima publisher ID asli, edit `public/ads.txt`, commit, lalu periksa:

```text
https://auditicle.site/ads.txt
```

## 17. Final production checklist

- [ ] Build GitHub sukses.
- [ ] `/api/health` menunjukkan `4.8.0`.
- [ ] Durable Object migration sukses.
- [ ] Turnstile site key dan secret benar.
- [ ] Production HTML tidak noindex.
- [ ] Staging hostname noindex dan disallow-all.
- [ ] Homepage readable tanpa JavaScript.
- [ ] Canonical semua halaman memakai `auditicle.site`.
- [ ] Favicon dan OG image tampil.
- [ ] Delapan landing pages terbuka.
- [ ] Benchmark masih jujur sesuai sample aktual.
- [ ] Auto audit, server audit, dan rendered/fallback diuji.
- [ ] Caching terlihat pada audit ulang sesuai timestamp/status.
- [ ] Per-IP dan global quotas diuji.
- [ ] AI provider fallback diuji.
- [ ] Translation tidak mixed-language.
- [ ] Search Console sitemap submitted.
- [ ] URL Inspection dilakukan.
- [ ] Core Web Vitals diuji setelah live.
- [ ] Email Routing dan Analytics berfungsi.

## 18. Rollback

Cloudflare → Worker → Deployments/Versions → pilih versi sehat → Rollback.

Atau revert commit GitHub di branch `main`; Git integration akan membangun ulang. Setelah rollback, periksa `/api/health`, homepage, dan satu audit.

## 19. Menghapus aplikasi lama

Setelah V4.8 stabil:

- hapus Worker API lama;
- hapus Pages project lama;
- hapus route/API subdomain lama;
- arsipkan repository lama;
- hapus secret lama yang tidak digunakan.

Jangan hapus zone domain, MX/TXT email, Search Console property, Turnstile production widget, Web Analytics, atau secret yang dipakai Worker V4.8.
