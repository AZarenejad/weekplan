import { useDroppable } from '@dnd-kit/core';
import { useState, type CSSProperties, type Dispatch, type FormEvent } from 'react';
import type { Category, Task } from '@weekplan/shared';
import type { Action } from '../state/reducer';
import { CATEGORIES, CATEGORY_KEYS } from './categories';
import { newId } from './id';
import { S } from './strings';
import { TaskChip } from './TaskChip';

interface Props { tasks: Task[]; category: Category; setCategory: (c: Category) => void; dispatch: Dispatch<Action>; onEdit?: (task: Task) => void }

/** Unscheduled one-off tasks. Drop a task here to unschedule it; drag one out onto a day to schedule it. */
export function Backlog({ tasks, category, setCategory, dispatch, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog' });
  const [title, setTitle] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    dispatch({ type: 'addTask', task: { id: newId(), title: title.trim(), category, date: null, done: false, status: 'todo', overrides: {} } });
    setTitle('');
  };

  return (
    <section ref={setNodeRef} className={`panel backlog${isOver ? ' over' : ''}`} aria-label={S.backlog}>
      <h2>{S.backlog}</h2>
      <form onSubmit={submit} className="quick">
        <div className="pills" role="group" aria-label={S.category}>
          {CATEGORY_KEYS.map((c) => (
            <button type="button" key={c} className="pill" aria-pressed={category === c} style={{ '--c': CATEGORIES[c].color } as CSSProperties} onClick={() => setCategory(c)}>
              {CATEGORIES[c].label}
            </button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={S.quickAdd} aria-label={S.quickAdd} />
      </form>
      {tasks.length === 0 && <p className="empty">{S.backlogEmpty}</p>}
      {CATEGORY_KEYS.map((c) => {
        const group = tasks.filter((t) => t.category === c);
        return group.length === 0 ? null : (
          <div key={c} className="group" style={{ '--c': CATEGORIES[c].color } as CSSProperties}>
            <h3>{CATEGORIES[c].label}</h3>
            {group.map((t) => <TaskChip key={t.id} task={t} originalDate="" date={null} dispatch={dispatch} onEdit={onEdit} />)}
          </div>
        );
      })}
      <p className="hint">{S.backlogHint}</p>
    </section>
  );
}
