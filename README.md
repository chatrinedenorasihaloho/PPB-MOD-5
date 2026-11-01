# Bore & Barrel

A dummy gunshop storefront built as a Progressive Web App. It runs offline
with an app shell, a web app manifest, and a service worker, and uses React +
Vite + Tailwind CSS.

## Setup

```bash
npm install
npm run dev      # dev server with HMR
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Supabase data migrations

Product archiving requires the `archived_at` column on `public.products`.
Apply `supabase/migrations/20261101000000_add_product_archiving.sql` to the
Supabase project before using the catalog archive. Active catalog queries
exclude archived products; the archive view supports restoring them or
permanently deleting them.

Product galleries require the `image_urls` text array on `public.products`.
Apply `supabase/migrations/20261101000002_add_product_image_gallery.sql` to
Supabase. The migration copies existing `image_url` values into the gallery.
For the non-Supabase REST API, the product endpoints must also accept and return
`image_urls`.

Review voting requires `public.review_votes`; apply
`supabase/migrations/20261101000001_add_review_votes.sql`. Review authors can
edit or delete their own reviews, and each browser identity can change or
remove its vote. The app uses anonymous client-generated identities rather
than authenticated accounts, so vote identity is not fraud-proof.

Product inquiry buttons open WhatsApp using the seller number configured in
`src/config/contact.js`.

## Structure

```
.
├── index.html              # HTML shell
├── vite.config.js          # Vite + vite-plugin-pwa (manifest + service worker)
├── public/                 # static assets served at /
│   ├── icon-192.png / icon-512.png / icon.svg
│   └── guns/               # product images
└── src/
    ├── main.jsx            # entry, mounts <App/>
    ├── App.jsx             # app shell: tab state, header/nav/content/footer
    ├── App.css             # app shell styles
    ├── index.css           # global styles
    ├── components/
    │   ├── Header.jsx      # brand + nav
    │   ├── GunCard.jsx     # single product card
    │   └── Footer.jsx
    ├── data/
    │   └── guns.js         # dummy product data
    └── pages/
        ├── Catalog.jsx     # product grid
        ├── About.jsx
        └── Contact.jsx
```
