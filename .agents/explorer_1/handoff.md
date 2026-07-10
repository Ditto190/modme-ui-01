# Handoff Report: Telemetry Ingestor Strategy

## 1. Observation
- `SCOPE.md` specifies building `telemetry-ingestor.ts` that normalizes and writes raw events to the database via Prisma (`@repo/database`), implementing the `TelemetryPayload` interface and `ingestTelemetry` function.
- `supabase-catalogue-fetcher.ts` uses an `isObjectRecord` type guard (`typeof value === 'object' && value !== null`) to validate data shapes dynamically.
- The `TelemetryEvent` Prisma model uses a `Json` type for `metadata` (defaulting to `"{}"`) and includes an optional foreign key `categoryId` referencing `TelemetryCategory`. 

## 2. Logic Chain
- **Safe Type-Checking (`metadata`)**: Since Prisma `Json` types require valid json objects and can throw errors if they encounter `undefined` properties, our `isObjectRecord` must be strict. We should check `typeof val === 'object' && val !== null && !Array.isArray(val)`. Any valid `metadata` should be sanitized (e.g., via `JSON.parse(JSON.stringify(metadata))`) before queueing, to prevent Prisma serialization crashes on unsupported types like `undefined` or `Functions`.
- **Batching & Queueing**: Calling `createMany` for each event individually is inefficient. We must use an in-memory queue that triggers a `flush()` on a size threshold or interval. To prevent race conditions, a mutex or boolean lock (`isFlushing`) must wrap the flush routine.
- **Batch Insertion Edge Cases (Prisma & Postgres)**:
  - **Parameter Limits**: PostgreSQL limits queries to 65,535 parameters. With ~6 mapped fields per `TelemetryEvent`, the max theoretical batch size is ~10,000. We must explicitly chunk the queue into sizes of 1,000 to 5,000 during `createMany`.
  - **Foreign Key Violations**: `createMany` is atomic. If a single payload has a `categoryId` that does not exist, the entire batch fails. We should wrap `createMany` in a `try/catch`. On failure, the ingestor should fallback to individual `create` calls (or drop the invalid records) to ensure valid telemetry events are not lost due to one malformed record.

## 3. Caveats
- Using an in-memory queue entails data loss if the Node process crashes before flushing.
- Parsing and stringifying JSON for deep sanitization is a performance overhead on very large payloads; this assumes `metadata` payloads are relatively small.
- We rely on `createMany` transaction failures to detect invalid `categoryId` references to save an extra lookup query on the hot-path. 

## 4. Conclusion
We must implement `telemetry-ingestor.ts` using an in-memory queue that enforces a strict `!Array.isArray` object guard and `JSON` sanitization for `metadata`. The ingestor will asynchronously chunk payloads into batches of 1,000 for `prisma.telemetryEvent.createMany()`. It will lock during flushes to prevent concurrency issues, and must feature a fallback to row-by-row insertion when a batch transaction fails due to foreign key violations.

## 5. Verification Method
1. Inspect `telemetry-ingestor.ts` to ensure batch chunking sizes are explicit (e.g. `<= 5000`) and the `isObjectRecord` function rejects arrays and primitives.
2. Verify test files simulate foreign key violations in batch mode and successfully fallback to individual inserts for the remaining valid rows.
3. Validate by running `yarn test` inside `next-forge/packages/observability` and observing the database state after invoking `ingestTelemetry` rapidly >10,000 times.
