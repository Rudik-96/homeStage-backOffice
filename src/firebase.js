import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// The same Firebase project as the app. These keys are public (not secrets).
const firebaseConfig = {
  apiKey: 'AIzaSyCVz2lRzu-Rig0huWfsP1hRzFokokqP8h8',
  authDomain: 'homestage-web.firebaseapp.com',
  projectId: 'homestage-web',
  storageBucket: 'homestage-web.firebasestorage.app',
  messagingSenderId: '605542245284',
  appId: '1:605542245284:web:b415163c42008a2218d731',
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
const functions = getFunctions(firebaseApp, 'us-central1');
const adminApi = httpsCallable(functions, 'adminApi', { timeout: 60000 });

// All data comes from our server. The server checks that you are an admin.
export async function api(action, data = {}) {
  const result = await adminApi({ action, ...data });
  return result.data;
}
