-- Seed data for CASfolio sample portfolio (Step 3)
-- Provides a deterministic portfolio for integration tests and staging QA

INSERT INTO public.users (id, email, display_name, cas_settings, hero_image_path, hero_image_checksum, hero_image_updated_at)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'casfolio.student@example.com',
  'CASfolio Student',
  jsonb_build_object(
    'content', jsonb_build_object(
      'hero_title', 'CASfolio Launchpad',
      'hero_subtitle', 'Creativity · Activity · Service',
      'hero_description', 'Preloaded showcase enabling QA and demo scenarios.'
    ),
    'layout', jsonb_build_object('order', ARRAY['hero', 'activities', 'reflections'], 'visibility', jsonb_build_object('hero', true, 'activities', true, 'reflections', true)),
    'theme', jsonb_build_object('primary', '#4F46E5', 'secondary', '#10B981', 'accent', '#F59E0B', 'dark', false),
    'customSections', jsonb_build_array(
      jsonb_build_object('id', 'values', 'title', 'Core Values', 'body', 'Respect · Integrity · Global Citizenship')
    )
  ),
  NULL,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    cas_settings = EXCLUDED.cas_settings;

INSERT INTO public.activities (
  id,
  student_id,
  title,
  description,
  category,
  status,
  start_date,
  end_date,
  hours,
  learning_outcomes,
  header_image_path,
  header_image_checksum,
  header_image_updated_at
)
VALUES
  (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Digital Art Sprint',
    'Weekly creative sprint culminating in a digital art exhibition.',
    'creativity',
    'completed',
    DATE '2024-08-01',
    DATE '2024-09-30',
    18.75,
    ARRAY['Creative thinking', 'Reflection', 'Community engagement'],
    'seed/11111111-1111-4111-8111-111111111111/hero/art-sprint.jpg',
    NULL,
    timezone('utc', now())
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'Community Garden Build',
    'Collaborative weekend builds for a sustainable community garden.',
    'service',
    'ongoing',
    DATE '2024-09-15',
    NULL,
    24.5,
    ARRAY['Teamwork', 'Leadership', 'Sustainability'],
    'seed/11111111-1111-4111-8111-111111111111/hero/garden-build.jpg',
    NULL,
    timezone('utc', now())
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    hours = EXCLUDED.hours,
    learning_outcomes = EXCLUDED.learning_outcomes,
    header_image_path = EXCLUDED.header_image_path;

INSERT INTO public.activity_assets (
  id,
  activity_id,
  storage_path,
  mime_type,
  checksum,
  size_bytes
)
VALUES
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'seed/11111111-1111-4111-8111-111111111111/assets/art-sprint-reflection.pdf',
    'application/pdf',
    NULL,
    102400
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    '33333333-3333-4333-8333-333333333333',
    'seed/11111111-1111-4111-8111-111111111111/assets/garden-blueprint.png',
    'image/png',
    NULL,
    204800
  )
ON CONFLICT (id) DO UPDATE
SET storage_path = EXCLUDED.storage_path,
    mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes;
