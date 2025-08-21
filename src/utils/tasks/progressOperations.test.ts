import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), ref: vi.fn() }));
vi.mock('firebase/database', () => ({
  getDatabase: () => 'database',
  ref: mocks.ref,
  get: mocks.get,
  update: mocks.update,
  push: vi.fn(),
}));
import { checkDependencies } from './progressOperations';

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
