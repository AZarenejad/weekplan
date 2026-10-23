import { useState, type CSSProperties, type Dispatch } from 'react';
import { goalProgress, type AppState, type Goal } from '@weekplan/shared';
import type { Action } from '../state/reducer';
import { CATEGORIES } from './categories';
import { newId } from './id';

const toFa = (n: number) => String(n).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
const empty = (): Goal => ({ id: newId(), title: '', category: 'work', priority: 'medium', completed: false });
export function GoalsPanel({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const [draft, setDraft] = useState<Goal>(empty);
  const [editing, setEditing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const save = () => {
    if (!draft.title.trim()) return;
    const goal = { ...draft, title: draft.title.trim() };
    dispatch({ type: editing ? 'updateGoal' : 'addGoal', goal });
    setEditing(false); setDraft(empty()); setFormOpen(false);
  };
  return <section className="panel goals-panel">
    <div className="overview-heading"><h2>اهداف</h2><button type="button" className="primary" onClick={() => { setDraft(empty()); setEditing(false); setFormOpen(true); }}>+ هدف جدید</button></div>
    {(['work', 'personal'] as const).map(group => <div key={group} className="goal-group">
      <h3>{group === 'work' ? 'اهداف کاری' : 'اهداف شخصی'}</h3>
      {state.goals.filter(g => group === 'personal' ? g.category === 'personal' : g.category !== 'personal').map(g => {
        const progress = goalProgress(g, state.tasks);
        return <div key={g.id} className={`goal ${g.completed ? 'goal-complete' : ''}`} style={{ '--c': CATEGORIES[g.category].color } as CSSProperties}>
          <div className="row"><span className="title">{g.title}</span><span className="count">{toFa(progress.done)}/{toFa(progress.total)}</span></div>
          <div className="goal-meta">{g.priority === 'high' ? '🔴 اولویت بالا' : g.priority === 'low' ? 'اولویت پایین' : 'اولویت متوسط'} {g.deadline ? ` · ددلاین: ${g.deadline}` : ''} {g.completed ? ' · خاتمه‌یافته ✓' : ''}</div>
          <div className="bar" role="progressbar" aria-valuenow={Math.round(progress.ratio * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress.ratio * 100}%` }} /></div>
          <details className="goal-menu"><summary aria-label={`گزینه‌های هدف ${g.title}`}>⋯</summary><div className="goal-menu-actions"><button type="button" onClick={e => { e.currentTarget.closest("details")?.removeAttribute("open"); setDraft({ ...g }); setEditing(true); setFormOpen(true); }}>ویرایش</button><button type="button" onClick={e => { e.currentTarget.closest("details")?.removeAttribute("open"); dispatch({ type: 'updateGoal', goal: { ...g, completed: !g.completed } }); }}>{g.completed ? 'بازگشایی' : 'خاتمه'}</button><button type="button" className="goal-delete" onClick={() => { if (window.confirm(`هدف «${g.title}» حذف شود؟`)) dispatch({ type: 'removeGoal', id: g.id }); }}>حذف</button></div></details>
        </div>;
      })}
    </div>)}
    {formOpen && <form className="goal-form" onSubmit={e => { e.preventDefault(); save(); }}>
      <h3>{editing ? 'ویرایش هدف' : 'هدف جدید'}</h3>
      <textarea rows={3} placeholder="عنوان یا شرح هدف" aria-label="عنوان هدف" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
      <div className="grid2"><label>گروه<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as Goal['category'] })}><option value="work">کاری</option><option value="personal">شخصی</option></select></label>
      <label>اولویت<select value={draft.priority ?? 'medium'} onChange={e => setDraft({ ...draft, priority: e.target.value as Goal['priority'] })}><option value="high">بالا</option><option value="medium">متوسط</option><option value="low">پایین</option></select></label></div>
      <label>ددلاین (اختیاری)<input type="date" value={draft.deadline ?? ''} onChange={e => setDraft({ ...draft, deadline: e.target.value || undefined })} /></label>
      <label className="row"><input type="checkbox" checked={!!draft.completed} onChange={e => setDraft({ ...draft, completed: e.target.checked })} /> خاتمه‌یافته</label>
      <div className="row"><button className="primary" type="submit">{editing ? 'ذخیره تغییرات' : 'افزودن هدف'}</button><button type="button" onClick={() => { setEditing(false); setDraft(empty()); setFormOpen(false); }}>انصراف</button></div>
    </form>}
  </section>;
}
