import type { FirebaseOptions } from 'firebase/app';

const fields = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
  databaseURL: 'VITE_FIREBASE_DATABASE_URL',
} as const;

/** Read only public Firebase web configuration; never include server credentials. */
export function readFirebaseConfig(env: Record<string, unknown>): FirebaseOptions {
  const config: FirebaseOptions = {};
  const missing: string[] = [];

  for (const [field, variable] of Object.entries(fields)) {
    const value = env[variable];
    if (typeof value !== 'string' || !value.trim()) {
      missing.push(variable);
    } else {
      config[field] = value.trim();
    }
  }

  if (missing.length) {
    throw new Error(
      `Missing Firebase configuration: ${missing.join(', ')}. ` +
      'Copy .env.example to .env.local, fill in your Firebase web app settings, and restart Vite.',
    );
  }

  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID;
  if (typeof measurementId === 'string' && measurementId.trim()) {
    config.measurementId = measurementId.trim();
  }
  return config;
}
