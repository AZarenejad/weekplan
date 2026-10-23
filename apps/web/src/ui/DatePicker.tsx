import { JALALI_MONTHS, formatGregorianShort, jalaliMonthLength, toGregorianIso, toJalali, toPersianDigits } from '@weekplan/shared';

interface Props { value: string; onChange: (iso: string) => void; label: string }

/** Jalali day/month/year selects; shows the Gregorian equivalent next to them. Value stays ISO Gregorian. */
export function DatePicker({ value, onChange, label }: Props) {
  const j = toJalali(value);
  const set = (y: number, m: number, d: number) => onChange(toGregorianIso(y, m, Math.min(d, jalaliMonthLength(y, m))));
  const years = Array.from({ length: 9 }, (_, i) => j.y - 3 + i);
  return (
    <div className="dp" role="group" aria-label={label}>
      <select aria-label={`${label}: day`} value={j.d} onChange={(e) => set(j.y, j.m, +e.target.value)}>
        {Array.from({ length: jalaliMonthLength(j.y, j.m) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{toPersianDigits(d)}</option>)}
      </select>
      <select aria-label={`${label}: month`} value={j.m} onChange={(e) => set(j.y, +e.target.value, j.d)}>
        {JALALI_MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>
      <select aria-label={`${label}: year`} value={j.y} onChange={(e) => set(+e.target.value, j.m, j.d)}>
        {years.map((y) => <option key={y} value={y}>{toPersianDigits(y)}</option>)}
      </select>
      <span className="greg">{formatGregorianShort(value, true)}</span>
    </div>
  );
}
