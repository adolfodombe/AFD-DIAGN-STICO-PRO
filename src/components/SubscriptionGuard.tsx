import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Zap, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import PaymentModal from './PaymentModal';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  userProfile: UserProfile | null;
  loading: boolean;
  onOpenPaymentModal: () => void;
  t: any;
}

export default function SubscriptionGuard({ children, userProfile, loading, onOpenPaymentModal, t }: SubscriptionGuardProps) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    const updateCountdown = () => {
      if (userProfile.subscriptionType === 'admin' || userProfile.subscriptionType === 'lifetime') {
        setTimeLeft(t.lifetimeAccess);
        setIsExpired(false);
        return;
      }

      const expiry = userProfile.subscriptionExpiresAt ? new Date(userProfile.subscriptionExpiresAt) : null;
      if (!expiry) {
        setIsExpired(true);
        return;
      }

      const now = new Date();
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(t.expired);
      } else {
        setIsExpired(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else {
          setTimeLeft(`${hours}h ${minutes}m`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [userProfile]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return <>{children}</>; // Let App.tsx handle the login screen
  }

  const isAccessBlocked = isExpired && userProfile.subscriptionType !== 'admin' && userProfile.subscriptionType !== 'premium' && userProfile.subscriptionType !== 'lifetime';

  return (
    <>
      {/* Subscription Status Bar (Desktop) */}
      <div className="fixed top-20 right-6 z-40 hidden xl:block">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            p-3 rounded-2xl border backdrop-blur-md shadow-xl flex items-center gap-3
            ${isExpired 
              ? 'bg-red-500/10 border-red-500/20 text-red-500' 
              : userProfile.subscriptionType === 'premium' || userProfile.subscriptionType === 'admin'
                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}
          `}
        >
          <div className="p-2 rounded-lg bg-current/10">
            {isExpired ? <ShieldAlert className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">
              {userProfile.subscriptionType === 'admin' ? t.lifetimePlan : 
               userProfile.subscriptionType === 'premium' ? t.premiumPlan : t.freePlan}
            </p>
            <p className="text-xs font-mono font-bold">{timeLeft}</p>
          </div>
          {!isAccessBlocked && (
            <button 
              onClick={onOpenPaymentModal}
              className="ml-2 p-1.5 hover:bg-current/10 rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Block Screen */}
      <AnimatePresence>
        {isAccessBlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-[#0a0a0a]/95 backdrop-blur-xl"
          >
            <div className="max-w-md w-full text-center space-y-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
                  <Lock className="w-12 h-12 text-red-500" />
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center border-4 border-[#0a0a0a]"
                >
                  <Zap className="w-4 h-4 text-white" />
                </motion.div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-white">
                  {userProfile.subscriptionType === 'free' ? t.trialEnded : t.accessExpired}
                </h2>
                <p className="text-[#666] text-sm leading-relaxed">
                  {userProfile.subscriptionType === 'free' 
                    ? t.trialEndedDesc
                    : t.accessExpiredDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={onOpenPaymentModal}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  {t.activateNow}
                </button>
                <p className="text-[10px] text-[#444] uppercase tracking-widest">
                  {t.localPaymentDesc}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={isAccessBlocked ? 'blur-sm pointer-events-none' : ''}>
        {children}
      </div>
    </>
  );
}
