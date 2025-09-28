Export Plan (Supabase Sync, URL Images)
======================================

Data Model Prep
---------------

- Create Supabase tables with a `user_id` foreign key and row level security:
  - `portfolio_profiles`
  - `portfolio_layouts`
  - `portfolio_themes`
  - `portfolio_contents`
  - `custom_sections`
  - `activities`
  - `reflections`
- Add string columns for external image references (`header_image_url`) and a dedicated field for the hero image payload (`hero_image_data` as Base64 or a storage object pointer).
- Provision a Supabase Storage bucket named `portfolio-hero` with RLS so authenticated users can upload their hero image and read it through signed URLs.

API Routes (Next.js)
--------------------

- `GET`/`PUT` `/api/profile/settings`: load and save `layout`, `theme`, `content`, and `customSections` JSON. Only the hero payload may contain binary data; all other image fields must be URLs.
- `GET`/`POST`/`PUT`/`DELETE` `/api/activities`: CRUD for activities (title, dates, hours, status, learning outcomes array, `header_image_url`). Validate the URL (HTTPS scheme, optional HEAD/size check) on mutations.
- `GET`/`POST`/`PUT`/`DELETE` `/api/reflections`: CRUD reflections linked to activities.
- `POST` `/api/hero-image`: accept a hero image upload, enforce rate limits and ~1 MB size cap, upload to Storage, and return the signed URL.

Client-Side Refactor
--------------------

- Replace the localStorage-only data stores in `public/script.js` with async fetches to the new APIs; cache results client-side for offline usage.
- Update `saveActivity()` so it only submits JSON with `header_image_url`, removing data URL handling while keeping URL previews.
- Modify the Customize panel (`public/customize.js`) so the hero image flow either uploads the file through `/api/hero-image` or accepts a manual URL, updating `remoteState.content.heroImageUrl` in both cases.
- Ensure every renderer (`renderGallery`, `openPhotosModal`, etc.) reads from `header_image_url` rather than embedded Base64 blobs.

Migration & Legacy Handling
---------------------------

- On first authenticated load, detect legacy `casfolio_*` localStorage entries and offer a migration wizard:
  1. Read local activities, reflections, and customization settings.
  2. Prompt for hosted URLs when legacy activities contain Base64 images; optionally upload the hero image via the new endpoint.
  3. Persist everything to Supabase through the new APIs, then clear local caches.
- Log skipped entries so users can fix invalid image URLs manually.

Validation & UX
---------------

- Client-side: enforce HTTPS-only URLs and basic sanitization to avoid script injection or broken layouts.
- Server-side: revalidate URL scheme, length, and forbid non-hero data URIs.
- Display placeholders and warnings when image URLs fail to load so users know to update them.

Testing & Monitoring
--------------------

- Add unit and integration tests for the new API handlers, covering RLS, URL validation, and hero upload logic.
- Extend front-end tests to cover activity creation with URLs, hero upload, and cross-device sync paths.
- Track Supabase metrics (Storage, database size, bandwidth); expect minimal growth outside hero uploads due to URL-based media.

Documentation
-------------

- Update README and in-app help with image hosting requirements, recommended services, size guidelines, and migration instructions.
