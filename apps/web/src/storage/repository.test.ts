import { describe, expect, it } from 'vitest';
import { LocalStorageRepository } from './repository';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('LocalStorageRepository', () => {
  it('round-trips state', () => {
    const repo = new LocalStorageRepository('k', memory());
    repo.save({ tasks: [], goals: [] });
    expect(repo.load()).toEqual({ tasks: [], goals: [] });
  });
  it('returns null on corrupt data', () => {
    const s = memory();
    s.setItem('k', '{oops');
    expect(new LocalStorageRepository('k', s).load()).toBeNull();
  });
});
