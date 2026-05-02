import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: Date | Timestamp;
  method: 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
  createdAt: Date | Timestamp;
}

export interface Invoice {
  id?: string;
  userId: string;
  invoiceNumber: string;
  type: 'invoice' | 'receipt';
  date: Date | Timestamp;
  dueDate?: Date | Timestamp;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  items: InvoiceItem[];
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  templateId: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface UserProfile {
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone?: string;
  defaultCurrency: string;
  defaultTemplateId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  logoUrl?: string;
}

export const invoiceService = {
  async getInvoices(userId: string) {
    const path = `users/${userId}/invoices`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getInvoice(userId: string, invoiceId: string) {
    const path = `users/${userId}/invoices/${invoiceId}`;
    try {
      const docRef = doc(db, path);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Invoice;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createInvoice(userId: string, invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) {
    const invoiceId = crypto.randomUUID();
    const path = `users/${userId}/invoices/${invoiceId}`;
    try {
      const data = {
        ...invoice,
        paidAmount: invoice.paidAmount || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, path), data);
      return invoiceId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateInvoice(userId: string, invoiceId: string, updates: Partial<Invoice>) {
    const path = `users/${userId}/invoices/${invoiceId}`;
    try {
      const data = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, path), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteInvoice(userId: string, invoiceId: string) {
    const path = `users/${userId}/invoices/${invoiceId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Payments
  async getPayments(userId: string, invoiceId: string) {
    const path = `users/${userId}/invoices/${invoiceId}/payments`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addPayment(userId: string, invoiceId: string, payment: Omit<Payment, 'id' | 'createdAt'>) {
    const paymentId = crypto.randomUUID();
    const invoicePath = `users/${userId}/invoices/${invoiceId}`;
    const paymentPath = `${invoicePath}/payments/${paymentId}`;
    
    try {
      // 1. Create the payment record
      await setDoc(doc(db, paymentPath), {
        ...payment,
        createdAt: serverTimestamp(),
      });

      // 2. Update the invoice paid amount and status
      const invoiceDoc = await getDoc(doc(db, invoicePath));
      if (invoiceDoc.exists()) {
        const invoice = invoiceDoc.data() as Invoice;
        const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
        let newStatus = invoice.status;

        if (newPaidAmount >= invoice.totalAmount) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        await updateDoc(doc(db, invoicePath), {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      
      return paymentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, paymentPath);
    }
  }
};

export const userService = {
  async getProfile(userId: string) {
    const path = `users/${userId}`;
    try {
      const snapshot = await getDoc(doc(db, path));
      if (snapshot.exists()) {
        return snapshot.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async updateProfile(userId: string, profile: UserProfile) {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, path);
      const snapshot = await getDoc(docRef);
      
      const data: any = {
        ...profile,
        updatedAt: serverTimestamp(),
      };

      if (!snapshot.exists()) {
        data.createdAt = serverTimestamp();
      }

      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
