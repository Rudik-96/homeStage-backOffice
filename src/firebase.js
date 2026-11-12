import { initializeApp } from 'firebase/app';
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
const functions = getFunctions(firebaseApp, 'us-central1');
const adminApi = httpsCallable(functions, 'backOfficeApi', { timeout: 60000 });

// The password lives only in this browser tab (sessionStorage). It is sent to our server
// with every request, and the server checks it. The password is NOT in this code.
const KEY = 'bo.password';

export function savedPassword() {
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch (e) {
    return '';
  }
}

export function savePassword(password) {
  try {
    if (password) sessionStorage.setItem(KEY, password);
    else sessionStorage.removeItem(KEY);
  } catch (e) {
    // the page works without it
  }
}

export async function api(action, data = {}, password = savedPassword()) {
  const result = await adminApi({ action, password, ...data });
  return result.data;
}
