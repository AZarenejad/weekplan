import type { AppState } from '@weekplan/shared';

/** Swap this interface's implementation (REST API, IndexedDB, file…) without touching the UI. */
export interface Repository {
  load(): AppState | null;
  save(state: AppState): void;
}

export class LocalStorageRepository implements Repository {
  constructor(private key = 'weekplan.v1', private store: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {}

  load(): AppState | null {
    try {
      const raw = this.store.getItem(this.key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return Array.isArray(data?.tasks) && Array.isArray(data?.goals) ? data : null;
    } catch {
      return null;
    }
  }

  save(state: AppState): void {
    this.store.setItem(this.key, JSON.stringify(state));
  }
}
