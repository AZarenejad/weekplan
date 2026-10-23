import { useState, type Dispatch, type FormEvent } from 'react';
import type { Category, Goal, Task } from '@weekplan/shared';
import type { Action } from '../state/reducer';
import { CATEGORIES } from './categories';
import { DatePicker } from './DatePicker';
import { newId } from './id';
import { S } from './strings';

interface Props { people?: import('@weekplan/shared').TeamMember[]; goals: Goal[]; defaultDate: string; defaultCategory: Category; dispatch: Dispatch<Action>; task?: Task; onClose?: () => void }

/** Full form: repeat rule, time, goal. For quick adds use the backlog input or the + on a day. */
export function TaskForm({ people = [], goals, defaultDate, defaultCategory, dispatch, task, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [category, setCategory] = useState<Category>(task?.category ?? defaultCategory);
  const [date, setDate] = useState(task ? (task.date ?? '') : defaultDate);
  const [time, setTime] = useState(task?.time ?? '');
  const [endTime, setEndTime] = useState(task?.endTime ?? '');
  const [deadline, setDeadline] = useState(task?.deadline ?? '');
  const [status, setStatus] = useState<'todo' | 'doing' | 'done'>(task?.status ?? (task?.done ? 'done' : 'todo'));
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');
  const [goalId, setGoalId] = useState(task?.goalId ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (category === 'team' && (!time || !endTime || endTime <= time)) { window.alert('برای جلسه، زمان شروع و پایان معتبر لازم است.'); return; }
    dispatch({ type: task ? 'updateTask' : 'addTask', task: { ...(task ?? { id: newId(), done: false, overrides: {} }), title: title.trim(), category, date: date || null, status, done: status === 'done', time: time || undefined, endTime: category === 'team' ? endTime || undefined : undefined, deadline: deadline || undefined, goalId: goalId || undefined, assigneeId: assigneeId || undefined } });
    if (!task) setTitle('');
  };

  return (
    <form className="form" onSubmit={submit}>
      <input placeholder={S.title} value={title} onChange={(e) => setTitle(e.target.value)} aria-label={S.title} />
      <div className="grid2">
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label={S.category}>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

      </div>
      <label className="optional-date"><input type="checkbox" checked={!!date} onChange={e => setDate(e.target.checked ? (task?.date ?? defaultDate) : '')} /> برنامه‌ریزی در تقویم</label>
      {!!date && <DatePicker value={date} onChange={setDate} label={S.date} />}
      <label>وضعیت<select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="todo">برای انجام</option><option value="doing">در حال انجام</option><option value="done">انجام شد</option></select></label>
      <label>ساعت شروع<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      {category === 'team' && <label>ساعت پایان<input type="time" min={time || undefined} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>}
      <label>ددلاین (اختیاری)<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      <label>مسئول کار<select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">بدون مسئول</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <select value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label={S.goal}>
        <option value="">{S.noGoal}</option>
        {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>
      <button className="primary" type="submit">{task ? 'ذخیره تغییرات' : S.add}</button>{onClose && <button type="button" onClick={onClose}>انصراف</button>}
    </form>
  );
}
