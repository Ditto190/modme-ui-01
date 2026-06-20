-- Ensure UUID defaults for Prisma @id columns (db push does not always set Postgres defaults)

ALTER TABLE inbox_entries ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE entry_relations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE output_schemas ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE output_artefacts ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE inbox_entries ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE inbox_entries ALTER COLUMN updated_at SET DEFAULT now();
