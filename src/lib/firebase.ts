import { initializeApp, FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Try to get config from environment variables first
const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if we have the minimum required config from environment
const hasEnvConfig = config.apiKey && config.projectId;

let finalConfig = config;
let firestoreDatabaseId: string | undefined = import.meta.env.VITE_FIREBASE_DATABASE_ID;

if (!hasEnvConfig) {
  try {
    // Fallback to the AI Studio generated config if environment variables are missing
    // We use a static import here which Vite will resolve during build
    // @ts-ignore
    const appletConfig = await import('../../firebase-applet-config.json');
    const data = appletConfig.default || appletConfig;
    finalConfig = {
      apiKey: data.apiKey,
      authDomain: data.authDomain,
      projectId: data.projectId,
      storageBucket: data.storageBucket,
      messagingSenderId: data.messagingSenderId,
      appId: data.appId,
    };
    if (!firestoreDatabaseId) {
      firestoreDatabaseId = data.firestoreDatabaseId;
    }
  } catch (e) {
    console.error('Firebase configuration missing. Please set environment variables or ensure firebase-applet-config.json exists.');
  }
}

const app = initializeApp(finalConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
