import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    // Attempt to read a non-existent doc to trigger a server roundtrip
    await getDocFromServer(doc(db, '_internal_', 'connection_test'));
    console.log('Firebase connection verified');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error('Firebase appears to be offline. Check configuration.');
    } else {
      // Normal permission errors or not found are expected if not logged in
      console.log('Firebase connection test completed');
    }
  }
}

// testConnection();
