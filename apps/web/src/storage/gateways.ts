import type { AppState } from '@weekplan/shared';
import { seed } from '../state/seed';
import type { Action } from '../state/reducer';
import { LocalStorageRepository } from './repository';

/** Where state lives. The UI only knows this interface. */
export interface Gateway {
  load(): Promise<AppState>;
  /** `next` is the already-reduced state (optimistic). Reject to make the UI re-sync. */
  apply(action: Action, next: AppState): Promise<void>;
}

/** Offline mode: whole state in localStorage. */
export class LocalGateway implements Gateway {
  constructor(private repo = new LocalStorageRepository()) {}
  async load() { return this.repo.load() ?? seed(); }
  async apply(_: Action, next: AppState) { this.repo.save(next); }
}

/** Server mode: maps each UI action to one REST call. */
export class ApiGateway implements Gateway {
  constructor(private base: string) {}

  private async req(method: string, path: string, body?: unknown) {
    const token = localStorage.getItem('weekplan.token');
    const res = await fetch(this.base + path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  load(): Promise<AppState> { return this.req('GET', '/state'); }

  async apply(a: Action): Promise<void> {
    switch (a.type) {
      case 'upsertPerson': await this.req('PUT', `/people/${a.person.id}`, a.person); break;
      case 'deletePerson': await this.req('DELETE', `/people/${a.id}`); break;
      case 'upsertOneOnOne': await this.req('PUT', `/one-on-ones/${a.meeting.id}`, a.meeting); break;
      case 'deleteOneOnOne': await this.req('DELETE', `/one-on-ones/${a.id}`); break;
      case 'addTask': await this.req('POST', '/tasks', a.task); break;
      case 'updateTask': await this.req('PUT', `/tasks/${a.task.id}`, a.task); break;
      case 'removeTask': await this.req('DELETE', `/tasks/${a.id}`); break;
      case 'setTaskStatus': await this.req('PATCH', `/tasks/${a.id}/status`, { status: a.status }); break;
      case 'toggleDone': await this.req('POST', `/tasks/${a.id}/toggle`); break;
      case 'moveOccurrence': await this.req('POST', `/tasks/${a.id}/move`, { originalDate: a.originalDate || undefined, to: a.to }); break;
      case 'endSeries': await this.req('POST', `/tasks/${a.id}/end`, { until: a.until }); break;
      case 'addGoal': await this.req('POST', '/goals', a.goal); break;
      case 'updateGoal': await this.req('PUT', `/goals/${a.goal.id}`, a.goal); break;
      case 'removeGoal': await this.req('DELETE', `/goals/${a.id}`); break;
      case 'replace': break;
    }
  }
}

export const createGateway = (): Gateway =>
  import.meta.env.VITE_API_URL ? new ApiGateway(import.meta.env.VITE_API_URL) : new LocalGateway();
