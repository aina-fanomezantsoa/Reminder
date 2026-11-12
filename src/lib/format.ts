import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { parseLocalDate } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';

/** `11 nov.` */
export const shortDate = (d: LocalDate) => format(parseLocalDate(d), 'd MMM', { locale: fr });
/** `mer. 11 nov.` */
export const weekdayShortDate = (d: LocalDate) => format(parseLocalDate(d), 'EEE d MMM', { locale: fr });
/** `mercredi 11 novembre` */
export const longDate = (d: LocalDate) => format(parseLocalDate(d), 'EEEE d MMMM', { locale: fr });
/** `28 oct. → 02 nov.` */
export const dateRange = (a: LocalDate, b: LocalDate) => `${shortDate(a)} → ${shortDate(b)}`;
