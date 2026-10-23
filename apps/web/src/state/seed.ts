import { addDays, startOfWeek, todayIso } from '@weekplan/shared';
import type { AppState } from '@weekplan/shared';

/** Example data for first launch. Edit freely. */
export function seed(): AppState {
  const w = startOfWeek(todayIso());
  return {
    goals: [
      { id: 'g1', title: 'Fix IP reassembly', category: 'work' },
      { id: 'g2', title: 'Geolocation', category: 'work' },
    ],
    tasks: [
      { id: 't1', title: 'Gam meeting', category: 'team', date: addDays(w, 2), time: '10:00', done: false, recurrence: { freq: 'weekly', interval: 1 }, overrides: {} },
      { id: 't2', title: 'Gym', category: 'personal', date: addDays(w, 1), time: '18:00', done: false, recurrence: { freq: 'weekly', interval: 1 }, overrides: {} },
      { id: 't3', title: 'Review ICMP quality', category: 'work', date: addDays(w, 3), done: false, overrides: {}, goalId: 'g1' },
      { id: 't4', title: 'Check buffer chain', category: 'work', date: addDays(w, 4), done: false, overrides: {}, goalId: 'g1' },
      { id: 't5', title: 'Pool', category: 'personal', date: addDays(w, 3), time: '19:00', done: false, recurrence: { freq: 'weekly', interval: 1 }, overrides: {} },
      { id: 't6', title: 'Learn eBPF basics', category: 'learning', date: null, done: false, overrides: {} },
      { id: 't7', title: 'Geolocation DB comparison', category: 'work', date: null, done: false, overrides: {}, goalId: 'g2' },
      { id: 't8', title: 'Book dentist', category: 'personal', date: null, done: false, overrides: {} },
    ],
  };
}
