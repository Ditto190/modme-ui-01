/**
 * Pre-ingest secret detection — blocks accidental capture of credentials in inbox files.
 */

const SECRET_PATTERNS = [
  { pattern: /sk_live_[a-zA-Z0-9]+/, name: 'stripe_live_key' },
  { pattern: /sk_test_[a-zA-Z0-9]+/, name: 'stripe_test_key' },
  { pattern: /sbp_[a-f0-9]{40,}/i, name: 'supabase_access_token' },
  { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, name: 'jwt_token' },
  {
    pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]{20,}['"]/,
    name: 'service_role_literal',
  },
  { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, name: 'private_key' },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/, name: 'github_pat' },
  { pattern: /gho_[a-zA-Z0-9]{36,}/, name: 'github_oauth' },
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'aws_access_key' },
];

/**
 * @param {string} content
 * @returns {{ name: string; match: string }[]}
 */
export function scanForSecrets(content) {
  const findings = [];
  for (const { pattern, name } of SECRET_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      findings.push({ name, match: `${match[0].slice(0, 8)}…` });
    }
  }
  return findings;
}
