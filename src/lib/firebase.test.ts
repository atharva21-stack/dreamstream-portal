import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onValue: vi.fn(),
  ref: vi.fn(() => ({ path: 'users/example' })),
  isSupported: vi.fn<() => Promise<boolean>>(),
  getAnalytics: vi.fn(() => ({ name: 'analytics' })),
}));

vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({ projectId: 'example' }) }));
vi.mock('firebase/app', () => ({ initializeApp: () => ({ name: 'example' }) }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ useDeviceLanguage: vi.fn() }) }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  enableNetwork: vi.fn(),
  disableNetwork: vi.fn(),
  enableIndexedDbPersistence: () => Promise.resolve(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
}));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(),
  ref: mocks.ref,
  onValue: mocks.onValue,
}));
vi.mock('firebase/analytics', () => ({
  isSupported: mocks.isSupported,
  getAnalytics: mocks.getAnalytics,
}));

beforeEach(() => {
  vi.resetModules();
  mocks.isSupported.mockResolvedValue(false);
});

describe('Realtime Database subscriptions', () => {
  it('returns an unsubscribe handle for each listener on the same path', async () => {
    const stopFirst = vi.fn();
    const stopSecond = vi.fn();
    mocks.onValue.mockReturnValueOnce(stopFirst).mockReturnValueOnce(stopSecond);
    const { subscribeToRealTimeDB } = await import('./firebase');
    const unsubscribeFirst = subscribeToRealTimeDB('users/example', vi.fn());
    const unsubscribeSecond = subscribeToRealTimeDB('users/example', vi.fn());

    expect(unsubscribeFirst).toBe(stopFirst);
    expect(unsubscribeSecond).toBe(stopSecond);
    unsubscribeFirst();
    expect(stopFirst).toHaveBeenCalledOnce();
    expect(stopSecond).not.toHaveBeenCalled();
  });

  it('forwards snapshot data and reports subscription errors', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { subscribeToRealTimeDB } = await import('./firebase');
    const onData = vi.fn();
    subscribeToRealTimeDB('users/example', onData);
    const [, onSnapshot, onError] = mocks.onValue.mock.calls[0];
    onSnapshot({ val: () => ({ name: 'Example' }) });
    expect(onData).toHaveBeenCalledWith({ name: 'Example' });
    const error = new Error('Permission denied');
    onError(error);
    expect(errorLog).toHaveBeenCalledWith('Error subscribing to RTDB path users/example:', error);
  });
});

describe('optional Analytics initialization', () => {
  it('skips Analytics in unsupported environments', async () => {
    const { analytics } = await import('./firebase');
    await expect(analytics).resolves.toBeNull();
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
  });

  it('initializes Analytics when supported', async () => {
    mocks.isSupported.mockResolvedValue(true);
    const { analytics } = await import('./firebase');
    await expect(analytics).resolves.toEqual({ name: 'analytics' });
    expect(mocks.getAnalytics).toHaveBeenCalledOnce();
  });

  it('recovers when the support check rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.isSupported.mockRejectedValue(new Error('Storage unavailable'));
    const { analytics } = await import('./firebase');
    await expect(analytics).resolves.toBeNull();
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
  });

  it('recovers when Analytics initialization throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.isSupported.mockResolvedValue(true);
    mocks.getAnalytics.mockImplementationOnce(() => { throw new Error('Analytics unavailable'); });
    const { analytics } = await import('./firebase');
    await expect(analytics).resolves.toBeNull();
  });
});
