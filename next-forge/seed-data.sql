-- Seed sample data into local Supabase
BEGIN;

DELETE FROM "Page";

INSERT INTO "Page" (name) VALUES
  ('Home'),
  ('About Us'),
  ('Features'),
  ('Pricing'),
  ('Documentation'),
  ('Contact');

COMMIT;
