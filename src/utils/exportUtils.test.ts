import { describe, expect, it } from 'vitest';
import type { Task } from '@/types/task';
import { tasksToCSV } from './exportUtils';

const task: Task = {
  id: 'task-1', title: 'Write report', description: '', status: 'todo',
  estimatedDuration: 30, actualDuration: 0,
};

describe('task CSV exports', () => {
  it('exports an empty list with just the header', () => {
    const csv = tasksToCSV([]);
    expect(csv.trim().split('\n')).toHaveLength(1);
    expect(csv).toContain('Task ID,Title,Description,Status,Priority');
  });

  it('escapes commas, quotes and newlines across all text fields', () => {
    const csv = tasksToCSV([{
      ...task, id: 'task,1', title: 'Review "draft"', description: 'Line 1\nLine 2',
      tags: ['a"b', 'c'], dependencies: ['task"2'],
      metadata: { complexity: 'low', impact: 'medium', businessValue: 5,
        learningOpportunity: 5, domain: 'Design, research' },
    }]);
    expect(csv).toContain('"task,1","Review ""draft""","Line 1\nLine 2",todo');
    expect(csv).toContain('"a""b, c",low,medium,5,5,"Design, research",No,"task""2"');
  });

  it('preserves an epoch timestamp and leaves invalid dates empty', () => {
    const row = tasksToCSV([{ ...task, createdAt: 0, dueDate: NaN }]).split('\n')[1];
    expect(row).toContain(',1970-01-01T00:00:00.000Z,,30,0,');
    expect(() => tasksToCSV([{ ...task, dueDate: Infinity }])).not.toThrow();
  });

  it('preserves zero metadata values instead of substituting defaults', () => {
    const csv = tasksToCSV([{ ...task, metadata: {
      complexity: 'low', impact: 'low', businessValue: 0, learningOpportunity: 0,
    } }]);
    expect(csv).toContain(',low,low,0,0,,No,');
  });
});
