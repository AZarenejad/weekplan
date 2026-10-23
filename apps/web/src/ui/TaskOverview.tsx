import type { Task } from '@weekplan/shared';
import { useState, type Dispatch } from 'react';
import type { Action } from '../state/reducer';
import { CATEGORIES } from './categories';

export function TaskOverview({tasks, people = [], dispatch, onEdit}: {tasks: Task[]; people?: {id:string;name:string}[]; dispatch: Dispatch<Action>; onEdit: (t: Task) => void}) {
  const [showAll, setShowAll] = useState(false);
  const doing = tasks.filter(t => !t.recurrence && (t.status === 'doing'));
  const done = tasks.filter(t => !t.recurrence && (t.status === 'done' || t.done)).sort((a,b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return <section className="panel task-overview" aria-label="نمای وضعیت کارها">
    <h2>در حال انجام <span className="count">({doing.length})</span></h2>
    {doing.length === 0 && <p className="empty">کاری در حال انجام نیست.</p>}
    {doing.map(t => <div key={t.id} className="overview-item"><div className="overview-task-title"><span>{t.title}</span><small className="overview-kind">{CATEGORIES[t.category].label}{t.assigneeId ? ` · مسئول: ${people.find(p=>p.id===t.assigneeId)?.name ?? "نامشخص"}` : " · بدون مسئول"}{t.date ? ` · ${t.date}` : " · بدون تاریخ"}</small></div><button type="button" onClick={() => onEdit(t)}>ویرایش</button><button type="button" onClick={() => dispatch({type:'setTaskStatus',id:t.id,status:'done'})}>اتمام ✓</button></div>)}
    <div className="overview-heading"><h2>انجام‌شده‌ها <span className="count">({done.length})</span></h2><button type="button" onClick={() => setShowAll(v => !v)}>{showAll ? 'بستن' : 'نمایش لیست'}</button></div>
    {showAll && (done.length ? done.map(t => <div key={t.id} className="overview-item completed"><div><strong>{t.title}</strong><small>شروع: {t.startedAt ?? t.createdAt ?? 'نامشخص'} · پایان: {t.completedAt ?? 'نامشخص'}</small></div><button type="button" onClick={() => dispatch({type:'setTaskStatus',id:t.id,status:'doing'})}>بازگشایی</button><button type="button" onClick={() => onEdit(t)}>ویرایش</button></div>) : <p className="empty">هنوز کاری تمام نشده است.</p>)}
  </section>;
}
