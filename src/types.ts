export interface Message {
  id?: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number | string;
}

export type SubscriptionType = 'free' | 'premium' | 'admin' | 'lifetime';
export type AppLanguage = 'pt' | 'en';

export interface UserProfile {
  uid: string;
  email?: string;
  phone?: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  subscriptionType: SubscriptionType;
  subscriptionExpiresAt?: string;
  createdAt: string;
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
  usedAt?: string;
  createdAt: string;
}
