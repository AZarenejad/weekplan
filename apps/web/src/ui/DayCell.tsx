import { useDroppable } from '@dnd-kit/core';
import { useState, type Dispatch } from 'react';
import { formatGregorianShort, formatJalali, toJalali, toPersianDigits, type Category, type Occurrence, type Task } from '@weekplan/shared';
import type { Action } from '../state/reducer';
import { newId } from './id';
import { S } from './strings';
import { TaskChip } from './TaskChip';
import { iranHoliday } from './holidays';

interface Props {
  iso: string; inMonth: boolean; today: boolean; friday: boolean;
  items: Occurrence[]; category: Category; dispatch: Dispatch<Action>; onEdit?: (task: Task) => void;
}

export function DayCell({ iso, inMonth, today, friday, items, category, dispatch, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const j = toJalali(iso);
  const gDay = Number(iso.slice(8));
  const holiday = iranHoliday(iso);

  const submit = () => {
    if (title.trim()) dispatch({ type: 'addTask', task: { id: newId(), title: title.trim(), category, date: iso, done: false, overrides: {} } });
    setTitle('');
    setAdding(false);
  };

  return (
    <div ref={setNodeRef} className={`cell${inMonth ? '' : ' out'}${today ? ' today' : ''}${friday ? ' fri' : ''}${holiday ? ' holiday' : ''}${isOver ? ' over' : ''}`}>
      <header>
        <span className="jd">{j.d === 1 ? formatJalali(iso) : toPersianDigits(j.d)}</span>
        <span className="gd">{gDay === 1 ? formatGregorianShort(iso) : gDay}</span>
      </header>
      {holiday && <span className="holiday-name" title={holiday}>{holiday}</span>}
      <div className="items">
        {items.map((o) => <TaskChip key={`${o.task.id}:${o.originalDate}`} task={o.task} originalDate={o.originalDate} date={o.date} dispatch={dispatch} onEdit={onEdit} />)}
      </div>
      {adding ? (
        <input
          className="day-input" autoFocus placeholder={S.dayAddPlaceholder} value={title} aria-label={S.dayAddPlaceholder}
          onChange={(e) => setTitle(e.target.value)} onBlur={submit}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setTitle(''); setAdding(false); } }}
        />
      ) : (
        <button className="add" aria-label={S.addToDay} title={S.addToDay} onClick={() => setAdding(true)}>+</button>
      )}
    </div>
  );
}
