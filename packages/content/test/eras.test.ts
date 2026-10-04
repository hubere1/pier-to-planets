import { describe, expect, it } from 'vitest';
import { ERA_IDS } from '../src/index.ts';

describe('ERA_IDS (docs/03 §5)', () => {
  it('enthält die sechs Ären in fester Reihenfolge', () => {
    expect(ERA_IDS).toEqual(['harbor', 'airport', 'rocket', 'moon', 'mars', 'belt']);
  });
});
