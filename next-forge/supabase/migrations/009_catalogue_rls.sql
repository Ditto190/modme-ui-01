-- Enable RLS on catalogue tables
ALTER TABLE "catalogue_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalogue_popularity_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eval_catalogue_scores" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role has full access to catalogue_items" ON "catalogue_items";
DROP POLICY IF EXISTS "Public can view published catalogue_items" ON "catalogue_items";
DROP POLICY IF EXISTS "Service role has full access to catalogue_popularity_snapshots" ON "catalogue_popularity_snapshots";
DROP POLICY IF EXISTS "Public can view popularity_snapshots" ON "catalogue_popularity_snapshots";
DROP POLICY IF EXISTS "Service role has full access to eval_catalogue_scores" ON "eval_catalogue_scores";
DROP POLICY IF EXISTS "Public can view eval_scores" ON "eval_catalogue_scores";

-- Create Policies for catalogue_items
CREATE POLICY "Service role has full access to catalogue_items"
ON "catalogue_items"
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view published catalogue_items"
ON "catalogue_items"
AS PERMISSIVE FOR SELECT
TO public
USING (status = 'published');

-- Create Policies for catalogue_popularity_snapshots
CREATE POLICY "Service role has full access to catalogue_popularity_snapshots"
ON "catalogue_popularity_snapshots"
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view popularity_snapshots"
ON "catalogue_popularity_snapshots"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Create Policies for eval_catalogue_scores
CREATE POLICY "Service role has full access to eval_catalogue_scores"
ON "eval_catalogue_scores"
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view eval_scores"
ON "eval_catalogue_scores"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
