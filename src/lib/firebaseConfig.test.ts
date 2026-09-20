import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from './firebaseConfig';

const env = {
  VITE_FIREBASE_API_KEY: 'example-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example',
  VITE_FIREBASE_STORAGE_BUCKET: 'example.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:example',
  VITE_FIREBASE_DATABASE_URL: 'https://example-default-rtdb.firebaseio.com',
};

describe('readFirebaseConfig', () => {
  it('maps Vite variables to Firebase settings', () => {
    expect(readFirebaseConfig(env)).toEqual({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    });
  });

  it('lists all missing fields and gives setup instructions', () => {
    expect(() => readFirebaseConfig({})).toThrow('VITE_FIREBASE_API_KEY');
    expect(() => readFirebaseConfig({})).toThrow('VITE_FIREBASE_DATABASE_URL');
    expect(() => readFirebaseConfig({})).toThrow('Copy .env.example to .env.local');
  });

  it.each(['', '   ', undefined, 123])('rejects an invalid required value: %s', (value) => {
    expect(() => readFirebaseConfig({ ...env, VITE_FIREBASE_PROJECT_ID: value }))
      .toThrow('VITE_FIREBASE_PROJECT_ID');
  });

  it('trims values and accepts an optional analytics measurement ID', () => {
    expect(readFirebaseConfig({ ...env, VITE_FIREBASE_PROJECT_ID: ' example ',
      VITE_FIREBASE_MEASUREMENT_ID: ' G-EXAMPLE ' }))
      .toMatchObject({ projectId: 'example', measurementId: 'G-EXAMPLE' });
  });

  it('ignores unrelated variables and empty optional values', () => {
    const config = readFirebaseConfig({ ...env, SERVER_SECRET: 'private',
      VITE_FIREBASE_MEASUREMENT_ID: ' ' });
    expect(config).not.toHaveProperty('SERVER_SECRET');
    expect(config).not.toHaveProperty('measurementId');
  });
});
