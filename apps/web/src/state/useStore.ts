import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { AppState } from '@weekplan/shared';
import type { Gateway } from '../storage/gateways';
import { reducer, type Action } from './reducer';

const EMPTY: AppState = { tasks: [], goals: [] };

/** Optimistic updates: reduce locally first, persist via the gateway, re-sync from it on failure. */
export function useStore(gateway: Gateway) {
  const [state, rawDispatch] = useReducer(reducer, EMPTY);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const current = useRef(state);

  const reload = useCallback(() => {
    gateway.load().then(
      (s) => { current.current = s; rawDispatch({ type: 'replace', state: s }); setStatus('ready'); },
      () => setStatus('error'),
    );
  }, [gateway]);
  useEffect(reload, [reload]);

  const dispatch = useCallback((action: Action) => {
    const next = reducer(current.current, action);
    current.current = next;
    rawDispatch(action);
    gateway.apply(action, next).catch(reload);
  }, [gateway, reload]);

  return { state, dispatch, status };
}
