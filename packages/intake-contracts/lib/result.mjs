/**
 * Standard stage validation result — safeParse wrapper.
 * @typedef {{ ok: true, data: T }} ValidationOk
 * @typedef {{ ok: false, issues: import('zod').ZodIssue[] }} ValidationErr
 * @template T
 * @typedef {ValidationOk<T> | ValidationErr} ValidationResult
 */

/**
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {ValidationResult<T>}
 */
export function safeValidate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, issues: result.error.issues };
}

/**
 * @param {import('zod').ZodIssue[]} issues
 * @returns {string}
 */
export function formatZodIssues(issues) {
  return issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
}
