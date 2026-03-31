import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone,
  Shield, 
  Zap, 
  Calendar, 
  LogOut, 
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  Camera,
  Briefcase,
  Trophy,
  FileText,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

const JOB_TITLE_SUGGESTIONS = [
  'Técnico de Som',
  'Engenheiro Eletrónico',
  'Reparador de Amplificadores',
  'Técnico de Bancada',
  'Especialista em Áudio'
];

const BIO_TAG_SUGGESTIONS = [
  'Classe D',
  'Fontes SMPS',
  'Classe AB',
  'Classe H',
  'EEEngine',
  'Diagnóstico Rápido',
  'Som Profissional',
  'Eletrónica de Potência'
];

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onOpenPayment: () => void;
  t: any;
}

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  userProfile, 
  onOpenPayment,
  t
}: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    jobTitle: '',
    technicalLevel: '',
    bio: '',
    photoURL: '',
    language: 'pt' as 'pt' | 'en'
  });

  useEffect(() => {
    if (userProfile) {
      setEditData({
        displayName: userProfile.displayName || '',
        jobTitle: userProfile.jobTitle || '',
        technicalLevel: userProfile.technicalLevel || '',
        bio: userProfile.bio || '',
        photoURL: userProfile.photoURL || '',
        language: userProfile.language || 'pt'
      });
    }
  }, [userProfile, isOpen]);

  if (!isOpen || !userProfile) return null;

  const handleSave = async () => {
    if (!userProfile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          displayName: editData.displayName,
          jobTitle: editData.jobTitle,
          technicalLevel: editData.technicalLevel,
          bio: editData.bio,
          photoURL: editData.photoURL,
          language: editData.language
        })
        .eq('uid', userProfile.uid);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const isExpired = () => {
    if (userProfile.subscriptionType === 'admin' || userProfile.subscriptionType === 'premium' || userProfile.subscriptionType === 'lifetime') return false;
    if (!userProfile.subscriptionExpiresAt) return true;
    return new Date(userProfile.subscriptionExpiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#111] border border-[#222] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-gradient-to-r from-orange-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t.userProfileTitle}</h2>
              <p className="text-xs text-[#666]">{t.accountManagementDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-[#222] rounded-full transition-colors text-orange-500"
                title={t.editProfile}
              >
                <Edit2 className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 hover:bg-[#222] rounded-full transition-colors text-green-500 disabled:opacity-50"
                title={t.saveChanges}
              >
                {isSaving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-[#222] rounded-full transition-colors">
              <X className="w-5 h-5 text-[#555]" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* User Info */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-orange-600 flex items-center justify-center text-3xl font-bold border-4 border-[#222] overflow-hidden">
                {editData.photoURL ? (
                  <img src={editData.photoURL} alt={editData.displayName || ''} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  editData.displayName?.charAt(0) || 'U'
                )}
              </div>
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-[#111] border border-[#222] rounded-full">
                {userProfile.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-orange-500" />
                ) : (
                  <User className="w-4 h-4 text-[#555]" />
                )}
              </div>
            </div>
            
            <div className="w-full space-y-3">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#555] uppercase tracking-widest font-bold block text-left">{t.displayNameLabel}</label>
                    <input 
                      type="text" 
                      value={editData.displayName}
                      onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                      placeholder={t.displayNameLabel}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#555] uppercase tracking-widest font-bold block text-left">{t.photoUrlLabel}</label>
                    <input 
                      type="text" 
                      value={editData.photoURL}
                      onChange={(e) => setEditData({...editData, photoURL: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white">{userProfile.displayName}</h3>
                  <div className="flex items-center justify-center gap-2 text-[#666] text-sm mt-1">
                    {userProfile.phone ? (
                      <>
                        <Phone className="w-3 h-3" />
                        <span>{userProfile.phone}</span>
                      </>
                    ) : userProfile.email && !userProfile.email.endsWith('@phone.app') ? (
                      <>
                        <Mail className="w-3 h-3" />
                        <span>{userProfile.email}</span>
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Profile Fields */}
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#555] uppercase tracking-widest font-bold block text-left flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> {t.jobTitleLabel}
                  </label>
                  <input 
                    type="text" 
                    value={editData.jobTitle}
                    onChange={(e) => setEditData({...editData, jobTitle: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                    placeholder="Ex: Técnico de Bancada"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {JOB_TITLE_SUGGESTIONS.map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setEditData({...editData, jobTitle: suggestion})}
                        className="text-[9px] px-2 py-1 bg-[#222] hover:bg-orange-600/20 hover:text-orange-500 rounded-full border border-[#333] transition-all text-[#666]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#555] uppercase tracking-widest font-bold block text-left flex items-center gap-2">
                    <Trophy className="w-3 h-3" /> {t.technicalLevelLabel}
                  </label>
                  <select 
                    value={editData.technicalLevel}
                    onChange={(e) => setEditData({...editData, technicalLevel: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all appearance-none"
                  >
                    <option value="">{t.selectLevel}</option>
                    <option value="Iniciante">{t.beginner}</option>
                    <option value="Intermédio">{t.intermediate}</option>
                    <option value="Avançado">{t.advanced}</option>
                    <option value="Sénior">{t.senior}</option>
                    <option value="Especialista">{t.specialist}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#555] uppercase tracking-widest font-bold block text-left flex items-center gap-2">
                    <Globe className="w-3 h-3" /> {t.languageLabel}
                  </label>
                  <select 
                    value={editData.language}
                    onChange={(e) => setEditData({...editData, language: e.target.value as 'pt' | 'en'})}
                    className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all appearance-none"
                  >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#555] uppercase tracking-widest font-bold block text-left flex items-center gap-2">
                    <FileText className="w-3 h-3" /> {t.bioLabel}
                  </label>
                  <textarea 
                    value={editData.bio}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all min-h-[80px] resize-none"
                    placeholder={t.bioPlaceholder}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BIO_TAG_SUGGESTIONS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const currentBio = editData.bio.trim();
                          const newBio = currentBio ? `${currentBio}, ${tag}` : tag;
                          setEditData({...editData, bio: newBio});
                        }}
                        className="text-[9px] px-2 py-1 bg-[#222] hover:bg-orange-600/20 hover:text-orange-500 rounded-full border border-[#333] transition-all text-[#666]"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#222] rounded-lg">
                      <Globe className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">{t.languageLabel}</p>
                      <p className="text-sm text-white">{userProfile.language === 'en' ? 'English' : 'Português'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#222] rounded-lg">
                      <Briefcase className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">{t.jobTitleLabel}</p>
                      <p className="text-sm text-white">{userProfile.jobTitle || (userProfile.role === 'admin' ? t.admin : t.technician)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#222] rounded-lg">
                      <Trophy className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">{t.technicalLevelLabel}</p>
                      <p className="text-sm text-white">{userProfile.technicalLevel || t.notDefined}</p>
                    </div>
                  </div>
                </div>

                {userProfile.bio && (
                  <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#222] rounded-lg">
                        <FileText className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">{t.bioLabel}</p>
                    </div>
                    <p className="text-xs text-[#888] leading-relaxed pl-11">{userProfile.bio}</p>
                  </div>
                )}

                <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#222] rounded-lg">
                      <Calendar className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">{t.memberSince}</p>
                      <p className="text-sm text-white">{formatDate(userProfile.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subscription Card */}
          <div className={`p-5 rounded-2xl border transition-all ${isExpired() ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isExpired() ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                  {isExpired() ? <AlertCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-white">{t.subscriptionStatus}</h4>
                  <p className={`text-xs ${isExpired() ? 'text-red-400' : 'text-green-400'}`}>
                    {(userProfile.subscriptionType === 'admin' || userProfile.subscriptionType === 'lifetime') ? t.lifetimeAccessProfile : 
                     isExpired() ? t.accessExpired : t.subscriptionActive}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isExpired() ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                {userProfile.subscriptionType}
              </div>
            </div>

            {(userProfile.subscriptionType !== 'admin' && userProfile.subscriptionType !== 'lifetime') && (
              <div className="flex items-center gap-2 text-xs text-[#666] mb-4 pl-1">
                <Clock className="w-3 h-3" />
                <span>{t.expiresAt}: {formatDate(userProfile.subscriptionExpiresAt)}</span>
              </div>
            )}

            <button 
              onClick={() => {
                onClose();
                onOpenPayment();
              }}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isExpired() ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-[#222] text-white hover:bg-[#333]'}`}
            >
              <Zap className="w-4 h-4" />
              {isExpired() ? t.activateNow : t.renewUpgrade}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0a0a0a] border-t border-[#222] text-center">
          <p className="text-[10px] text-[#444] uppercase tracking-[0.2em]">
            AFD-DIAGNÓSTICO PRO
          </p>
        </div>
      </motion.div>
    </div>
  );
}
