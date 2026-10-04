import { describe, expect, it } from 'vitest';
import { SAVE_SCHEMA_VERSION } from '../src/index.ts';

describe('sim package', () => {
  it('exportiert die Save-Schema-Version als Ganzzahl ≥ 0', () => {
    expect(Number.isInteger(SAVE_SCHEMA_VERSION)).toBe(true);
    expect(SAVE_SCHEMA_VERSION).toBeGreaterThanOrEqual(0);
  });
});
