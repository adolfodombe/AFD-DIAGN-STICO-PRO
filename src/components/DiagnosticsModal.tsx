import { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Search, 
  Calendar, 
  ChevronRight, 
  Trash2,
  FileText,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import Markdown from 'react-markdown';

interface Diagnosis {
  id: string;
  amplifierModel: string;
  symptoms: string;
  recommendations: string;
  createdAt: string;
  fullHistory?: any[];
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  t: any;
  initialSelectedId?: string | null;
  onRestore?: (history: any[]) => void;
}

export default function DiagnosticsModal({ isOpen, onClose, userId, t, initialSelectedId, onRestore }: DiagnosticsModalProps) {
  const [diagnostics, setDiagnostics] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    setLoading(true);
    
    const fetchDiagnostics = async () => {
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching diagnostics:', error);
      } else {
        setDiagnostics(data as Diagnosis[]);
        if (initialSelectedId) {
          const found = data.find(d => d.id === initialSelectedId);
          if (found) setSelectedDiagnosis(found as Diagnosis);
        }
      }
      setLoading(false);
    };

    fetchDiagnostics();

    const channel = supabase
      .channel('diagnostics-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'diagnostics',
        filter: `userId=eq.${userId}`
      }, () => {
        fetchDiagnostics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, userId, initialSelectedId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('diagnostics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (selectedDiagnosis?.id === id) setSelectedDiagnosis(null);
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting diagnosis:', error);
    }
  };

  const handleRestore = async () => {
    if (!selectedDiagnosis?.fullHistory || !onRestore) return;
    setIsRestoring(true);
    try {
      await onRestore(selectedDiagnosis.fullHistory);
      setRestoringId(null);
    } finally {
      setIsRestoring(false);
    }
  };

  const filtered = diagnostics.filter(d => 
    d.amplifierModel.toLowerCase().includes(search.toLowerCase()) ||
    d.symptoms.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-[85vh] bg-[#0a0a0a] border border-[#222] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.myDiagnostics}</h2>
              <p className="text-[10px] text-[#555] uppercase tracking-widest">{t.personalTechnicalArchive}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#222] rounded-full transition-colors text-[#555] hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* List Sidebar */}
          <div className="w-full md:w-80 border-r border-[#222] flex flex-col bg-[#0a0a0a]">
            <div className="p-4 border-b border-[#222]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                <input 
                  type="text"
                  placeholder={t.searchModel}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl py-2 pl-10 pr-4 text-xs focus:border-orange-500/50 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  <span className="text-[10px] text-[#444] uppercase font-mono">{t.loading}</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <FileText className="w-8 h-8 text-[#222] mx-auto mb-2" />
                  <p className="text-xs text-[#444]">{t.noDiagnosisFound}</p>
                </div>
              ) : (
                filtered.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDiagnosis(d)}
                    className={`
                      w-full p-3 rounded-xl text-left transition-all group relative
                      ${selectedDiagnosis?.id === d.id ? 'bg-orange-600/10 border border-orange-500/30' : 'hover:bg-[#111] border border-transparent'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-orange-500 font-bold uppercase truncate max-w-[140px]">
                        {d.amplifierModel}
                      </span>
                      <span className="text-[9px] text-[#444] font-mono">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#888] line-clamp-2 leading-relaxed">
                      {d.symptoms}
                    </p>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(d.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Details View */}
          <div className="hidden md:flex flex-1 flex-col bg-[#050505] overflow-hidden">
            {selectedDiagnosis ? (
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-500">
                      <Wrench className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t.technicalReport}</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{selectedDiagnosis.amplifierModel}</h3>
                    <div className="flex items-center gap-4 text-[10px] text-[#555] font-mono">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(selectedDiagnosis.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> ID: {selectedDiagnosis.id.substring(0,8)}</span>
                    </div>
                  </div>
                  
                  {onRestore && selectedDiagnosis.fullHistory && (
                    <button 
                      onClick={() => setRestoringId(selectedDiagnosis.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-orange-600/20"
                    >
                      <History className="w-4 h-4" />
                      {t.restoreToChat}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <section className="space-y-4">
                    <h4 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-orange-500" /> {t.describedSymptoms}
                    </h4>
                    <div className="bg-[#111] border border-[#222] p-5 rounded-2xl text-sm text-[#aaa] leading-relaxed whitespace-pre-wrap">
                      {selectedDiagnosis.symptoms}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> {t.assistantRecommendations}
                    </h4>
                    <div className="bg-[#111] border border-[#222] p-5 rounded-2xl text-sm text-[#ccc] leading-relaxed markdown-body prose prose-invert prose-sm max-w-none prose-headings:text-orange-500 prose-strong:text-orange-400">
                      <Markdown>{selectedDiagnosis.recommendations}</Markdown>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-20 h-20 bg-[#111] border border-[#222] rounded-3xl flex items-center justify-center">
                  <History className="w-10 h-10 text-[#222]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{t.selectDiagnosis}</h3>
                  <p className="text-sm text-[#444]">{t.selectDiagnosisDesc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Confirmation Overlay */}
        <AnimatePresence>
          {deletingId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
            >
              <div className="max-w-xs space-y-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">{t.confirmDeleteDiagnosis}</h3>
                  <p className="text-sm text-[#666]">{t.confirmDeleteDiagnosisDesc || t.confirmDeleteCodeDesc}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={(e) => handleDelete(deletingId, e)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
                  >
                    {t.delete}
                  </button>
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="w-full py-3 bg-[#222] hover:bg-[#333] text-white font-bold rounded-xl transition-all"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {restoringId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
            >
              <div className="max-w-xs space-y-6">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                  <History className="w-8 h-8 text-orange-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">{t.restoreToChat}</h3>
                  <p className="text-sm text-[#666]">{t.confirmRestore}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : t.yes}
                  </button>
                  <button 
                    onClick={() => setRestoringId(null)}
                    disabled={isRestoring}
                    className="w-full py-3 bg-[#222] hover:bg-[#333] text-white font-bold rounded-xl transition-all"
                  >
                    {t.no}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
