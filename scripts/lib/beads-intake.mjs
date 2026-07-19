/**
 * @deprecated Import from ./beads-hooks.mjs — thin re-export for scrape/intake callers.
 */
export {
  beadsCreateScrapeIssue,
  beadsCreateSchemaDrift as beadsCreateSchemaDriftIssue,
  beadsMarkBlocked,
  beadsClose as beadsMarkDone,
  tryBeads,
  beadsCreate,
  beadsClaim,
  beadsClose,
  beadsStartPipelineRun,
  beadsFinishPipelineRun,
} from "./beads-hooks.mjs";
