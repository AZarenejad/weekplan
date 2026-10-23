import { toJalali } from '@weekplan/shared';
/** Fixed-date official Iranian solar holidays. Lunar dates vary annually and require a verified year-specific feed. */
const SOLAR_HOLIDAYS: Record<string, string> = {
  '1/1': 'نوروز', '1/2': 'نوروز', '1/3': 'نوروز', '1/4': 'نوروز',
  '1/12': 'روز جمهوری اسلامی', '1/13': 'روز طبیعت',
  '3/14': 'رحلت امام خمینی', '3/15': 'قیام ۱۵ خرداد',
  '11/22': 'پیروزی انقلاب اسلامی', '12/29': 'ملی شدن صنعت نفت',
};
export function iranHoliday(iso: string): string | undefined {
  const j = toJalali(iso);
  return SOLAR_HOLIDAYS[`${j.m}/${j.d}`];
}
