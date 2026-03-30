import { X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBrand: (brand: string) => void;
  specialtyName: string;
  brands: string[];
  t: any;
}

export default function BrandsModal({ isOpen, onClose, onSelectBrand, specialtyName, brands, t }: BrandsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-[#222] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{specialtyName}</h2>
                <p className="text-[10px] uppercase tracking-widest text-orange-500 font-mono mt-1">{t.brandsTitle}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-[#1a1a1a] rounded-full transition-colors text-[#555] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {brands.map((brand) => (
                  <button 
                    key={brand}
                    onClick={() => onSelectBrand(brand)}
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-orange-500/50 transition-all group text-left"
                  >
                    <div className="w-2 h-2 rounded-full bg-orange-600/20 group-hover:bg-orange-500 transition-colors" />
                    <span className="text-sm text-[#888] group-hover:text-white transition-colors font-medium">{brand}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-[#0a0a0a] border-t border-[#222]">
              <div className="flex items-center gap-3 p-4 bg-orange-600/5 border border-orange-500/20 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[11px] text-[#888] leading-relaxed">
                  O **AFD-DIAGNÓSTICO PRO** utiliza esquemas técnicos e manuais de serviço de todas estas marcas para fornecer diagnósticos precisos.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full mt-4 py-3 bg-[#1a1a1a] border border-[#222] text-white rounded-xl text-xs font-bold hover:bg-[#222] transition-all active:scale-95"
              >
                {t.cancel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
