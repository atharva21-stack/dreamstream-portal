import { z } from 'zod';

export function meetingStart(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const start = new Date(date);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

export const scheduleSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  meetingType: z.enum(['team', 'one-on-one', 'leadership', 'organization']),
  date: z.date(),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
  duration: z.number().finite().int().min(15, 'Duration must be at least 15 minutes')
    .max(120, 'Duration must be at most 120 minutes'),
  participants: z.array(z.string().trim().min(1)).min(1, 'Select at least one participant'),
  location: z.object({
    type: z.enum(['virtual', 'physical']),
    link: z.string().trim().optional(),
    address: z.string().trim().optional(),
  }),
}).superRefine((values, context) => {
  const start = meetingStart(values.date, values.time);
  const [hours, minutes] = values.time.split(':').map(Number);
  if (start.getHours() !== hours || start.getMinutes() !== minutes) {
    context.addIssue({ code: 'custom', path: ['time'],
      message: 'This time is unavailable on the selected date. Choose another time.' });
  } else if (start.getTime() <= Date.now()) {
    context.addIssue({ code: 'custom', path: ['time'], message: 'Choose a future meeting time' });
  }

  if (values.location.type === 'physical' && !values.location.address) {
    context.addIssue({ code: 'custom', path: ['location', 'address'],
      message: 'Enter an address for an in-person meeting' });
  }
  if (values.location.type === 'virtual' && values.location.link) {
    try {
      const url = new URL(values.location.link);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Unsupported protocol');
    } catch {
      context.addIssue({ code: 'custom', path: ['location', 'link'],
        message: 'Enter an HTTP or HTTPS meeting link, or leave it empty' });
    }
  }
});
