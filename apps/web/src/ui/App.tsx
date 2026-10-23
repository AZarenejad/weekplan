import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  JALALI_MONTHS, currentJalaliMonth, formatGregorianShort, jalaliMonthGrid, occurrencesInRange, persianWeekday,
  shiftMonth, toPersianDigits, todayIso, type Category,
} from '@weekplan/shared';
import { useStore } from '../state/useStore';
import { createGateway } from '../storage/gateways';
import { Backlog } from './Backlog';
import { CATEGORIES, CATEGORY_KEYS } from './categories';
import { DayCell } from './DayCell';
import { GoalsPanel } from './GoalsPanel';
import { TaskOverview } from './TaskOverview';
import { S } from './strings';
import { ChipBody, type DragData } from './TaskChip';
import { TeamPanel } from './TeamPanel';
import { TaskForm } from './TaskForm';
import type { Task } from '@weekplan/shared';

const gateway = createGateway();

export function App() {
  const { state, dispatch, status } = useStore(gateway);
  const [month, setMonth] = useState(() => currentJalaliMonth());
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [category, setCategory] = useState<Category>('work');
  const [dragging, setDragging] = useState<DragData | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const { weeks, first, last } = useMemo(() => jalaliMonthGrid(month), [month]);
  const days = weeks.flat();
  const today = todayIso();
  const visible = (c: Category) => !hidden.has(c);

  const byDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof occurrencesInRange>>();
    for (const o of occurrencesInRange(state.tasks, days[0], days[days.length - 1])) {
      if (hidden.has(o.task.category)) continue;
      map.set(o.date, [...(map.get(o.date) ?? []), o]);
    }
    return map;
  }, [state.tasks, days, hidden]);

  const backlog = state.tasks.filter((t) => !t.recurrence && t.date === null && (t.status ?? (t.done ? 'done' : 'todo')) !== 'done' && visible(t.category));

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const d = active.data.current as DragData | undefined;
    if (!d || !over) return;
    const target = String(over.id);
    if (target === 'backlog') {
      if (!d.recurring && d.date !== null) dispatch({ type: 'moveOccurrence', id: d.taskId, originalDate: d.originalDate, to: null });
    } else if (target.startsWith('day:') && target.slice(4) !== d.date) {
      const targetDate = target.slice(4);
      const moved = state.tasks.find(t => t.id === d.taskId);
      if (moved?.category === 'team' && moved.time && moved.endTime) {
        const conflicts = (byDay.get(targetDate) ?? []).filter(o => o.task.id !== moved.id && o.task.category === 'team' && o.task.time && o.task.endTime && moved.time! < o.task.endTime && o.task.time < moved.endTime!);
        if (conflicts.length && !window.confirm(`تداخل زمانی با جلسه «${conflicts.map(o => o.task.title).join('، ')}» وجود دارد. با این حال جابه‌جا شود؟`)) return;
      }
      dispatch({ type: 'moveOccurrence', id: d.taskId, originalDate: d.originalDate, to: targetDate });
    }
  }

  function saveEdited(action: import('../state/reducer').Action) {
    if (action.type === 'updateTask' && action.task.category === 'team' && action.task.date && action.task.time && action.task.endTime) {
      const t = action.task;
      const date = action.task.date;
      const start = action.task.time;
      const end = action.task.endTime;
      const conflicts = (byDay.get(date) ?? []).filter(o => o.task.id !== t.id && o.task.category === 'team' && o.task.time && o.task.endTime && start < o.task.endTime && o.task.time < end);
      if (conflicts.length && !window.confirm(`این جلسه با «${conflicts.map(o => o.task.title).join('، ')}» تداخل دارد. ذخیره شود؟`)) return;
    }
    dispatch(action);
    if (action.type === 'updateTask') setEditing(null);
  }

  const dragged = dragging && state.tasks.find((t) => t.id === dragging.taskId);

  return (
    <div className="shell">
      <header className="top">
        <div className="month-title">
          <h1>{JALALI_MONTHS[month.m - 1]} {toPersianDigits(month.y)}</h1>
          <p>{formatGregorianShort(first)} – {formatGregorianShort(last, true)}</p>
        </div>
        <nav className="nav" aria-label={S.appName}>
          <button onClick={() => setMonth(shiftMonth(month, -1))}>{S.prevMonth}</button>
          <button onClick={() => setMonth(currentJalaliMonth())}>{S.today}</button>
          <button onClick={() => setMonth(shiftMonth(month, 1))}>{S.nextMonth}</button>
        </nav>
        <div className="legend">
          {CATEGORY_KEYS.map((c) => (
            <button key={c} className="pill" aria-pressed={visible(c)} style={{ '--c': CATEGORIES[c].color } as CSSProperties}
              onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(c)) n.delete(c); else n.add(c); return n; })}>
              {CATEGORIES[c].label}
            </button>
          ))}
        </div>
      </header>

      {status === 'error' && <p className="banner" role="alert">{S.offline}</p>}
      {status === 'loading' && <p className="empty">{S.loading}</p>}

      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragging(e.active.data.current as DragData)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <main className="layout">
          <section className="month" aria-label={`${JALALI_MONTHS[month.m - 1]} ${toPersianDigits(month.y)}`}>
            <div className="dow">{weeks[0].map((d) => <span key={d}>{persianWeekday(d)}</span>)}</div>
            <div className="days">
              {days.map((iso, i) => (
                <DayCell key={iso} iso={iso} inMonth={iso >= first && iso <= last} today={iso === today} friday={i % 7 === 6}
                  items={byDay.get(iso) ?? []} category={category} dispatch={dispatch} onEdit={setEditing} />
              ))}
            </div>
          </section>
          <aside className="side">
            <TaskOverview tasks={state.tasks} people={state.people ?? []} dispatch={dispatch} onEdit={setEditing} />
            <Backlog tasks={backlog} category={category} setCategory={setCategory} dispatch={dispatch} onEdit={setEditing} />
            <TeamPanel state={state} dispatch={dispatch} />
            <GoalsPanel state={state} dispatch={dispatch} />
          </aside>
        </main>
        {editing && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}><div className="edit-modal"><h2>ویرایش کار / جلسه</h2><TaskForm key={editing.id} people={state.people ?? []} task={editing} goals={state.goals} defaultDate={today} defaultCategory={editing.category} dispatch={saveEdited} onClose={() => setEditing(null)} /></div></div>}
        <DragOverlay dropAnimation={null}>
          {dragged && dragging ? <div className="overlay"><ChipBody task={dragged} originalDate={dragging.originalDate} /></div> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
