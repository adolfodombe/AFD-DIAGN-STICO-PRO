import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Hash, 
  MessageCircle, 
  Copy, 
  CheckCircle2, 
  X, 
  Zap, 
  Calendar, 
  Clock,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  t: any;
}

const PAYMENT_METHODS = {
  MULTICAIXA: {
    name: 'Multicaixa Express',
    number: '932912347',
    icon: Smartphone,
    color: 'bg-blue-600'
  },
  BANK: {
    name: 'Transferência Bancária',
    iban: '000600003793242130154',
    owner: 'Adolfo Faienda Dombe',
    icon: Building2,
    color: 'bg-emerald-600'
  },
  KIWIKI: {
    name: 'Kiwiki',
    number: '932912347',
    icon: Smartphone,
    color: 'bg-orange-600'
  },
  WHATSAPP: {
    name: 'Enviar Comprovativo',
    number: '932912347',
    icon: MessageCircle,
    color: 'bg-green-600'
  }
};

const PLANS = [
  { id: 'weekly', name: 'Semanal', duration: 7, price: '10.000 KZ', icon: Calendar },
  { id: 'monthly', name: 'Mensal', duration: 30, price: '20.000 KZ', icon: Clock }
];

export default function PaymentModal({ isOpen, onClose, userProfile, t }: PaymentModalProps) {
  const PLANS = [
    { id: 'weekly', name: t.weekly, duration: 7, price: '10.000 KZ', icon: Calendar },
    { id: 'monthly', name: t.monthly, duration: 30, price: '20.000 KZ', icon: Clock }
  ];

  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlanName, setActivatedPlanName] = useState('');

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openWhatsApp = () => {
    if (!userProfile || !selectedPlan) {
      setFeedback({ type: 'error', message: t.selectPlanFirst });
      return;
    }
    const message = `Olá, já fiz o pagamento.\nEmail: ${userProfile.email}\nPlano: ${selectedPlan.name}\nSegue o comprovativo.`;
    const url = `https://wa.me/244932912347?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setFeedback({ 
      type: 'success', 
      message: t.proofSentDesc
    });
  };

  const handleActivate = async () => {
    if (!activationCode.trim() || !userProfile) return;
    
    const codePattern = /^(WEEK|MONTH)-[A-Z0-9]{1,10}$/;
    if (!codePattern.test(activationCode.trim())) {
      setFeedback({ type: 'error', message: t.invalidCode });
      return;
    }

    setIsActivating(true);
    setFeedback(null);

    try {
      const { data: codeData, error: codeError } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', activationCode.trim())
        .maybeSingle();

      if (codeError || !codeData) {
        throw new Error('INVALID_CODE');
      }

      if (codeData.isUsed) {
        throw new Error('INVALID_CODE');
      }

      const days = codeData.days;
      const planName = days === 7 ? t.weekly : t.monthly;

      const now = new Date();
      const currentExpiry = userProfile.subscriptionExpiresAt ? new Date(userProfile.subscriptionExpiresAt) : now;
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          subscriptionType: 'premium',
          subscriptionExpiresAt: newExpiry.toISOString()
        })
        .eq('uid', userProfile.uid);

      if (userUpdateError) throw userUpdateError;

      const { error: codeUpdateError } = await supabase
        .from('activation_codes')
        .update({
          isUsed: true,
          usedBy: userProfile.uid,
          usedAt: new Date().toISOString()
        })
        .eq('id', codeData.id);

      if (codeUpdateError) throw codeUpdateError;

      setActivatedPlanName(planName);
      setShowSuccess(true);
      setActivationCode('');
      
    } catch (error: any) {
      console.error("Activation error:", error);
      if (error.message === 'INVALID_CODE') {
        setFeedback({ type: 'error', message: t.invalidCode });
      } else {
        setFeedback({ type: 'error', message: t.activationError });
      }
    } finally {
      setIsActivating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#111] border border-[#222] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-12 flex flex-col items-center text-center space-y-6"
            >
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center relative">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-green-500/20 rounded-full"
                />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">{t.subscriptionSuccess}</h2>
                <p className="text-orange-500 font-bold uppercase tracking-widest text-sm">{activatedPlanName}</p>
              </div>
              
              <p className="text-[#888] max-w-sm leading-relaxed">
                {t.thankYouSubscription}
              </p>
              
              <button
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
                className="px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-[#eee] transition-all flex items-center gap-2 shadow-xl shadow-white/5"
              >
                <Zap className="w-5 h-5" />
                {t.viewFeatures}
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[#222] flex items-center justify-between bg-gradient-to-r from-orange-600/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600 rounded-xl">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t.premiumActivation}</h2>
                    <p className="text-xs text-[#666]">{t.choosePlanDesc}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-[#222] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[#555]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Plans */}
                <section className="space-y-4">
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-4">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.freeTrialPeriod}</h4>
                      <p className="text-xs text-[#888]">{t.freeTrialDesc}</p>
                    </div>
                  </div>

                  <h3 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> {t.availablePlans}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`
                          p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4
                          ${selectedPlan?.id === plan.id 
                            ? 'border-orange-600 bg-orange-600/5' 
                            : 'border-[#222] bg-[#1a1a1a] hover:border-[#333]'}
                        `}
                      >
                        <div className={`p-3 rounded-xl ${selectedPlan?.id === plan.id ? 'bg-orange-600 text-white' : 'bg-[#222] text-[#666]'}`}>
                          <plan.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{plan.name}</h4>
                          <p className="text-xs text-[#888]">{plan.duration} {t.daysOfAccess}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-500">{plan.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Payment Methods */}
                <section className="space-y-4">
                  <h3 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                    <Smartphone className="w-3 h-3" /> {t.paymentMethodsAngola}
                  </h3>
                  <div className="space-y-3">
                    {/* Multicaixa */}
                    <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-[#666]">Multicaixa Express</p>
                          <p className="font-mono text-white">{PAYMENT_METHODS.MULTICAIXA.number}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(PAYMENT_METHODS.MULTICAIXA.number, 'mc')}
                        className="p-2 hover:bg-[#222] rounded-lg transition-colors text-orange-500 flex items-center gap-2 text-xs"
                      >
                        {copiedField === 'mc' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedField === 'mc' ? t.copied : t.copy}
                      </button>
                    </div>

                    {/* Bank Transfer */}
                    <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-600 rounded-lg">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-xs text-[#666]">{t.bankTransfer}</p>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(PAYMENT_METHODS.BANK.iban, 'iban')}
                          className="p-2 hover:bg-[#222] rounded-lg transition-colors text-orange-500 flex items-center gap-2 text-xs"
                        >
                          {copiedField === 'iban' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedField === 'iban' ? t.ibanCopied : t.copyIban}
                        </button>
                      </div>
                      <div className="pl-11 space-y-1">
                        <p className="text-sm font-mono text-white break-all">{PAYMENT_METHODS.BANK.iban}</p>
                        <p className="text-[10px] text-[#555] uppercase tracking-wider">{PAYMENT_METHODS.BANK.owner}</p>
                      </div>
                    </div>
                    
                    {/* Kiwiki */}
                    <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-600 rounded-lg">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-[#666]">Kiwiki</p>
                          <p className="font-mono text-white">{PAYMENT_METHODS.KIWIKI.number}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(PAYMENT_METHODS.KIWIKI.number, 'kiwiki')}
                        className="p-2 hover:bg-[#222] rounded-lg transition-colors text-orange-500 flex items-center gap-2 text-xs"
                      >
                        {copiedField === 'kiwiki' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedField === 'kiwiki' ? t.copied : t.copy}
                      </button>
                    </div>

                    {/* WhatsApp Direct */}
                    <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-[#666]">{t.sendProofWhatsApp}</p>
                          <p className="font-mono text-white">{PAYMENT_METHODS.WHATSAPP.number}</p>
                        </div>
                      </div>
                      <a 
                        href={selectedPlan ? `https://wa.me/244932912347?text=${encodeURIComponent(`Olá, já fiz o pagamento.\nEmail: ${userProfile?.email || 'N/A'}\nPlano: ${selectedPlan.name}\nSegue o comprovativo.`)}` : '#'}
                        target={selectedPlan ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!selectedPlan) {
                            e.preventDefault();
                            setFeedback({ type: 'error', message: t.selectPlanFirst });
                          }
                        }}
                        className="p-2 hover:bg-[#222] rounded-lg transition-colors text-orange-500 text-xs flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t.open}
                      </a>
                    </div>

                    {/* Reference */}
                    <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 rounded-lg">
                          <Hash className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-[#666]">{t.referencePayment}</p>
                          <p className="text-[10px] text-[#555]">{t.availableOnRequest}</p>
                        </div>
                      </div>
                      <a 
                        href={`https://wa.me/244932912347?text=${encodeURIComponent(`Olá, gostaria de pagar por referência.\nEmail: ${userProfile?.email || 'N/A'}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-[#222] rounded-lg transition-colors text-orange-500 text-xs flex items-center gap-2"
                      >
                        {t.request}
                      </a>
                    </div>
                  </div>
                </section>

                {/* WhatsApp Confirmation */}
                <section className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.sendProof}</h4>
                      <p className="text-[10px] text-[#666]">{t.sendProofDesc}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <a 
                      href={selectedPlan ? `https://wa.me/244932912347?text=${encodeURIComponent(`Olá, já fiz o pagamento.\nEmail: ${userProfile?.email || 'N/A'}\nPlano: ${selectedPlan.name}\nSegue o comprovativo.`)}` : '#'}
                      target={selectedPlan ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!selectedPlan) {
                          e.preventDefault();
                          setFeedback({ type: 'error', message: t.selectPlanFirst });
                        } else {
                          setFeedback({ 
                            type: 'success', 
                            message: t.proofSentDesc
                          });
                        }
                      }}
                      className={`w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all flex items-center justify-center gap-2 ${!selectedPlan ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      {t.sendProofWhatsApp}
                    </a>
                    <p className="text-[10px] text-center text-[#555] italic">
                      {t.autoActivationDesc}
                    </p>
                  </div>
                </section>

                {/* Activation Code */}
                <section className="space-y-4">
                  <h3 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                    <Zap className="w-3 h-3" /> {t.insertActivationCode}
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                      placeholder="EX: PREMIUM-XXXX-XXXX"
                      className="flex-1 bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 text-sm font-mono focus:border-orange-500 outline-none transition-all"
                    />
                    <button 
                      onClick={handleActivate}
                      disabled={!activationCode.trim() || isActivating}
                      className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-[#eee] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {t.activate}
                    </button>
                  </div>
                </section>

                {/* Feedback */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                    >
                      {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      <p className="text-sm font-medium">{feedback.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#0a0a0a] border-t border-[#222] text-center">
                <p className="text-[10px] text-[#444] uppercase tracking-[0.2em]">
                  {t.technicalSupport}: +244 932 912 347
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
