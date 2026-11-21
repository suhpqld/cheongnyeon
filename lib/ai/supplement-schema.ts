import { z } from 'zod';
import type { SupplementParsed } from '@/lib/types';

const placeGroup = z.enum(['home', 'onsite', 'bank', 'work', 'tax', 'gov24'])
  .catch('onsite');

export const supplementParsedSchema: z.ZodType<SupplementParsed> = z.object({
  programName: z.string().nullable(),
  items: z.array(z.object({
    name: z.string(),
    originalText: z.string(),
    easyName: z.string(),
    easyExplain: z.string(),
    issuePlace: z.string(),
    placeGroup,
  })),
  deadline: z.string().nullable(),
  deadlineOriginalText: z.string().nullable(),
  officeName: z.string().nullable(),
  officeContact: z.string().nullable(),
  hardWords: z.array(z.object({ word: z.string(), easy: z.string() })).max(5),
  consequenceEasy: z.string().nullable(),
  summaryEasy: z.string(),
});

export function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
