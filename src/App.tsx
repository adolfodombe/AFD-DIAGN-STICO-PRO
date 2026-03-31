/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Wrench, 
  Camera, 
  Send, 
  Cpu, 
  Activity, 
  ShieldAlert, 
  ShieldCheck,
  Zap, 
  History,
  Trash2,
  ImagePlus,
  Loader2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Info,
  LogIn,
  LogOut,
  User as UserIcon,
  Mic,
  MicOff,
  Save,
  Palette,
  PlusCircle,
  Menu,
  X,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import ErrorBoundary from './components/ErrorBoundary';
import SubscriptionGuard from './components/SubscriptionGuard';
import { Message, UserProfile, SubscriptionType } from './types';
import PaymentModal from './components/PaymentModal';
import UserProfileModal from './components/UserProfileModal';
import AdminDashboard from './components/AdminDashboard';
import DiagnosticsModal from './components/DiagnosticsModal';
import BrandsModal from './components/BrandsModal';
import { getTranslation } from './translations';

// Initialize Gemini is now handled inside handleSubmit for reliability

// Remove old SYSTEM_INSTRUCTION constant as it's now in translations.ts

export default function App() {
  return (
    <ErrorBoundary>
      <FixMasterApp />
    </ErrorBoundary>
  );
}

function FixMasterApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isBrandsModalOpen, setIsBrandsModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<{ name: string, brands: string[] } | null>(null);
  const [themeColor, setThemeColor] = useState<'orange' | 'blue' | 'green' | 'purple' | 'red'>('orange');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [recentDiagnostics, setRecentDiagnostics] = useState<any[]>([]);
  const [diagnosticsCount, setDiagnosticsCount] = useState(0);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string | null>(null);
  const [checkedComponents, setCheckedComponents] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = getTranslation(userProfile?.language || 'pt');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('_non_existent_table_just_to_check_connection_').select('id').limit(1);
        // If it's a 401 or 404, it means we connected but the table doesn't exist, which is fine for a connection check
        // If it's a network error, it will throw or have a specific error code
        if (error && error.message.includes('fetch')) {
          setSupabaseStatus('offline');
        } else {
          setSupabaseStatus('online');
        }
      } catch (err) {
        setSupabaseStatus('offline');
      }
    };
    checkSupabase();
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setInput(prev => prev + event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setSpeechError('Erro na captura de áudio. Verifique o microfone.');
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setSpeechError('Seu navegador não suporta transcrição de voz.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setSpeechError(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recognition', err);
        setIsRecording(false);
      }
    }
  };

  useEffect(() => {
    const initVisitor = async () => {
      setProfileLoading(true);
      let visitorId = localStorage.getItem('fixmaster_visitor_id');
      
      if (!visitorId) {
        visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('fixmaster_visitor_id', visitorId);
      }

      // Try to fetch profile from Supabase using visitorId
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', visitorId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create new visitor profile
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 3);

        const newProfile: UserProfile = {
          uid: visitorId,
          displayName: 'Visitante Técnico',
          photoURL: '',
          role: 'user',
          subscriptionType: 'free',
          subscriptionExpiresAt: trialExpiry.toISOString(),
          createdAt: new Date().toISOString(),
          language: 'pt'
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([newProfile]);

        if (!insertError) {
          setUserProfile(newProfile);
        } else {
          // Fallback to local state if DB insert fails
          setUserProfile(newProfile);
        }
      } else if (data) {
        setUserProfile(data as UserProfile);
      }
      setProfileLoading(false);
    };

    initVisitor();

    // Set up realtime subscription for profile if we have a visitorId
    const visitorId = localStorage.getItem('fixmaster_visitor_id');
    if (visitorId) {
      const profileSubscription = supabase
        .channel(`profile:${visitorId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users',
          filter: `uid=eq.${visitorId}`
        }, (payload) => {
          setUserProfile(payload.new as UserProfile);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(profileSubscription);
      };
    }
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('userId', userProfile.uid)
        .order('timestamp', { ascending: true });

      if (!error) {
        setMessages(data as Message[]);
      }
    };

    fetchMessages();

    const messagesSubscription = supabase
      .channel(`messages:${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `userId=eq.${userProfile.uid}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile) {
      setRecentDiagnostics([]);
      setDiagnosticsCount(0);
      return;
    }

    const fetchDiagnostics = async () => {
      const { data, error, count } = await supabase
        .from('diagnostics')
        .select('*', { count: 'exact' })
        .eq('userId', userProfile.uid)
        .order('createdAt', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching diagnostics:', error);
      } else {
        setRecentDiagnostics(data || []);
        setDiagnosticsCount(count || 0);
      }
    };

    fetchDiagnostics();

    // Set up realtime subscription for diagnostics
    const diagnosticsSubscription = supabase
      .channel(`diagnostics:${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'diagnostics',
        filter: `userId=eq.${userProfile.uid}`
      }, () => {
        fetchDiagnostics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(diagnosticsSubscription);
    };
  }, [userProfile?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateImage = async () => {
    if (!input.trim() || !userProfile) return;
    
    setLoading(true);
    setIsGeneratingImage(true);
    const path = 'messages';

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const genAI = new GoogleGenAI({ apiKey });
      const prompt = `Gere uma imagem técnica detalhada de eletrônica baseada na seguinte descrição: ${input}. Se for um esquema, mostre os componentes e trilhas de forma profissional. Se for um componente, mostre um close-up realista de alta qualidade.`;
      
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let generatedImageUrl = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (generatedImageUrl) {
        // Save user request to Firestore
        await supabase.from('messages').insert([{
          userId: userProfile.uid,
          role: 'user',
          content: `[Solicitação de Imagem Técnica]: ${input}`,
          timestamp: new Date().toISOString(),
        }]);

        const assistantMessage: Message = {
          userId: userProfile.uid,
          role: 'assistant',
          content: `Aqui está a imagem técnica gerada para: **${input}**`,
          timestamp: new Date().toISOString(),
          image: generatedImageUrl
        };

        // Save assistant response to Supabase
        await supabase.from('messages').insert([{
          userId: userProfile.uid,
          role: 'assistant',
          content: assistantMessage.content,
          image: generatedImageUrl,
          timestamp: new Date().toISOString(),
        }]);
        
        setInput('');
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      return;
    }
    if ((!input.trim() && !image) || loading) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment");
      try {
        await supabase.from('messages').insert([{
          userId: userProfile.uid,
          role: 'assistant',
          content: t.authError,
          timestamp: new Date().toISOString(),
        }]);
      } catch (err) {
        console.error("Failed to save error message:", err);
      }
      return;
    }

    const userMessageContent = input;
    const userMessageImage = image;
    const componentsInfo = checkedComponents.length > 0 
      ? `\n\n[Componentes já verificados pelo técnico: ${checkedComponents.join(', ')}]` 
      : '';

    setInput('');
    setImage(null);
    setCheckedComponents([]);
    setLoading(true);

    const path = 'messages';
    try {
      // Save user message to Supabase
      const messageData: any = {
        userId: userProfile.uid,
        role: 'user',
        content: userMessageContent + componentsInfo,
        timestamp: new Date().toISOString(),
      };
      if (userMessageImage) {
        messageData.image = userMessageImage;
      }

      await supabase.from('messages').insert([messageData]);

      const parts: any[] = [{ text: userMessageContent || "Analise esta imagem do amplificador para diagnóstico técnico." }];
      
      if (userMessageImage) {
        // Extract mimeType and base64 data correctly
        const mimeTypeMatch = userMessageImage.match(/^data:([^;]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        const base64Data = userMessageImage.split(',')[1];
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      // Initialize AI inside handler for fresh state
      const genAI = new GoogleGenAI({ apiKey });
      
      const response: GenerateContentResponse = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview", // Using pro for better technical diagnosis
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: t.systemInstruction,
          temperature: 0.3,
        },
      });

      const assistantText = response.text || t.connectionError;

      // Save assistant message to Supabase
      await supabase.from('messages').insert([{
        userId: userProfile.uid,
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      }]);

    } catch (error: any) {
      console.error("Diagnosis error details:", error);
      
      let errorMessage = t.connectionError;
      
      if (error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID')) {
        errorMessage = t.authError;
      } else if (error?.message?.includes('quota') || error?.message?.includes('429')) {
        errorMessage = t.quotaError;
      } else if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
        errorMessage = t.safetyError;
      }

      try {
        await supabase.from('messages').insert([{
          userId: userProfile.uid,
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
        }]);
      } catch (innerError) {
        console.error("Failed to save error message:", innerError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!userProfile || messages.length === 0) return;
    
    setIsSavingDiagnosis(true);
    setSaveSuccess(null);

    try {
      // Simple extraction logic
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      
      const symptoms = userMessages.map(m => m.content).join('\n');
      const recommendations = assistantMessages.map(m => m.content).join('\n');
      
      // Try to find a model name in the history
      let amplifierModel = "Modelo não identificado";
      const modelMatch = recommendations.match(/Modelo do amplificador[:\s]+([^\n]+)/i) || 
                         recommendations.match(/🛠️ Diagnóstico Técnico\s+- ([^\n]+)/i) ||
                         recommendations.match(/Análise do ([^\n]+)/i) ||
                         recommendations.match(/Equipamento[:\s]+([^\n]+)/i);
      
      if (modelMatch) {
        amplifierModel = modelMatch[1].trim();
      }

      await supabase.from('diagnostics').insert([{
        userId: userProfile.uid,
        amplifierModel,
        symptoms: symptoms.substring(0, 5000),
        recommendations: recommendations.substring(0, 10000),
        fullHistory: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        createdAt: new Date().toISOString(),
      }]);

      setSaveSuccess("Diagnóstico salvo com sucesso!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error("Error saving diagnosis:", error);
    } finally {
      setIsSavingDiagnosis(false);
    }
  };

  const restoreDiagnosis = async (history: any[]) => {
    if (!userProfile) return;
    
    try {
      // 1. Clear current history
      await supabase.from('messages').delete().eq('userId', userProfile.uid);
      
      // 2. Add saved history
      const newMessages = history.map(msg => ({
        userId: userProfile.uid,
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString(),
      }));
      
      await supabase.from('messages').insert(newMessages);
      
      setIsDiagnosticsModalOpen(false);
      setSelectedDiagnosisId(null);
    } catch (error) {
      console.error("Error restoring diagnosis:", error);
    }
  };

  const clearHistory = async () => {
    if (!userProfile) return;
    try {
      await supabase.from('messages').delete().eq('userId', userProfile.uid);
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!userProfile || !messageId) return;
    try {
      await supabase.from('messages').delete().eq('id', messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const clearImageRequests = async () => {
    if (!userProfile) return;
    try {
      const { data: messagesToDelete } = await supabase
        .from('messages')
        .select('id')
        .eq('userId', userProfile.uid)
        .ilike('content', '%[Solicitação de Imagem Técnica]%');

      if (messagesToDelete && messagesToDelete.length > 0) {
        await supabase
          .from('messages')
          .delete()
          .in('id', messagesToDelete.map(m => m.id));
      }
    } catch (error) {
      console.error("Error clearing image requests:", error);
    }
  };

  return (
    <ErrorBoundary>
      <SubscriptionGuard 
        userProfile={userProfile} 
        loading={profileLoading}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        t={t}
      >
        <FixMasterAppContent 
          messages={messages}
          input={input}
          setInput={setInput}
          image={image}
          setImage={setImage}
          loading={loading}
          userProfile={userProfile}
          showClearConfirm={showClearConfirm}
          setShowClearConfirm={setShowClearConfirm}
          isRecording={isRecording}
          speechError={speechError}
          setSpeechError={setSpeechError}
          scrollRef={scrollRef}
          fileInputRef={fileInputRef}
          profileLoading={profileLoading}
          handleImageUpload={handleImageUpload}
          handleSubmit={handleSubmit}
          clearHistory={clearHistory}
          toggleSpeechRecognition={toggleSpeechRecognition}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
          setIsAdminDashboardOpen={setIsAdminDashboardOpen}
          isDiagnosticsModalOpen={isDiagnosticsModalOpen}
          setIsDiagnosticsModalOpen={setIsDiagnosticsModalOpen}
          isBrandsModalOpen={isBrandsModalOpen}
          setIsBrandsModalOpen={setIsBrandsModalOpen}
          selectedSpecialty={selectedSpecialty}
          setSelectedSpecialty={setSelectedSpecialty}
          recentDiagnostics={recentDiagnostics}
          diagnosticsCount={diagnosticsCount}
          setSelectedDiagnosisId={setSelectedDiagnosisId}
          isSavingDiagnosis={isSavingDiagnosis}
          saveSuccess={saveSuccess}
          handleSaveDiagnosis={handleSaveDiagnosis}
          isGeneratingImage={isGeneratingImage}
          handleGenerateImage={handleGenerateImage}
          deleteMessage={deleteMessage}
          clearImageRequests={clearImageRequests}
          checkedComponents={checkedComponents}
          setCheckedComponents={setCheckedComponents}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
          supabaseStatus={supabaseStatus}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          t={t}
        />
        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={() => setIsPaymentModalOpen(false)} 
          userProfile={userProfile} 
          t={t}
        />
        <UserProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
          userProfile={userProfile} 
          onOpenPayment={() => setIsPaymentModalOpen(true)}
          t={t}
        />
        <AdminDashboard 
          isOpen={isAdminDashboardOpen} 
          onClose={() => setIsAdminDashboardOpen(false)} 
          t={t}
        />
        <DiagnosticsModal 
          isOpen={isDiagnosticsModalOpen} 
          onClose={() => {
            setIsDiagnosticsModalOpen(false);
            setSelectedDiagnosisId(null);
          }} 
          userId={userProfile?.uid || ''}
          t={t}
          initialSelectedId={selectedDiagnosisId}
          onRestore={restoreDiagnosis}
        />
        <BrandsModal 
          isOpen={isBrandsModalOpen}
          onClose={() => {
            setIsBrandsModalOpen(false);
            setSelectedSpecialty(null);
          }}
          onSelectBrand={(brand) => {
            setInput(`${brand} ${selectedSpecialty?.name}: `);
            setIsBrandsModalOpen(false);
            setSelectedSpecialty(null);
          }}
          specialtyName={selectedSpecialty?.name || ''}
          brands={selectedSpecialty?.brands || []}
          t={t}
        />
      </SubscriptionGuard>
    </ErrorBoundary>
  );
}

interface FixMasterAppContentProps {
  messages: Message[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  image: string | null;
  setImage: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  userProfile: UserProfile | null;
  showClearConfirm: boolean;
  setShowClearConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  isRecording: boolean;
  speechError: string | null;
  setSpeechError: React.Dispatch<React.SetStateAction<string | null>>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  profileLoading: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearHistory: () => Promise<void>;
  toggleSpeechRecognition: () => void;
  setIsPaymentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsProfileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAdminDashboardOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDiagnosticsModalOpen: boolean;
  setIsDiagnosticsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isBrandsModalOpen: boolean;
  setIsBrandsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSpecialty: { name: string, brands: string[] } | null;
  setSelectedSpecialty: React.Dispatch<React.SetStateAction<{ name: string, brands: string[] } | null>>;
  recentDiagnostics: any[];
  diagnosticsCount: number;
  setSelectedDiagnosisId: React.Dispatch<React.SetStateAction<string | null>>;
  isSavingDiagnosis: boolean;
  saveSuccess: string | null;
  handleSaveDiagnosis: () => Promise<void>;
  isGeneratingImage: boolean;
  handleGenerateImage: () => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  clearImageRequests: () => Promise<void>;
  checkedComponents: string[];
  setCheckedComponents: React.Dispatch<React.SetStateAction<string[]>>;
  themeColor: 'orange' | 'blue' | 'green' | 'purple' | 'red';
  setThemeColor: React.Dispatch<React.SetStateAction<'orange' | 'blue' | 'green' | 'purple' | 'red'>>;
  supabaseStatus: 'online' | 'offline' | 'checking';
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  t: any;
}

function FixMasterAppContent({
  messages,
  input,
  setInput,
  image,
  setImage,
  loading,
  userProfile,
  showClearConfirm,
  setShowClearConfirm,
  isRecording,
  speechError,
  setSpeechError,
  scrollRef,
  fileInputRef,
  profileLoading,
  handleImageUpload,
  handleSubmit,
  clearHistory,
  toggleSpeechRecognition,
  setIsPaymentModalOpen,
  setIsProfileModalOpen,
  setIsAdminDashboardOpen,
  isDiagnosticsModalOpen,
  setIsDiagnosticsModalOpen,
  isBrandsModalOpen,
  setIsBrandsModalOpen,
  selectedSpecialty,
  setSelectedSpecialty,
  recentDiagnostics,
  diagnosticsCount,
  setSelectedDiagnosisId,
  isSavingDiagnosis,
  saveSuccess,
  handleSaveDiagnosis,
  isGeneratingImage,
  handleGenerateImage,
  deleteMessage,
  clearImageRequests,
  checkedComponents,
  setCheckedComponents,
  themeColor,
  setThemeColor,
  supabaseStatus,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  t
}: FixMasterAppContentProps) {
  const theme = {
    orange: {
      primary: 'bg-orange-600',
      hover: 'hover:bg-orange-500',
      text: 'text-orange-500',
      border: 'border-orange-500/20',
      bg: 'bg-orange-500/10',
      shadow: 'shadow-orange-900/20',
      glow: 'shadow-orange-500/5',
      accent: 'text-orange-400',
      borderHover: 'hover:border-orange-500/40',
      borderActive: 'border-orange-500',
      ring: 'ring-orange-500/50',
      glowColor: 'rgba(249,115,22,0.2)'
    },
    blue: {
      primary: 'bg-blue-600',
      hover: 'hover:bg-blue-500',
      text: 'text-blue-500',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
      shadow: 'shadow-blue-900/20',
      glow: 'shadow-blue-500/5',
      accent: 'text-blue-400',
      borderHover: 'hover:border-blue-500/40',
      borderActive: 'border-blue-500',
      ring: 'ring-blue-500/50',
      glowColor: 'rgba(59,130,246,0.2)'
    },
    green: {
      primary: 'bg-green-600',
      hover: 'hover:bg-green-500',
      text: 'text-green-500',
      border: 'border-green-500/20',
      bg: 'bg-green-500/10',
      shadow: 'shadow-green-900/20',
      glow: 'shadow-green-500/5',
      accent: 'text-green-400',
      borderHover: 'hover:border-green-500/40',
      borderActive: 'border-green-500',
      ring: 'ring-green-500/50',
      glowColor: 'rgba(34,197,94,0.2)'
    },
    purple: {
      primary: 'bg-purple-600',
      hover: 'hover:bg-purple-500',
      text: 'text-purple-500',
      border: 'border-purple-500/20',
      bg: 'bg-purple-500/10',
      shadow: 'shadow-purple-900/20',
      glow: 'shadow-purple-500/5',
      accent: 'text-purple-400',
      borderHover: 'hover:border-purple-500/40',
      borderActive: 'border-purple-500',
      ring: 'ring-purple-500/50',
      glowColor: 'rgba(168,85,247,0.2)'
    },
    red: {
      primary: 'bg-red-600',
      hover: 'hover:bg-red-500',
      text: 'text-red-500',
      border: 'border-red-500/20',
      bg: 'bg-red-500/10',
      shadow: 'shadow-red-900/20',
      glow: 'shadow-red-500/5',
      accent: 'text-red-400',
      borderHover: 'hover:border-red-500/40',
      borderActive: 'border-red-500',
      ring: 'ring-red-500/50',
      glowColor: 'rgba(239,68,68,0.2)'
    }
  }[themeColor];

  return (
    <div className={`flex h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:${theme.bg.replace('10', '30')}`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        w-72 border-r border-[#222] bg-[#111] flex flex-col 
        fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <div className="p-6 border-b border-[#222] flex flex-col gap-4 relative">
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-[#555] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className={theme.primary + " p-2 rounded-lg"}>
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">AFD-DIAGNÓSTICO PRO</h1>
              <p className={"text-[10px] uppercase tracking-widest font-mono " + theme.text}>{t.benchAssistant}</p>
            </div>
          </div>
          
          <div className="relative h-28 rounded-xl overflow-hidden border border-[#333] group">
            <img 
              src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200" 
              alt="Workbench" 
              className="w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-700 animate-pulse-slow"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <p className={"text-[9px] font-bold uppercase tracking-tighter " + theme.text}>{t.activeLab}</p>
              </div>
              <p className="text-[8px] text-[#666] uppercase">{t.solderingStation}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold mb-3 flex items-center gap-2">
              <Palette className="w-3 h-3" /> {t.changeTheme}
            </h2>
            <div className="flex gap-2">
              {(['orange', 'blue', 'green', 'purple', 'red'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${themeColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'} ${
                    color === 'orange' ? 'bg-orange-500' :
                    color === 'blue' ? 'bg-blue-500' :
                    color === 'green' ? 'bg-green-500' :
                    color === 'purple' ? 'bg-purple-500' :
                    'bg-red-500'
                  }`}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" /> {t.specialties}
            </h2>
            <div className="space-y-3">
              {[
                { name: t.specialtyTV, img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=100", brands: t.brandsTV },
                { name: t.specialtyAudio, img: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?auto=format&fit=crop&q=80&w=100", brands: t.brandsAudio },
                { name: t.specialtyStabilizer, img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=100", brands: t.brandsStabilizer },
                { name: t.specialtyGenerator, img: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=100", brands: t.brandsGenerator },
                { name: t.specialtyFridge, img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=100", brands: t.brandsFridge },
                { name: t.specialtyAC, img: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=100", brands: t.brandsAC }
              ].map((spec) => (
                <div 
                  key={spec.name} 
                  onClick={() => {
                    setSelectedSpecialty({ name: spec.name, brands: spec.brands });
                    setIsBrandsModalOpen(true);
                  }}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-lg overflow-hidden border border-[#222] group-hover:border-${themeColor === 'orange' ? 'orange' : themeColor}-500 transition-all duration-300 group-hover:shadow-[0_0_15px_${theme.glowColor}]`}>
                    <img src={spec.img} alt={spec.name} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-[#888] group-hover:text-white transition-colors block">{spec.name}</span>
                    <span className={`text-[8px] text-[#444] uppercase tracking-tighter group-hover:text-${themeColor === 'orange' ? 'orange' : themeColor}-500 transition-colors`}>{t.open}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold mb-3 flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> {t.goldenRules}
            </h2>
            <div className="bg-[#1a1a1a] p-3 rounded border border-[#222] text-[11px] leading-relaxed text-[#aaa] space-y-2">
              <p className="flex gap-2">
                <AlertTriangle className={"w-3 h-3 shrink-0 " + theme.text} />
                <span>{t.dcOutputRule}</span>
              </p>
              <p className="flex gap-2">
                <Zap className={"w-3 h-3 shrink-0 " + theme.text} />
                <span>{t.caSeriesRule}</span>
              </p>
            </div>
          </section>

          {userProfile && (
            <section>
              <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold mb-3 flex items-center gap-2">
                <Zap className="w-3 h-3" /> {t.subscription}
              </h2>
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                className={`
                  w-full p-3 rounded-xl border text-left transition-all group
                  ${userProfile.subscriptionType === 'premium' || userProfile.subscriptionType === 'admin'
                    ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                    : theme.bg + ' ' + theme.border + ' ' + theme.borderHover}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${userProfile.subscriptionType === 'premium' || userProfile.subscriptionType === 'admin' ? 'text-green-500' : theme.text}`}>
                    {userProfile.subscriptionType}
                  </span>
                  <Zap className={`w-3 h-3 group-hover:scale-125 transition-transform ${userProfile.subscriptionType === 'premium' || userProfile.subscriptionType === 'admin' ? 'text-green-500' : theme.text}`} />
                </div>
                <p className="text-xs font-bold text-white">
                  {userProfile.subscriptionType === 'admin' ? t.lifetimeAccess : t.activePlan}
                </p>
              </button>
            </section>
          )}

          {userProfile && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                  <History className="w-3 h-3" /> {t.records}
                </h2>
                {diagnosticsCount > 0 && (
                  <span className={`text-[9px] ${theme.bg} ${theme.text} px-1.5 py-0.5 rounded-full font-mono font-bold`}>
                    {diagnosticsCount}
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    setSelectedDiagnosisId(null);
                    setIsDiagnosticsModalOpen(true);
                  }}
                  className={`w-full p-3 rounded-xl border border-[#222] bg-[#1a1a1a] ${theme.borderHover} text-left transition-all group`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-[#666] group-hover:${theme.text} transition-colors`}>
                      {t.diagnostics}
                    </span>
                    <Save className={`w-3 h-3 text-[#444] group-hover:${theme.text} transition-colors`} />
                  </div>
                  <p className="text-xs font-bold text-white">{t.viewSaved}</p>
                </button>

                {recentDiagnostics.length > 0 && (
                  <div className="pt-2 space-y-1">
                    {recentDiagnostics.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedDiagnosisId(d.id);
                          setIsDiagnosticsModalOpen(true);
                        }}
                        className="w-full p-2 rounded-lg hover:bg-[#111] border border-transparent hover:border-[#222] text-left transition-all group flex items-center gap-3"
                      >
                        <div className={`w-6 h-6 rounded-md bg-[#111] border border-[#222] flex items-center justify-center shrink-0 group-hover:${theme.border.replace('20', '30')} transition-colors`}>
                          <FileText className={`w-3 h-3 text-[#444] group-hover:${theme.text} transition-colors`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#888] truncate group-hover:text-white transition-colors uppercase tracking-tight">
                            {d.amplifierModel}
                          </p>
                          <p className="text-[8px] text-[#444] font-mono">
                            {d.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {userProfile?.role === 'admin' && (
            <section>
              <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" /> {t.administration}
              </h2>
              <button 
                onClick={() => setIsAdminDashboardOpen(true)}
                className="w-full p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                    {t.adminPanel}
                  </span>
                  <ShieldCheck className="w-3 h-3 text-blue-500 group-hover:scale-125 transition-transform" />
                </div>
                <p className="text-xs font-bold text-white">{t.manageCodes}</p>
              </button>
            </section>
          )}
        </div>

        <div className="p-4 border-t border-[#222] space-y-4">
          {userProfile ? (
            <div className="space-y-4">
              <button 
                onClick={clearHistory}
                className={`w-full flex items-center justify-center gap-2 py-3 ${theme.primary} text-white rounded-xl text-xs font-bold ${theme.hover} transition-all ${theme.shadow} active:scale-95 mb-2`}
              >
                <PlusCircle className="w-4 h-4" /> {t.newDiagnosis}
              </button>

              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-[#1a1a1a] rounded-xl transition-all group"
              >
                <div className={`w-8 h-8 rounded-full ${theme.primary} flex items-center justify-center text-xs font-bold overflow-hidden border border-[#333] group-hover:${theme.borderActive} transition-colors`}>
                  {userProfile?.photoURL ? <img src={userProfile.photoURL} alt={userProfile.displayName || ''} referrerPolicy="no-referrer" /> : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-xs font-bold text-white truncate group-hover:${theme.text} transition-colors`}>{userProfile?.displayName || userProfile?.phone}</p>
                  {userProfile?.phone && (
                    <p className="text-[10px] text-[#555] truncate">{userProfile.phone}</p>
                  )}
                </div>
              </button>
              
              {!showClearConfirm ? (
                <div className="space-y-2">
                  <button 
                    onClick={clearImageRequests}
                    className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-[#555] hover:text-blue-400 transition-colors uppercase tracking-widest font-bold"
                  >
                    <ImagePlus className="w-3 h-3" /> {t.deleteImageRequests}
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-[#555] hover:text-red-400 transition-colors uppercase tracking-widest font-bold"
                  >
                    <Trash2 className="w-3 h-3" /> {t.clearHistory}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] text-red-400 text-center font-medium">{t.confirmDeletion}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={clearHistory}
                      className="flex-1 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-500 transition-colors"
                    >
                      {t.yes}
                    </button>
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-1.5 bg-[#222] text-[#888] text-[10px] font-bold rounded hover:text-white transition-colors"
                    >
                      {t.no}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-[#222] bg-[#111]/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <AnimatePresence>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-full shadow-lg z-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {saveSuccess}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-[#aaa] hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className={`hidden md:block p-2 ${theme.primary} rounded-lg`}>
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-medium text-xs md:text-sm text-[#aaa] truncate max-w-[120px] md:max-w-none">{t.activeBench}</h2>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            {userProfile && messages.length > 0 && (
              <button 
                onClick={handleSaveDiagnosis}
                disabled={isSavingDiagnosis}
                className={`
                  flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all
                  ${isSavingDiagnosis 
                    ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' 
                    : 'bg-green-600/10 text-green-500 border border-green-500/20 hover:bg-green-600/20'}
                `}
              >
                {isSavingDiagnosis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span className="hidden sm:inline">{isSavingDiagnosis ? t.saving : t.saveDiagnosis}</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-green-500 uppercase tracking-tighter">{t.online}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 ${supabaseStatus === 'online' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'} rounded-full`}>
              <div className={`w-1.5 h-1.5 rounded-full ${supabaseStatus === 'online' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'} `} />
              <span className={`text-[9px] md:text-[10px] font-mono ${supabaseStatus === 'online' ? 'text-blue-500' : 'text-red-500'} uppercase tracking-tighter`}>
                {supabaseStatus === 'online' ? 'S' : 'S!'}
              </span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 scroll-smooth"
        >
          {profileLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className={`w-8 h-8 ${theme.text} animate-spin`} />
            </div>
          ) : messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
              <div className="relative">
                <div className={`w-32 h-32 bg-[#111] border border-[#222] rounded-[2.5rem] flex items-center justify-center shadow-2xl ${theme.glow.replace('5', '10')} relative z-10`}>
                  <Cpu className={`w-16 h-16 ${theme.text}`} />
                </div>
                <div className={`absolute -top-4 -right-4 w-24 h-24 ${theme.primary.replace('bg-', 'bg-')}/10 rounded-full blur-3xl animate-pulse`} />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-700" />
              </div>

              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-white tracking-tight">{t.readyForDiagnosis}</h3>
                <p className="text-base text-[#666] max-w-md mx-auto leading-relaxed">
                  {t.benchActiveDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                <button 
                  onClick={() => setInput("Yamaha P7000S com LED Clip aceso e sem som.")}
                  className={`group p-4 bg-[#111] border border-[#222] rounded-2xl text-left ${theme.borderHover.replace('hover:', 'hover:').replace('40', '50')} transition-all hover:shadow-xl ${theme.glow}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${theme.bg} rounded-lg ${theme.text} group-hover:${theme.primary} group-hover:text-white transition-all`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest">{t.example} 1</span>
                  </div>
                  <p className="text-xs text-[#888] group-hover:text-[#ccc] transition-colors">"Yamaha P7000S com LED Clip aceso e sem som..."</p>
                </button>

                <button 
                  onClick={() => setInput("Crown CA18 com DC na saída do canal B.")}
                  className={`group p-4 bg-[#111] border border-[#222] rounded-2xl text-left ${theme.borderHover.replace('hover:', 'hover:').replace('40', '50')} transition-all hover:shadow-xl ${theme.glow}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest">{t.example} 2</span>
                  </div>
                  <p className="text-xs text-[#888] group-hover:text-[#ccc] transition-colors">"Crown CA18 com DC na saída do canal B..."</p>
                </button>
              </div>

              <div className="pt-8 grid grid-cols-3 gap-4 w-full opacity-80 grayscale-[0.2] hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400" alt="Circuit" className={`rounded-xl h-24 w-full object-cover border border-[#222] animate-float shadow-lg ${theme.glow}`} referrerPolicy="no-referrer" />
                <img src="https://images.unsplash.com/photo-1558444479-c8f01052477a?auto=format&fit=crop&q=80&w=400" alt="Soldering" className={`rounded-xl h-24 w-full object-cover border border-[#222] animate-float [animation-delay:0.2s] shadow-lg ${theme.glow}`} referrerPolicy="no-referrer" />
                <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400" alt="Tech" className={`rounded-xl h-24 w-full object-cover border border-[#222] animate-float [animation-delay:0.4s] shadow-lg ${theme.glow}`} referrerPolicy="no-referrer" />
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.timestamp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] md:max-w-[70%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.image && (
                    <div className="rounded-2xl overflow-hidden border border-[#222] mb-2">
                      <img src={msg.image} alt="Upload" className="max-w-full h-auto max-h-64 object-contain bg-black" />
                    </div>
                  )}
                  <div className={`
                    p-4 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? theme.primary + ' text-white ' + theme.shadow
                      : 'bg-[#111] border border-[#222] text-[#ccc]'}
                  `}>
                    {msg.role === 'assistant' ? (
                      <div className={`markdown-body prose prose-invert prose-sm max-w-none prose-headings:${theme.text} prose-strong:${theme.accent} prose-table:border prose-table:border-[#222] prose-th:bg-[#1a1a1a] prose-th:p-2 prose-td:p-2 prose-td:border-t prose-td:border-[#222]`}>
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] text-[#444] font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500/50" />
                          <button 
                            onClick={handleSaveDiagnosis}
                            className="p-1 hover:bg-[#222] rounded-lg text-[#444] hover:text-green-500 transition-colors"
                            title={t.saveDiagnosis}
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 hover:bg-[#222] rounded-lg text-[#444] hover:text-red-500 transition-colors"
                        title={t.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Save Diagnosis Button at the end of conversation */}
            {!loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center py-8"
              >
                {userProfile ? (
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <button 
                      onClick={handleSaveDiagnosis}
                      disabled={isSavingDiagnosis}
                      className={`
                        flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-2xl
                        ${isSavingDiagnosis 
                          ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20 hover:scale-105 active:scale-95'}
                      `}
                    >
                      {isSavingDiagnosis ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {isSavingDiagnosis ? t.saving : t.saveDiagnosis}
                    </button>

                    <button 
                      onClick={clearHistory}
                      className="flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all bg-[#111] border border-[#222] text-[#888] hover:text-white hover:border-[#333] hover:scale-105 active:scale-95 shadow-xl"
                    >
                      <PlusCircle className="w-5 h-5" />
                      {t.newDiagnosis}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#111] border border-[#222] p-6 rounded-2xl text-center max-w-xs space-y-4">
                    <div className="w-12 h-12 bg-orange-600/10 rounded-full flex items-center justify-center mx-auto">
                      <LogIn className="w-6 h-6 text-orange-500" />
                    </div>
                    <p className="text-xs text-[#888] leading-relaxed">
                      {t.loginToSave}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#111] border border-[#222] p-4 rounded-2xl flex items-center gap-3">
                <Loader2 className={`w-4 h-4 ${theme.text} animate-spin`} />
                <span className="text-xs text-[#666] font-mono animate-pulse">{t.processingDiagnosis}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#0a0a0a] border-t border-[#222]">
          <form 
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative"
          >
            {/* Component Checklist */}
            <div className="mb-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> {t.askCheckedComponents}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'power_supply', label: t.powerSupplyShort },
                  { id: 'pre_amp', label: t.preAmpShort },
                  { id: 'power_stage', label: t.powerStageShort },
                  { id: 'other', label: t.other }
                ].map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setCheckedComponents(prev => 
                        prev.includes(comp.label) 
                          ? prev.filter(c => c !== comp.label)
                          : [...prev, comp.label]
                      );
                    }}
                    className={`
                      px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                      ${checkedComponents.includes(comp.label)
                        ? theme.primary + ' ' + theme.borderActive.replace('border-', 'border-') + ' text-white ' + theme.shadow
                        : 'bg-[#111] border-[#222] text-[#555] hover:border-[#333]'}
                    `}
                  >
                    {comp.label}
                  </button>
                ))}
              </div>
            </div>

            {speechError && (
              <div className="absolute bottom-full left-0 mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                <AlertTriangle className="w-3 h-3" />
                {speechError}
                <button onClick={() => setSpeechError(null)} className="ml-2 hover:text-white">✕</button>
              </div>
            )}

            {image && (
              <div className="absolute bottom-full left-0 mb-4 p-2 bg-[#111] border border-[#222] rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
                <img src={image} alt="Preview" className="w-12 h-12 rounded object-cover border border-[#333]" />
                <button 
                  type="button"
                  onClick={() => setImage(null)}
                  className="p-1 hover:bg-[#222] rounded-full text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className={`flex items-end gap-2 md:gap-3 bg-[#111] border border-[#222] rounded-2xl p-2 focus-within:${theme.borderActive.replace('border-', 'border-')}/50 transition-all shadow-2xl`}>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 md:p-3 text-[#555] hover:${theme.text} transition-colors`}
                title="Anexar foto da placa"
              >
                <Camera className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={userProfile ? (isRecording ? t.listening : t.describeSymptom) : t.loginToStart}
                disabled={!userProfile}
                className="flex-1 bg-transparent border-none focus:ring-0 text-xs md:text-sm py-2 md:py-3 resize-none max-h-32 min-h-[40px] disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              <div className="flex items-center gap-0.5 md:gap-1">
                <button 
                  type="button"
                  onClick={toggleSpeechRecognition}
                  disabled={!userProfile}
                  className={`p-2 md:p-3 transition-all rounded-xl ${isRecording ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-[#555] hover:' + theme.text}`}
                  title={isRecording ? t.stopListening : t.speakProblem}
                >
                  {isRecording ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                </button>

                <button 
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={loading || !input.trim() || !userProfile}
                  className={`p-2 md:p-3 transition-all rounded-xl ${isGeneratingImage ? 'text-blue-500 animate-pulse bg-blue-500/10' : 'text-[#555] hover:text-blue-500'}`}
                  title={t.generateImage}
                >
                  {isGeneratingImage ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <ImagePlus className="w-5 h-5 md:w-6 md:h-6" />}
                </button>

                <button 
                  type="submit"
                  disabled={(!input.trim() && !image) || loading}
                  className={`
                    p-2 md:p-3 rounded-xl transition-all
                    ${(!input.trim() && !image) || loading 
                      ? 'bg-[#1a1a1a] text-[#333]' 
                      : theme.primary + ' text-white ' + theme.hover + ' ' + theme.shadow}
                  `}
                >
                  {loading && !isGeneratingImage ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-[#444] text-center uppercase tracking-widest font-mono">
              {t.useRealMeasurements}
            </p>
          </form>
        </div>
      </main>

      {/* Right Info Panel (Desktop Only) */}
      <aside className="w-64 border-l border-[#222] bg-[#111] hidden xl:flex flex-col p-6 space-y-6">
        <h2 className="text-[11px] uppercase tracking-widest text-[#555] font-bold flex items-center gap-2">
          <Info className="w-3 h-3" /> {t.benchGuide}
        </h2>
        
        <div className="space-y-4">
          <div className="p-3 bg-[#1a1a1a] rounded border border-[#222] space-y-2">
            <h3 className={`text-[10px] font-bold ${theme.text} uppercase`}>{t.block} 1: {t.powerSupply}</h3>
            <p className="text-[11px] text-[#888]">{t.powerSupplyDesc}</p>
          </div>
          
          <div className="p-3 bg-[#1a1a1a] rounded border border-[#222] space-y-2">
            <h3 className={`text-[10px] font-bold ${theme.text} uppercase`}>{t.block} 2: {t.preAmp}</h3>
            <p className="text-[11px] text-[#888]">{t.preAmpDesc}</p>
          </div>

          <div className="p-3 bg-[#1a1a1a] rounded border border-[#222] space-y-2">
            <h3 className={`text-[10px] font-bold ${theme.text} uppercase`}>{t.block} 3: {t.powerStage}</h3>
            <p className="text-[11px] text-[#888]">{t.powerStageDesc}</p>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[#222]">
          <div className="flex items-center gap-2 text-[#444]">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase">{t.systemReady}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
