import { useDraggable } from '@dnd-kit/core';
import { useEffect, useRef, type CSSProperties, type Dispatch, type MouseEvent } from 'react';
import { todayIso } from '@weekplan/shared';
import type { Task } from '@weekplan/shared';
import type { Action } from '../state/reducer';
import { CATEGORIES } from './categories';
import { S } from './strings';

export interface DragData { taskId: string; originalDate: string; date: string | null; recurring: boolean }

interface BodyProps { task: Task; originalDate: string; dispatch?: Dispatch<Action>; onEdit?: (task: Task) => void }

/** Pure look of a task; used in cells, the backlog and the drag overlay (no dispatch = read-only). */
export function ChipBody({ task, originalDate, dispatch, onEdit }: BodyProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) menuRef.current.open = false; };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && menuRef.current) menuRef.current.open = false; };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  const status = task.status ?? (task.done ? 'done' : 'todo');
  const isLast = !!originalDate && task.recurrence?.until === originalDate;
  const run = (e: MouseEvent, action: Action) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    dispatch?.(action);
  };
  return (
    <div className={`task${status === 'done' ? ' done' : ''}`} style={{ '--c': CATEGORIES[task.category].color } as CSSProperties}>
      {dispatch && !task.recurrence && (
        <input type="checkbox" checked={task.done} aria-label={`${S.done}: ${task.title}`} onChange={() => dispatch({ type: 'toggleDone', id: task.id })} />
      )}
      {task.recurrence && <span className="rep" title={S.repeats} aria-label={S.repeats}>↻</span>}
      <span className="t">{task.title}</span>
      {status === 'doing' && <span className="status-indicator" title="در حال انجام" aria-label="در حال انجام">●</span>}
      {task.time && <time>{task.time}{task.endTime ? `–${task.endTime}` : ''}</time>}
      {task.deadline && <span className={`deadline${!task.done && task.deadline < todayIso() ? ' overdue' : ''}`} title="ددلاین">⏳ {task.deadline}</span>}
      {isLast && <span className="badge">{S.lastOne}</span>}
      {dispatch && (
        <details className="menu" ref={menuRef}>
          <summary aria-label={S.more}>⋯</summary>
          <div className="menu-list">
            {!task.recurrence && <div className="menu-status"><label htmlFor={`status-${task.id}-${originalDate}`}>وضعیت</label><select id={`status-${task.id}-${originalDate}`} value={status} onChange={e => { if (menuRef.current) menuRef.current.open = false; dispatch({ type: 'setTaskStatus', id: task.id, status: e.target.value as 'todo' | 'doing' | 'done' }); }}><option value="todo">برای انجام</option><option value="doing">در حال انجام</option><option value="done">انجام شد</option></select></div>}
            {onEdit && <button onClick={() => { if (menuRef.current) menuRef.current.open = false; onEdit(task); }}>✎ ویرایش</button>}
            {!task.recurrence && task.date !== null && (
              <button onClick={(e) => run(e, { type: 'moveOccurrence', id: task.id, originalDate, to: null })}>{S.unschedule}</button>
            )}
            {task.recurrence && !task.recurrence.until && (
              <button onClick={(e) => run(e, { type: 'endSeries', id: task.id, until: originalDate })}>{S.endSeries}</button>
            )}
            <button className="danger" onClick={(e) => { if (window.confirm(`«${task.title}» حذف شود؟${task.recurrence ? ' تمام تکرارها حذف خواهند شد.' : ''}`)) run(e, { type: 'removeTask', id: task.id }); }}>🗑 {S.remove}</button>
          </div>
        </details>
      )}
    </div>
  );
}

/** Draggable task. `originalDate` is '' for unscheduled tasks. */
export function TaskChip({ task, originalDate, date, dispatch, onEdit }: BodyProps & { date: string | null }) {
  const data: DragData = { taskId: task.id, originalDate, date, recurring: !!task.recurrence };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${task.id}|${originalDate}`, data });
  return (
    <div ref={setNodeRef} className={`drag${isDragging ? ' dragging' : ''}`} {...attributes} {...listeners}>
      <ChipBody task={task} originalDate={originalDate} dispatch={dispatch} onEdit={onEdit} />
    </div>
  );
}
