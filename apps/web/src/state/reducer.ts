import { endSeries, moveTask, toggleTask, setStatus, type AppState, type Goal, type Task, type TeamMember, type OneOnOne } from '@weekplan/shared';

export type Action =
  | { type: 'replace'; state: AppState }
  | { type: 'upsertPerson'; person: TeamMember }
  | { type: 'deletePerson'; id: string }
  | { type: 'upsertOneOnOne'; meeting: OneOnOne }
  | { type: 'deleteOneOnOne'; id: string }
  | { type: 'addTask'; task: Task }
  | { type: 'updateTask'; task: Task }
  | { type: 'removeTask'; id: string }
  | { type: 'toggleDone'; id: string }
  | { type: 'setTaskStatus'; id: string; status: 'todo' | 'doing' | 'done' }
  /** `originalDate` is '' for unscheduled tasks; `to: null` sends a one-off task back to the backlog. */
  | { type: 'moveOccurrence'; id: string; originalDate: string; to: string | null }
  | { type: 'endSeries'; id: string; until: string }
  | { type: 'addGoal'; goal: Goal }
  | { type: 'updateGoal'; goal: Goal }
  | { type: 'removeGoal'; id: string };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'replace':
      return action.state;
    case 'upsertPerson': return { ...state, people: [...(state.people ?? []).filter(p => p.id !== action.person.id), action.person] };
    case 'deletePerson': return { ...state, people: (state.people ?? []).filter(p => p.id !== action.id), oneOnOnes: (state.oneOnOnes ?? []).filter(m => m.personId !== action.id), tasks: state.tasks.map(t => t.assigneeId === action.id ? {...t, assigneeId: undefined} : t) };
    case 'upsertOneOnOne': return { ...state, oneOnOnes: [...(state.oneOnOnes ?? []).filter(m => m.id !== action.meeting.id), action.meeting] };
    case 'deleteOneOnOne': return { ...state, oneOnOnes: (state.oneOnOnes ?? []).filter(m => m.id !== action.id) };
    case 'addTask':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'updateTask':
      return { ...state, tasks: state.tasks.map(t => t.id === action.task.id ? action.task : t) };
    case 'removeTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'setTaskStatus':
      return mapTask(state, action.id, t => setStatus(t, action.status, new Date().toISOString().slice(0, 10)));
    case 'toggleDone':
      return mapTask(state, action.id, toggleTask);
    case 'moveOccurrence':
      return mapTask(state, action.id, (t) => moveTask(t, action.originalDate || undefined, action.to));
    case 'endSeries':
      return mapTask(state, action.id, (t) => endSeries(t, action.until));
    case 'addGoal':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'updateGoal':
      return { ...state, goals: state.goals.map(g => g.id === action.goal.id ? action.goal : g) };
    case 'removeGoal':
      return {
        goals: state.goals.filter((g) => g.id !== action.id),
        tasks: state.tasks.map((t) => (t.goalId === action.id ? { ...t, goalId: undefined } : t)),
      };
  }
}

const mapTask = (s: AppState, id: string, fn: (t: Task) => Task): AppState => ({
  ...s,
  tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)),
});
