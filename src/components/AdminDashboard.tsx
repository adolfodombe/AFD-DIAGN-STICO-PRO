import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Filter,
  Calendar,
  Clock,
  X,
  Loader2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface ActivationCode {
  id: string;
  code: string;
  days: number;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export default function AdminDashboard({ isOpen, onClose, t }: AdminDashboardProps) {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setCodes(data as ActivationCode[]);
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCodes();
    }
  }, [isOpen]);

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const prefix = selectedDays === 7 ? 'WEEK' : 'MONTH';
      
      const generateRandom = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      let newCode = `${prefix}-${generateRandom()}`;
      
      const { data: existing } = await supabase
        .from('activation_codes')
        .select('code')
        .eq('code', newCode)
        .maybeSingle();
      
      if (existing) {
        newCode = `${prefix}-${generateRandom()}`;
      }

      const { error } = await supabase
        .from('activation_codes')
        .insert([{
          code: newCode,
          days: selectedDays,
          isUsed: false,
          createdAt: new Date().toISOString()
        }]);

      if (error) throw error;
      await fetchCodes();
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activation_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCodes(codes.filter(c => c.id !== id));
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.usedBy && c.usedBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111] border border-[#222] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t.adminPanelTitle}</h2>
              <p className="text-xs text-[#666]">{t.activationCodeManagement}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#222] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#555]" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Controls */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[#222] p-6 space-y-6 bg-[#0a0a0a]">
            <section className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest text-[#555] font-bold">{t.generateNewCode}</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setSelectedDays(7)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${selectedDays === 7 ? 'border-blue-600 bg-blue-600/10 text-white' : 'border-[#222] text-[#666] hover:border-[#333]'}`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.weekly} (7 {t.daysLabel})</span>
                  </div>
                  {selectedDays === 7 && <Check className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setSelectedDays(30)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${selectedDays === 30 ? 'border-blue-600 bg-blue-600/10 text-white' : 'border-[#222] text-[#666] hover:border-[#333]'}`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.monthly} (30 {t.daysLabel})</span>
                  </div>
                  {selectedDays === 30 && <Check className="w-4 h-4" />}
                </button>
              </div>
              <button 
                onClick={generateCode}
                disabled={isGenerating}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t.generateCode}
              </button>
            </section>

            <section className="space-y-4 pt-6 border-t border-[#222]">
              <h3 className="text-[10px] uppercase tracking-widest text-[#555] font-bold">{t.statistics}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#111] border border-[#222] rounded-xl">
                  <p className="text-[10px] text-[#555] uppercase">{t.total}</p>
                  <p className="text-xl font-bold text-white">{codes.length}</p>
                </div>
                <div className="p-3 bg-[#111] border border-[#222] rounded-xl">
                  <p className="text-[10px] text-[#555] uppercase">{t.used}</p>
                  <p className="text-xl font-bold text-green-500">{codes.filter(c => c.isUsed).length}</p>
                </div>
              </div>
            </section>
          </div>

          {/* List */}
          <div className="flex-1 flex flex-col bg-[#111]">
            <div className="p-4 border-b border-[#222] flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                <input 
                  type="text"
                  placeholder={t.searchCodeOrUser}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl pl-10 pr-4 py-2 text-sm focus:border-blue-600 outline-none transition-all"
                />
              </div>
              <button 
                onClick={fetchCodes}
                className="p-2 hover:bg-[#222] rounded-lg transition-colors text-[#666]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : filteredCodes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#444]">
                  <Zap className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">{t.noCodeFound}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCodes.map((code) => (
                    <div 
                      key={code.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${code.isUsed ? 'bg-[#0a0a0a] border-[#222] opacity-60' : 'bg-[#1a1a1a] border-[#222] hover:border-[#333]'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${code.days === 7 ? 'bg-orange-600/10 text-orange-500' : 'bg-blue-600/10 text-blue-500'}`}>
                          {code.days === 7 ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-white tracking-wider">{code.code}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#555] uppercase font-bold">{code.days} {t.daysLabel}</span>
                            <span className="text-[10px] text-[#333]">•</span>
                            <span className="text-[10px] text-[#555]">{new Date(code.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {code.isUsed ? (
                          <div className="text-right mr-4">
                            <p className="text-[10px] text-green-500 font-bold uppercase">{t.usedStatus}</p>
                            <p className="text-[9px] text-[#444] font-mono">{code.usedBy?.substring(0, 8)}...</p>
                          </div>
                        ) : (
                          <button 
                            onClick={() => copyToClipboard(code.code, code.id)}
                            className="p-2 hover:bg-[#222] rounded-lg transition-colors text-blue-500 flex items-center gap-2 text-xs font-bold"
                          >
                            {copiedId === code.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedId === code.id ? t.copied : t.copy}
                          </button>
                        )}
                        <button 
                          onClick={() => setDeletingId(code.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[#333] hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {deletingId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a1a] border border-red-500/20 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white">{t.confirmDeleteCode}</h4>
                  <p className="text-sm text-[#666]">{t.confirmDeleteCodeDesc}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="flex-1 py-3 bg-[#222] text-[#888] rounded-xl font-bold hover:text-white transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => deleteCode(deletingId)}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all"
                  >
                    {t.delete}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
