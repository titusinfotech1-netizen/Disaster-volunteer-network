import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0875404322",
  appId: "1:842659262261:web:5c058e89cc4d68ceb1267c",
  apiKey: "AIzaSyCXrXBiKAkfBicXnN05L-y8phze9vTI0Y0",
  authDomain: "gen-lang-client-0875404322.firebaseapp.com",
  databaseURL: "(default)",
  storageBucket: "gen-lang-client-0875404322.firebasestorage.app",
  messagingSenderId: "842659262261",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "ai-studio-d0eab350-1d5f-4df5-bba0-12127b838316");
