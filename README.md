# OTRYK

Portfolio / studio site: Next.js 14, three.js, canvas particles.

```bash
npm install
npm run dev      # http://localhost:3000  (add ?step for deterministic time in tests)
npm run build && npm start
```

- `app/` – page and layout
- `components/` – sections, cursor, background objects, demos (`demos/`)
- `lib/` – themes, stores, particle targets, sound
- `public/` – models, certificates, audio, images
- `scripts/bake-models.py` – bakes GLB sources (kept one level up in `../source-assets`) into `public/models`

## Deploy (GitHub -> Cloudflare Pages)

Static export (`output: 'export'`). In Cloudflare Pages: connect the GitHub repo, framework preset **Next.js (Static HTML Export)**,
build command `npm run build`, output directory `out`, env `NODE_VERSION=20`. Result: https://curoyo.pages.dev
(set `NEXT_PUBLIC_SITE_URL` if the domain changes; SEO tags, sitemap and structured data follow it).
After deploy: add the site in Google Search Console, submit `/sitemap.xml`, request indexing.
