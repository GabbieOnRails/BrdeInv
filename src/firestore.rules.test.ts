import { 
  assertFails, 
  assertSucceeds, 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'lumina-invoice-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  const getUnauthenticatedContext = () => testEnv.unauthenticatedContext();
  const getAuthenticatedContext = (uid: string, emailVerified = true) => 
    testEnv.authenticatedContext(uid, { email_verified: emailVerified });

  describe('User Profiles', () => {
    it('should allow a user to create their own profile', async () => {
      const db = getAuthenticatedContext('alice').firestore();
      const profileDoc = doc(db, 'users/alice');
      await assertSucceeds(setDoc(profileDoc, {
        businessName: 'Alice Corp',
        businessEmail: 'alice@example.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });

    it('should deny creating a profile for another user', async () => {
      const db = getAuthenticatedContext('alice').firestore();
      const profileDoc = doc(db, 'users/bob');
      await assertFails(setDoc(profileDoc, {
        businessName: 'Bob Corp',
        businessEmail: 'bob@example.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });

    it('should deny creating a profile if email is not verified', async () => {
      const db = getAuthenticatedContext('alice', false).firestore();
      const profileDoc = doc(db, 'users/alice');
      await assertFails(setDoc(profileDoc, {
        businessName: 'Alice Corp',
        businessEmail: 'alice@example.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });

    it('should deny updating createdAt', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users/alice'), {
          businessName: 'Alice Corp',
          businessEmail: 'alice@example.com',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      const db = getAuthenticatedContext('alice').firestore();
      const profileDoc = doc(db, 'users/alice');
      await assertFails(updateDoc(profileDoc, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });
  });

  describe('Invoices', () => {
    beforeEach(async () => {
      // Create user profile first (needed by exists() check in create)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users/alice'), { businessName: 'Alice' });
      });
    });

    it('should allow user to create an invoice in their collection', async () => {
      const db = getAuthenticatedContext('alice').firestore();
      const invoiceDoc = doc(db, 'users/alice/invoices/inv123');
      await assertSucceeds(setDoc(invoiceDoc, {
        userId: 'alice',
        invoiceNumber: 'INV-001',
        type: 'invoice',
        status: 'draft',
        totalAmount: 100,
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });

    it('should deny creating an invoice if user profile does not exist', async () => {
      const db = getAuthenticatedContext('bob').firestore();
      const invoiceDoc = doc(db, 'users/bob/invoices/inv123');
      await assertFails(setDoc(invoiceDoc, {
        userId: 'bob',
        invoiceNumber: 'INV-001',
        type: 'invoice',
        status: 'draft',
        items: [],
        totalAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });

    it('should deny deleting a paid invoice', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users/alice/invoices/paid123'), {
          status: 'paid',
          userId: 'alice'
        });
      });

      const db = getAuthenticatedContext('alice').firestore();
      await assertFails(deleteDoc(doc(db, 'users/alice/invoices/paid123')));
    });

    it('should allow deleting a draft invoice', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users/alice/invoices/draft123'), {
          status: 'draft',
          userId: 'alice'
        });
      });

      const db = getAuthenticatedContext('alice').firestore();
      await assertSucceeds(deleteDoc(doc(db, 'users/alice/invoices/draft123')));
    });
  });
});
