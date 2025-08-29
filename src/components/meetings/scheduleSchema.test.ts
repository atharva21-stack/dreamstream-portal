import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { meetingStart, scheduleSchema } from './scheduleSchema';

const valid = () => ({
  title: 'Planning', meetingType: 'team', date: new Date(2026, 8, 21), time: '10:00',
  duration: 30, participants: ['user-1'], location: { type: 'virtual', link: '' },
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 20, 12));
});
afterEach(() => vi.useRealTimers());

describe('meeting scheduling validation', () => {
  it('allows a future meeting with an auto-generated link and trims the title', () => {
    expect(scheduleSchema.parse({ ...valid(), title: '  Planning  ' }).title).toBe('Planning');
  });

  it('rejects whitespace-only titles', () => {
    expect(scheduleSchema.safeParse({ ...valid(), title: '   ' }).success).toBe(false);
  });

  it.each([-1, 0, 14, 30.5, 121, Infinity, NaN])('rejects invalid duration %s', (duration) => {
    expect(scheduleSchema.safeParse({ ...valid(), duration }).success).toBe(false);
  });

  it.each(['25:00', '10:60', 'not a time'])('rejects invalid time %s', (time) => {
    expect(scheduleSchema.safeParse({ ...valid(), time }).success).toBe(false);
  });

  it('rejects earlier times today and allows later times today', () => {
    const today = new Date(2026, 8, 20);
    expect(scheduleSchema.safeParse({ ...valid(), date: today, time: '11:59' }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...valid(), date: today, time: '12:00' }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...valid(), date: today, time: '12:01' }).success).toBe(true);
  });

  it('requires an address for physical meetings and reports the correct field', () => {
    const result = scheduleSchema.safeParse({ ...valid(), location: { type: 'physical', address: ' ' } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['location', 'address']);
    expect(scheduleSchema.safeParse({ ...valid(), location: { type: 'physical', address: 'Room 1' } }).success).toBe(true);
  });

  it.each(['not a link', 'javascript:alert(1)', 'ftp://example.com'])('rejects invalid meeting link %s', (link) => {
    expect(scheduleSchema.safeParse({ ...valid(), location: { type: 'virtual', link } }).success).toBe(false);
  });

  it('accepts HTTPS meeting links and requires participants', () => {
    expect(scheduleSchema.safeParse({ ...valid(), location: { type: 'virtual', link: 'https://meet.example.com/room' } }).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...valid(), participants: [] }).success).toBe(false);
  });

  it('combines a local date and time without modifying the selected day', () => {
    const date = new Date(2026, 8, 21);
    const start = meetingStart(date, '09:45');
    expect(start).toEqual(new Date(2026, 8, 21, 9, 45));
    expect(date.getHours()).toBe(0);
  });
});
