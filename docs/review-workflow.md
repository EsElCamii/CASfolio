# CASfolio Review Workflow

## Student + Teacher data flow
- Student activities live in `cas_activities` (existing table from the portfolio API).
- Review metadata is stored in a dedicated `cas_activity_reviews` table so both the student UI (`public/index.html`) and the admin portal (`public/admin.html`) can read/write the same records.
- When students are offline, review flags/notes are saved in `localStorage` and mirrored to Supabase as soon as the device reconnects. Any rows that could not be pushed are queued in `casfolio_review_sync_queue` and retried automatically on the next load.

### Suggested Supabase schema
```sql
create table public.cas_activity_reviews (
    activity_id uuid primary key references public.cas_activities (id) on delete cascade,
    activity_title text,
    student_name text,
    review_flag text not null default 'none' check (review_flag in ('none','pending_review','pending_verification')),
    review_notes text,
    teacher_decision text not null default 'pending' check (teacher_decision in ('pending','approved','rejected')),
    teacher_notes text,
    review_updated_at timestamptz not null default now()
);

create table public.admin_credentials (
    username text primary key,
    password_hash text not null
);

-- RPC used by admin.js so the password hash comparison happens server-side
create or replace function public.verify_admin_password(p_username text, p_plain_password text)
returns table(is_valid boolean) language plpgsql security definer as $$
declare
    stored_hash text;
begin
    select password_hash into stored_hash from public.admin_credentials where username = p_username;
    if stored_hash is null then
        return query select false;
    end if;
    return query select crypt(p_plain_password, stored_hash) = stored_hash;
end;
$$;
```
> Tip: expose only the RPC and `select` access on `cas_activity_reviews` to authenticated users; `admin.html` never hardcodes credentials.

### Sample data seed
```sql
insert into public.cas_activity_reviews (activity_id, activity_title, student_name, review_flag, review_notes, teacher_decision, teacher_notes)
values
    ('00000000-0000-0000-0000-000000000001', 'Noordwijk Shoreline Clean-Up', 'Juan Fernandez Herrera', 'pending_verification', 'Documentation ready for coordinator sign-off.', 'approved', 'Approved — excellent leadership and impact photos.'),
    ('00000000-0000-0000-0000-000000000002', 'CAS Jazz Collective Rehearsal', 'Juan Fernandez Herrera', 'pending_review', 'Ready for first review.', 'pending', null),
    ('00000000-0000-0000-0000-000000000003', 'Noordwijk Cycle Tour', 'Juan Fernandez Herrera', 'pending_review', 'Please double-check safety reflection.', 'rejected', 'Needs more detail on risk management before approval.');

insert into public.admin_credentials (username, password_hash)
values ('coordinator@school.edu', crypt('Sup3rSecure!', gen_salt('bf')))
on conflict (username) do update set password_hash = excluded.password_hash;
```
Replace the UUIDs above with the real activity IDs returned by your Supabase project.

## Running the student site
1. Install dependencies and start the dev server: `npm install && npm run dev`.
2. Visit `http://localhost:3000` (or the port printed in the terminal). `public/index.html` loads `@supabase/supabase-js@2` and initializes the client with `window.__SUPABASE_URL__` and `window.__SUPABASE_ANON_KEY__` if you provide them before `script.js` runs.
3. Open the “Add Activity” modal to set a flag (`Pending Review` or `Pending Verification`), leave a note for the teacher, and save. The UI immediately mirrors the flag/teacher status in the dashboard, timeline, and detail modal.
4. If Supabase is unreachable the flag is cached in `localStorage` and synced later (see console warning: “Pending review requests will sync when Supabase is reachable”).

## Using the admin portal
1. After starting the dev server open `http://localhost:3000/admin.html`.
2. Log in with the `admin_credentials` record you inserted in Supabase. Passwords are validated by the `verify_admin_password` RPC; no secrets are embedded in the client.
3. The dashboard lists every row from `cas_activity_reviews` with the latest flag, decision, and teacher notes. Add/adjust notes per activity and click **Approve** or **Reject**.
4. The buttons call Supabase `.upsert` so the shared review row updates instantly. Use **Refresh** to re-fetch the queue if multiple coordinators are online.

## Verifying student ↔ teacher sync
1. On the student page set an activity to “Pending Review” and save.
2. Open the admin portal, refresh, and confirm the activity appears with the same flag and student note.
3. Approve or reject the activity from the admin table and include coordinator feedback.
4. Refresh the student page (or reopen the activity detail modal) and note that the decision + teacher note are displayed in the new “Review Workflow” card and the timeline/tile badges.

This workflow ensures that every request/decision is persisted in Supabase, administrators authenticate securely, and the UI keeps working even when students draft submissions offline.
