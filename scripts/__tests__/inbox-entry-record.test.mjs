import { describe, it, expect } from 'vitest';
import { validateEntryRecord } from '../lib/inbox-contract.mjs';
import { loadContract } from '../lib/inbox-contract.mjs';

describe('inbox entry record validation', () => {
  const contract = loadContract();

  it('passes valid row', () => {
    const findings = validateEntryRecord(
      {
        id: '00000000-0000-4000-8000-000000000001',
        content_hash: 'a'.repeat(64),
        source_file: 'test.md',
        status: 'indexed',
      },
      contract
    );
    expect(findings).toHaveLength(0);
  });

  it('flags invalid status', () => {
    const findings = validateEntryRecord(
      {
        id: '00000000-0000-4000-8000-000000000001',
        content_hash: 'a'.repeat(64),
        source_file: 'test.md',
        status: 'pending',
      },
      contract
    );
    expect(findings.some((f) => f.code === 'INBOX.DB.INVALID_STATUS')).toBe(true);
  });

  it('flags embedding dimension mismatch', () => {
    const findings = validateEntryRecord(
      {
        id: 'x',
        content_hash: 'a'.repeat(64),
        source_file: 'test.md',
        status: 'indexed',
        embedding: new Array(256).fill(0),
      },
      contract
    );
    expect(findings.some((f) => f.code === 'INBOX.DB.DIM_MISMATCH')).toBe(true);
  });
});
