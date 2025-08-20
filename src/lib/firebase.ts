import { readFirebaseConfig } from './firebaseConfig';

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork, enableIndexedDbPersistence, onSnapshot, doc } from 'firebase/firestore';
import { getDatabase, ref as rtdbRef, onValue } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';


const firebaseConfig = readFirebaseConfig(import.meta.env);

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);

// Initialize auth with offline persistence
export const auth = getAuth(app);
auth.useDeviceLanguage(); // Set language to device default

// Initialize Firestore with persistence
export const db = getFirestore(app);

// Initialize Realtime Database
export const rtdb = getDatabase(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  console.error('Failed to enable offline persistence:', err);
});

// Initialize analytics only if supported
const analyticsPromise = isSupported().then(yes => yes ? getAnalytics(app) : null);
export const analytics = analyticsPromise;

// Function to check Firebase connection status
export const checkFirebaseConnection = async () => {
  try {
    // First try to disable network to clear any existing connection
    await disableNetwork(db);
    
    // Then try to enable network and wait for it to complete
    await enableNetwork(db);
    
    // If we get here, the connection was successful
    console.log('Firebase connection successful');
    return true;
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    // Re-enable network in case of error to ensure we don't leave it disabled
    try {
      await enableNetwork(db);
    } catch (enableError) {
      console.error('Failed to re-enable network:', enableError);
    }
    return false;
  }
};

// Enhanced real-time subscription utilities
export const subscribeToDocument = (collectionName, docId, callback) => {
  const docRef = doc(db, collectionName, docId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`Error subscribing to ${collectionName}/${docId}:`, error);
  });
};

export const subscribeToRealTimeDB = (path, callback) => {
  const reference = rtdbRef(rtdb, path);
  return onValue(reference, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  }, (error) => {
    console.error(`Error subscribing to RTDB path ${path}:`, error);
  });
};
