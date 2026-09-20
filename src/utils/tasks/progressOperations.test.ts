import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), ref: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: () => 'database',
  ref: mocks.ref,
  get: mocks.get,
  update: mocks.update,
  push: vi.fn(),
}));
import { checkDependencies, updateTaskProgress } from './progressOperations';

beforeEach(() => {
  mocks.get.mockReset();
  mocks.update.mockReset();
  mocks.ref.mockImplementation((_db, path) => path);
});

function snapshot(value: unknown) {
  return { val: () => value };
}

describe('task dependency checks', () => {
  it('blocks a task that was deleted before the dependency check', async () => {
    mocks.get.mockResolvedValueOnce(snapshot(null));
    await expect(checkDependencies('user', 'deleted')).resolves.toBe(false);
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { dependencies: [] }, { dependencies: null }])(
    'allows tasks without dependencies: %j', async (task) => {
      mocks.get.mockResolvedValueOnce(snapshot(task));
      await expect(checkDependencies('user', 'task')).resolves.toBe(true);
      expect(mocks.get).toHaveBeenCalledTimes(1);
    },
  );

  it.each([null, {}, { dependency: { status: 'in-progress' } }])(
    'blocks missing or incomplete dependencies: %j', async (tasks) => {
      mocks.get.mockResolvedValueOnce(snapshot({ dependencies: ['dependency'] }))
        .mockResolvedValueOnce(snapshot(tasks));
      await expect(checkDependencies('user', 'task')).resolves.toBe(false);
    },
  );

  it('allows a task only when all dependencies are completed', async () => {
    mocks.get.mockResolvedValueOnce(snapshot({ dependencies: ['a', 'b'] }))
      .mockResolvedValueOnce(snapshot({ a: { status: 'completed' }, b: { status: 'completed' } }));
    await expect(checkDependencies('user', 'task')).resolves.toBe(true);
    expect(mocks.get).toHaveBeenLastCalledWith('users/user/tasks');
  });

  it('blocks malformed dependency data without throwing', async () => {
    mocks.get.mockResolvedValueOnce(snapshot({ dependencies: 'not-an-array' }));
    await expect(checkDependencies('user', 'task')).resolves.toBe(false);
  });

  it('preserves network errors so the caller can report a failed check', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Offline'));
    await expect(checkDependencies('user', 'task')).rejects.toThrow('Offline');
  });
});

describe('task progress updates', () => {
  it.each([-1, 101, NaN, Infinity, -Infinity])('rejects invalid progress %s before writing', async (value) => {
    await expect(updateTaskProgress('user', 'task', value)).rejects.toThrow(RangeError);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.ref).not.toHaveBeenCalled();
  });

  it.each([0, 37.5, 100])('persists valid progress %s and its activity', async (value) => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    await updateTaskProgress('user', 'task', value);
    expect(mocks.update).toHaveBeenCalledWith('users/user/tasks/task', {
      completionPercentage: value,
      updatedAt: 12345,
      lastActivity: { type: 'status_change', timestamp: 12345,
        details: `Progress updated to ${value}%` },
    });
  });

  it('propagates rejected writes without reporting success', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(updateTaskProgress('user', 'task', 50)).rejects.toThrow('Permission denied');
  });
});
