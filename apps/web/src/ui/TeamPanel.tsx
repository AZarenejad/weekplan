import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react';
import type { AppState, OneOnOne, TeamMember } from '@weekplan/shared';
import type { Action } from '../state/reducer';
import { newId } from './id';

export function TeamPanel({state, dispatch}: {state: AppState; dispatch: Dispatch<Action>}) {
  const people = state.people ?? [];
  const [selected, setSelected] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeProfile = () => { setSelected(''); setMeeting(null); setPersonForm(null); };
  useEffect(() => {
    if (!selected) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeProfile(); }
      if (event.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); returnFocusRef.current?.focus(); };
  }, [selected]);
  const [query, setQuery] = useState('');
  const [personForm, setPersonForm] = useState<TeamMember | null>(null);
  const [meeting, setMeeting] = useState<OneOnOne | null>(null);
  const [tab, setTab] = useState<'active'|'done'|'meetings'>('active');
  const person = people.find(p => p.id === selected);
  const personTasks = state.tasks.filter(t => t.assigneeId === selected);
  const active = personTasks.filter(t => (t.status ?? (t.done ? 'done':'todo')) !== 'done');
  const done = personTasks.filter(t => (t.status ?? (t.done ? 'done':'todo')) === 'done').sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??''));
  const history = (state.oneOnOnes ?? []).filter(m => m.personId === selected).sort((a,b)=>b.date.localeCompare(a.date));
  const savePerson = (e: FormEvent) => { e.preventDefault(); if(!personForm?.name.trim()) return; dispatch({type:'upsertPerson',person:{...personForm,name:personForm.name.trim(),role:personForm.role?.trim()}}); setSelected(personForm.id); setPersonForm(null); };
  const startMeeting = () => {if (!selected) return; setTab('meetings'); setMeeting({id:newId(),personId:selected,date:new Date().toLocaleDateString('en-CA'),agenda:'',notes:'',decisions:'',followUps:''});};
  const invalidTime = !!meeting?.startTime && !!meeting?.endTime && meeting.endTime <= meeting.startTime;
  return <section className="team-panel" aria-label="افراد تیم و جلسات یک به یک">
    <div className="team-header"><div><h2>افراد تیم</h2><p className="team-muted">مسئولیت‌ها، گفتگوهای ۱:۱ و پیگیری‌ها در یک جا</p></div><button className="primary" onClick={()=>setPersonForm({id:newId(),name:'',role:''})}>+ افزودن فرد</button></div>
    {personForm && <form className="team-person-form" onSubmit={savePerson}><h3>{people.some(p=>p.id===personForm.id)?'ویرایش مشخصات':'همکار جدید'}</h3><div className="team-form-grid"><label>نام<input required autoFocus value={personForm.name} onChange={e=>setPersonForm({...personForm,name:e.target.value})}/></label><label>نقش / سمت<input value={personForm.role??''} onChange={e=>setPersonForm({...personForm,role:e.target.value})}/></label></div><div className="team-actions"><button className="primary" type="submit">ذخیره</button><button type="button" onClick={()=>setPersonForm(null)}>انصراف</button></div></form>}
    <div className="team-directory"><div className="team-directory-top"><strong>همکاران <span className="team-total">{people.length}</span></strong><input aria-label="جستجوی همکار" placeholder="جستجوی نام یا سمت…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="team-directory-list">{people.filter(p=>`${p.name} ${p.role??''}`.toLowerCase().includes(query.toLowerCase())).map(p=>{const doing=state.tasks.filter(t=>t.assigneeId===p.id && t.status==='doing').length;return <button type="button" key={p.id} className="team-person-card" onClick={e=>{returnFocusRef.current=e.currentTarget;setSelected(p.id);setMeeting(null);setTab('active');}}><span className="team-avatar">{p.name.trim().charAt(0)}</span><span className="team-person-info"><strong>{p.name}</strong><small>{p.role||'بدون سمت'}</small></span><span className="team-person-count"><b>{doing}</b><small>در حال انجام</small></span><span className="team-person-chevron" aria-hidden="true">‹</span></button>;})}{people.length===0?<p className="team-muted">هنوز فردی ثبت نشده است.</p>:!people.some(p=>`${p.name} ${p.role??''}`.toLowerCase().includes(query.toLowerCase()))?<p className="team-muted">نتیجه‌ای پیدا نشد.</p>:null}</div></div>
    {person && <div className="team-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeProfile();}}><div className="team-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-label={`جزئیات ${person.name}`} tabIndex={-1}><div className="team-dialog-top"><span>پروفایل همکار</span><button type="button" className="team-close" aria-label="بستن جزئیات" onClick={closeProfile}>×</button></div>
    <div className="team-detail"><>
      <div className="team-profile"><span className="team-avatar large">{person.name.charAt(0)}</span><div className="team-profile-name"><h3>{person.name}</h3><p className="team-muted">{person.role||'بدون سمت'}</p></div><button className="team-quiet" onClick={()=>setPersonForm({...person})}>ویرایش فرد</button><button className="team-danger-link" onClick={()=>{if(window.confirm(`«${person.name}» و تاریخچه جلسات او حذف شوند؟`)){dispatch({type:'deletePerson',id:person.id});closeProfile();}}}>حذف</button></div>
      <div className="team-stats"><div><strong>{active.length}</strong><small>کار فعال</small></div><div><strong>{active.filter(t=>t.status==='doing').length}</strong><small>در حال انجام</small></div><div><strong>{done.length}</strong><small>انجام‌شده</small></div><div><strong>{history.length}</strong><small>جلسه ۱:۱</small></div></div>
      <div className="team-tabs" role="tablist" aria-label="اطلاعات همکار"><button role="tab" aria-selected={tab==='active'} className={tab==='active'?'active':''} onClick={()=>setTab('active')}>کارهای فعال</button><button role="tab" aria-selected={tab==='done'} className={tab==='done'?'active':''} onClick={()=>setTab('done')}>انجام‌شده‌ها</button><button role="tab" aria-selected={tab==='meetings'} className={tab==='meetings'?'active':''} onClick={()=>setTab('meetings')}>جلسات ۱:۱</button></div>
      {tab==='active' && <div className="team-task-list">{active.length?active.map(t=><div className="team-task-row" key={t.id}><div><strong>{t.title}</strong><small>{t.deadline?`ددلاین: ${t.deadline}`:'بدون ددلاین'}</small></div><span className={`team-status ${t.status==='doing'?'doing':''}`}>{t.status==='doing'?'در حال انجام':'برای انجام'}</span></div>):<p className="team-empty-note">کار فعالی برای این فرد ثبت نشده است.</p>}</div>}
      {tab==='done' && <div className="team-task-list">{done.length?done.map(t=><div className="team-task-row" key={t.id}><div><strong>{t.title}</strong><small>شروع: {t.startedAt??t.createdAt??'نامشخص'} · پایان: {t.completedAt??'نامشخص'}</small></div><span className="team-status completed">انجام شد</span></div>):<p className="team-empty-note">هنوز کاری به پایان نرسیده است.</p>}</div>}
      {tab==='meetings' && <div className="team-meetings"><div className="team-section-head"><strong>تاریخچه گفتگوها</strong><button className="primary" onClick={startMeeting}>+ جلسه جدید</button></div>{history.map(m=><div className="team-meeting-card" key={m.id}><div><strong>{m.date}</strong><small>{m.startTime?`${m.startTime} تا ${m.endTime??'؟'}`:'زمان ثبت نشده'}</small>{m.agenda&&<p>{m.agenda}</p>}</div><div className="team-actions"><button onClick={()=>setMeeting({...m})}>مشاهده / ویرایش</button><button className="team-danger-link" onClick={()=>{if(window.confirm('این جلسه حذف شود؟'))dispatch({type:'deleteOneOnOne',id:m.id});}}>حذف</button></div></div>)}{!history.length&&!meeting&&<p className="team-empty-note">هنوز جلسه‌ای ثبت نشده است.</p>}</div>}
      {meeting && <form className="team-meeting-editor" onSubmit={e=>{e.preventDefault();if(invalidTime){window.alert('زمان پایان باید بعد از شروع باشد');return;}dispatch({type:'upsertOneOnOne',meeting});setMeeting(null);}}><div className="team-section-head"><h3>یادداشت جلسه با {person.name}</h3><button type="button" onClick={()=>setMeeting(null)}>بستن ×</button></div><div className="team-form-grid"><label>تاریخ<input type="date" required value={meeting.date} onChange={e=>setMeeting({...meeting,date:e.target.value})}/></label><label>شروع<input type="time" value={meeting.startTime??''} onChange={e=>setMeeting({...meeting,startTime:e.target.value||undefined})}/></label><label>پایان<input type="time" value={meeting.endTime??''} onChange={e=>setMeeting({...meeting,endTime:e.target.value||undefined})}/></label></div>{(['agenda','notes','decisions','followUps'] as const).map(key=><label key={key}>{({agenda:'موضوعات گفتگو',notes:'یادداشت‌ها',decisions:'تصمیم‌ها',followUps:'اقدامات پیگیری'})[key]}<textarea rows={4} value={meeting[key]} onChange={e=>setMeeting({...meeting,[key]:e.target.value})}/></label>)}<div className="team-actions"><button className="primary" type="submit">ذخیره جلسه</button><button type="button" onClick={()=>setMeeting(null)}>انصراف</button></div></form>}
    </></div></div></div>}
  </section>;
}
