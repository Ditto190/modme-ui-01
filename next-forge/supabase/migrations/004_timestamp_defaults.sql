-- Timestamp defaults for direct REST inserts (Prisma db push omits these on some columns)

ALTER TABLE inbox_entries ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE inbox_entries ALTER COLUMN updated_at SET DEFAULT now();
