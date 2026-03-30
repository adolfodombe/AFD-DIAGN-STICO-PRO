import { Timestamp } from './firebase';

export interface Message {
  id?: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

export type SubscriptionType = 'trial' | 'premium' | 'lifetime';
export type AppLanguage = 'pt' | 'en';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  subscriptionType: SubscriptionType;
  subscriptionExpiresAt?: Timestamp;
  createdAt: Timestamp;
  jobTitle?: string;
  technicalLevel?: string;
  bio?: string;
  language?: AppLanguage;
}

export interface ActivationCode {
  id?: string;
  code: string;
  days: number;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdAt: Timestamp;
}
