import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toDate(dt: any) {
  if (!dt) return new Date();
  if (dt instanceof Timestamp) return dt.toDate();
  if (typeof dt === 'string') return new Date(dt);
  if (dt?.seconds) return new Date(dt.seconds * 1000);
  return new Date(dt);
}

export function getCurrencySymbol(currency: string = 'USD') {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    NGN: '₦'
  };
  return symbols[currency] || '$';
}
