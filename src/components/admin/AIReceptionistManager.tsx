import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Phone,
  Settings,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Activity,
  CheckCircle,
  TrendingUp,
  User,
  History,
  Sparkles,
  Plus,
  Trash,
  Play,
  Pause,
  Loader2,
  Euro,
  Save,
  PhoneForwarded,
  HelpCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface FAQItem {
  key: string;
  question: string;
  answer: string;
}

interface CallLog {
  id: string;
  sid: string;
  phone_number: string;
  customer_name: string | null;
  status: 'ringing' | 'active' | 'completed' | 'missed' | 'transferred';
  direction: 'inbound' | 'outbound';
  duration: number;
  recording_url: string | null;
  transcript: { role: 'user' | 'assistant'; text: string; time: string }[];
  confidence_score: number;
  order_id: string | null;
  created_at: string;
}

interface VoiceSettings {
  id: string;
  agent_name: string;
  system_prompt: string;
  greeting_message: string;
  voice_id: string;
  provider: 'gemini' | 'openai' | 'vapi' | 'webhook';
  api_key: string | null;
  faqs: FAQItem[];
  min_confidence_threshold: number;
  transfer_phone_number: string;
  is_active: boolean;
}

export function AIReceptionistManager() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog State
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // FAQs editing local state
  const [localFAQs, setLocalFAQs] = useState<FAQItem[]>([]);
  const [newFAQ, setNewFAQ] = useState<Omit<FAQItem, 'key'>>({ question: '', answer: '' });

  // Web Mic Playground State
  const [isTesting, setIsTesting] = useState(false);
  const [playgroundStatus, setPlaygroundStatus] = useState('Prêt');
  const [testTranscript, setTestTranscript] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Playground Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Load Calls and Settings from Supabase
  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates on voice_calls
    const channel = supabase
      .channel('voice-calls-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voice_calls' },
        (payload) => {
          console.log('[Realtime DB Update]', payload);
          fetchCalls(); // Reload logs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchCalls(), fetchSettings()]);
    setIsLoading(false);
  };

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_calls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalls(data as CallLog[]);
    } catch (err: any) {
      console.error('Error fetching voice calls:', err.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as VoiceSettings);
        setLocalFAQs((data.faqs as FAQItem[]) || []);
      } else {
        toast.info("Seed settings non trouvées, veuillez configurer la réceptionniste.");
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err.message);
    }
  };

  // Save Config
  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('voice_settings')
        .update({
          agent_name: settings.agent_name,
          system_prompt: settings.system_prompt,
          greeting_message: settings.greeting_message,
          voice_id: settings.voice_id,
          provider: settings.provider,
          api_key: settings.api_key,
          transfer_phone_number: settings.transfer_phone_number,
          min_confidence_threshold: settings.min_confidence_threshold,
          faqs: localFAQs,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Configuration AI enregistrée avec succès !');
      fetchSettings();
    } catch (err: any) {
      toast.error(`Erreur lors de la sauvegarde : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // FAQ Manager helpers
  const handleAddFAQ = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) {
      toast.error('Veuillez remplir la question et la réponse');
      return;
    }
    const key = `faq_${Date.now()}`;
    const updated = [...localFAQs, { key, question: newFAQ.question.trim(), answer: newFAQ.answer.trim() }];
    setLocalFAQs(updated);
    setNewFAQ({ question: '', answer: '' });
    toast.success('FAQ ajoutée aux paramètres locaux (cliquez sur Enregistrer pour confirmer)');
  };

  const handleRemoveFAQ = (key: string) => {
    const updated = localFAQs.filter(f => f.key !== key);
    setLocalFAQs(updated);
    toast.success('FAQ retirée (cliquez sur Enregistrer pour confirmer)');
  };

  // Manual trigger for human override / transfer
  const handleOverrideTransfer = async (callSid: string) => {
    try {
      toast.info("Envoi de la commande de transfert d'appel...");
      // In production, we request our voice server to trigger Twilio transfer
      const { error } = await supabase
        .from('voice_calls')
        .update({ status: 'transferred' })
        .eq('sid', callSid);
      
      if (error) throw error;
      toast.success("Statut d'appel marqué comme TRANSFÉRÉ");
    } catch (err: any) {
      toast.error(`Impossible de transférer : ${err.message}`);
    }
  };

  // --- PLAYGROUND MICROPHONE AUDIO TESTER ---
  const startPlaygroundTest = async () => {
    setIsTesting(true);
    setTestTranscript([]);
    setPlaygroundStatus('Initialisation du micro...');
    nextStartTimeRef.current = 0;

    try {
      // 1. Get browser media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Initialize Web Audio API AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      // 3. Establish WebSocket connection to backend voice server playground
      // Make sure local voice-server is running on port 5000 (standard in README)
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/voice-ws/test-agent`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setPlaygroundStatus('Connecté au serveur AI. Parlez...');
        // Send start event config
        ws.send(JSON.stringify({ type: 'start' }));

        // Connect mic stream
        const source = audioCtx.createMediaStreamSource(stream);
        // ScriptProcessor node captures at default rate (e.g. 44.1kHz or 48kHz)
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);

          // Resample Float32 to 16000Hz PCM
          const inputSampleRate = audioCtx.sampleRate;
          const outputSampleRate = 16000;
          const ratio = inputSampleRate / outputSampleRate;
          const newLength = Math.round(inputData.length / ratio);
          const resampled = new Float32Array(newLength);
          for (let i = 0; i < newLength; i++) {
            resampled[i] = inputData[Math.round(i * ratio)];
          }

          // Convert Float32 to Int16 PCM buffer
          const int16Buffer = new Int16Array(newLength);
          for (let i = 0; i < newLength; i++) {
            const s = Math.max(-1, Math.min(1, resampled[i]));
            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send raw binary PCM audio buffer over WS
          ws.send(int16Buffer.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            setPlaygroundStatus(data.message);
          } 
          
          else if (data.type === 'transcript') {
            setTestTranscript(prev => [...prev, { role: data.role, text: data.text }]);
          } 
          
          else if (data.type === 'tool_output') {
            toast.info(`Outil exécuté : ${data.name}`);
          } 
          
          else if (data.type === 'audio' && audioEnabled) {
            // Play base64 audio chunks back
            playBase64PCMChunk(data.payload);
          }
        } catch (e) {
          // Binary audio packet (or fallback)
        }
      };

      ws.onerror = (err) => {
        console.error('[Playground WS Error]', err);
        setPlaygroundStatus('Erreur de connexion WebSocket');
      };

      ws.onclose = () => {
        setPlaygroundStatus('Connexion fermée');
        stopPlaygroundTest();
      };

    } catch (err: any) {
      console.error('[Microphone Access Error]', err);
      const errMsg = err.message || '';
      if (err.name === 'SecurityError' || errMsg.includes('insecure')) {
        toast.error("Erreur d'accès au microphone : Opération non sécurisée.", {
          description: "Firefox/Safari bloque l'accès si vous êtes en Navigation Privée, si vous bloquez le micro dans la barre d'adresse, ou si privacy.resistFingerprinting est activé.",
          duration: 10000
        });
      } else if (err.name === 'NotAllowedError' || errMsg.includes('permission') || errMsg.includes('denied')) {
        toast.error("Accès au microphone refusé.", {
          description: "Veuillez autoriser l'accès au microphone pour ce site dans la barre d'adresse de votre navigateur.",
          duration: 8000
        });
      } else {
        toast.error(`Erreur d'accès au microphone : ${err.message || err.name}`);
      }
      setIsTesting(false);
      setPlaygroundStatus('Prêt (Échec micro)');
    }
  };

  const playBase64PCMChunk = (base64PCM: string) => {
    if (!audioContextRef.current) return;
    try {
      const binaryString = window.atob(base64PCM);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Live API defaults output at 24000Hz (downsample/playback rate matching)
      const sampleRate = settings?.provider === 'openai' ? 16000 : 24000;
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const bufferSource = audioContextRef.current.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(audioContextRef.current.destination);

      const now = audioContextRef.current.currentTime;
      if (nextStartTimeRef.current < now) {
        nextStartTimeRef.current = now + 0.08; // safety buffer offset
      }
      
      bufferSource.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    } catch (e: any) {
      console.warn('Audio play chunk error:', e.message);
    }
  };

  const stopPlaygroundTest = () => {
    setIsTesting(false);
    setPlaygroundStatus('Prêt');
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Helper Stats calculations
  const totalCalls = calls.length;
  const completedOrdersCount = calls.filter(c => c.status === 'completed' && c.order_id).length;
  const missedCallsCount = calls.filter(c => c.status === 'missed').length;
  const transferredCallsCount = calls.filter(c => c.status === 'transferred').length;
  const activeCall = calls.find(c => c.status === 'active' || c.status === 'ringing');

  const averageDuration = totalCalls > 0 
    ? Math.round(calls.reduce((acc, c) => acc + c.duration, 0) / totalCalls) 
    : 0;

  const successRate = totalCalls > 0 
    ? Math.round((completedOrdersCount / totalCalls) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Réceptionniste AI - Clara</h2>
          <p className="text-muted-foreground">
            Gérez le standard téléphonique virtuel, entraînez Clara, supervisez les appels en direct et analysez l'historique.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={isLoading}>
          <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {isLoading && !settings ? (
        <div className="text-center py-20">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground font-medium">Chargement des modules de réception...</p>
        </div>
      ) : (
        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="gap-2 font-semibold">
              <History className="w-4 h-4" />
              Appels & Dashboard
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2 font-semibold">
              <Mic className="w-4 h-4" />
              Banc d'Essai (Playground)
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 font-semibold">
              <Settings className="w-4 h-4" />
              Entraînement & Règles
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DASHBOARD & ACTIVE CALLS */}
          <TabsContent value="dashboard" className="space-y-6 animate-in fade-in duration-300">
            {/* Realtime Active Call Monitor */}
            {activeCall && (
              <Card className="border-2 border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-lg shadow-red-500/10 animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-red-100 dark:border-red-900/50">
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                    </span>
                    <CardTitle className="font-bold flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Appel Téléphonique Actif
                    </CardTitle>
                  </div>
                  <Badge variant="destructive" className="bg-red-600 uppercase font-black tracking-widest text-[9px]">
                    {activeCall.status === 'ringing' ? 'Sonnerie' : 'En Ligne'}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">
                        Client : <span className="text-primary font-extrabold">{activeCall.customer_name || 'Inconnu'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Téléphone : {activeCall.phone_number}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2 bg-red-600 hover:bg-red-700"
                        onClick={() => handleOverrideTransfer(activeCall.sid)}
                      >
                        <PhoneForwarded className="w-4 h-4" />
                        Transférer à un Équipier
                      </Button>
                    </div>
                  </div>

                  {/* Live Transcript Streaming Display */}
                  <div className="bg-card border rounded-xl p-4 max-h-[220px] overflow-y-auto space-y-2 text-sm font-sans shadow-inner">
                    {activeCall.transcript && activeCall.transcript.length > 0 ? (
                      activeCall.transcript.map((t, idx) => (
                        <div key={idx} className={`p-2.5 rounded-lg max-w-[85%] ${
                          t.role === 'user' 
                            ? 'bg-muted/50 border border-border mr-auto' 
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 ml-auto'
                        }`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-0.5">
                            {t.role === 'user' ? 'Client' : 'Clara (AI)'}
                          </p>
                          <p className="font-medium leading-relaxed">{t.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8 font-medium">Clara écoute le client...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Appels</p>
                    <h3 className="text-3xl font-extrabold mt-1">{totalCalls}</h3>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-600">
                    <Phone className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Commandes Clôturées</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-green-600">{completedOrdersCount}</h3>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded-2xl text-green-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Taux de Succès</p>
                    <h3 className="text-3xl font-extrabold mt-1">{successRate}%</h3>
                  </div>
                  <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Durée Moyenne</p>
                    <h3 className="text-3xl font-extrabold mt-1">{averageDuration}s</h3>
                  </div>
                  <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-600">
                    <Clock className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inbound Call History Logs */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  Historique des Appels
                </CardTitle>
                <CardDescription>Consultez la liste des appels reçus par Clara, les enregistrements et le taux de confiance.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold">Date & Heure</TableHead>
                      <TableHead className="font-bold">Téléphone</TableHead>
                      <TableHead className="font-bold">Client</TableHead>
                      <TableHead className="font-bold">Statut</TableHead>
                      <TableHead className="font-bold">Durée</TableHead>
                      <TableHead className="font-bold text-center">Score de Confiance</TableHead>
                      <TableHead className="font-bold">Commande ID</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.length > 0 ? (
                      calls.map((call) => (
                        <TableRow key={call.id} className="hover:bg-muted/30 transition-all">
                          <TableCell className="font-medium text-xs">
                            {new Date(call.created_at).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{call.phone_number}</TableCell>
                          <TableCell className="font-medium text-xs">{call.customer_name || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                                call.status === 'completed' 
                                  ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                                  : call.status === 'transferred'
                                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                  : call.status === 'missed'
                                  ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                  : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                              }`}
                            >
                              {call.status === 'completed' ? 'Commandé' : call.status === 'transferred' ? 'Transféré' : call.status === 'missed' ? 'Manqué' : 'En ligne'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{call.duration}s</TableCell>
                          <TableCell className="text-center font-bold text-xs">
                            {call.status === 'completed' ? (
                              <span className="text-green-600">{(call.confidence_score || 0.95 * 100).toFixed(0)}%</span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">
                            {call.order_id ? `#${call.order_id.slice(-6).toUpperCase()}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {call.recording_url && (
                                <a href={call.recording_url} target="_blank" rel="noreferrer">
                                  <Button size="icon" variant="outline" className="w-8 h-8 text-primary" title="Écouter l'enregistrement">
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </Button>
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs font-semibold"
                                onClick={() => {
                                  setSelectedCall(call);
                                  setIsTranscriptOpen(true);
                                }}
                              >
                                Transcript
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-20 text-muted-foreground font-medium">
                          Aucun historique d'appel enregistré pour le moment.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: INTERACTIVE MIC PLAYGROUND */}
          <TabsContent value="playground" className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Mic className="w-5 h-5 text-amber-500" />
                    Banc d'Essai Vocal
                  </CardTitle>
                  <CardDescription>
                    Testez la conversation avec Clara en direct depuis votre navigateur avec votre microphone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4 bg-muted/40 p-4 rounded-2xl border flex-1 flex flex-col justify-center text-center">
                    <div className="relative w-24 h-24 mx-auto bg-card rounded-full flex items-center justify-center border-4 border-amber-500/20 shadow-md">
                      {isTesting ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-amber-400 opacity-40"></span>
                          <Mic className="w-10 h-10 text-amber-500 animate-pulse" />
                        </>
                      ) : (
                        <MicOff className="w-10 h-10 text-muted-foreground/60" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground">Statut d'Essai</h4>
                      <p className="font-bold text-lg mt-1 text-primary">{playgroundStatus}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" /> Retour audio
                      </span>
                      <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
                    </div>
                    {isTesting ? (
                      <Button variant="destructive" className="w-full h-12 font-bold text-sm" onClick={stopPlaygroundTest}>
                        Terminer le Test
                      </Button>
                    ) : (
                      <Button className="w-full h-12 font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black" onClick={startPlaygroundTest}>
                        Démarrer l'essai vocal
                      </Button>
                    )}
                    <p className="text-[10px] text-center text-muted-foreground">
                      * Nécessite que le serveur local `voice-server` soit actif sur le port 5000.
                    </p>
                    {playgroundStatus.includes('Échec') && (
                      <div className="mt-3 text-left p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-600 dark:text-red-400 space-y-1">
                        <p className="font-bold">⚠️ Résolution du problème de micro :</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Évitez le mode de <b>Navigation Privée</b> (les micros y sont souvent bloqués).</li>
                          <li>Autorisez le micro dans la <b>barre d'adresse</b> (cadenas ou icône de micro).</li>
                          <li>Sur Firefox, vérifiez que <code>privacy.resistFingerprinting</code> n'est pas réglé sur <code>true</code> dans <code>about:config</code>.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Playground Transcript Panel */}
              <Card className="lg:col-span-2 shadow-sm flex flex-col min-h-[420px]">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    Dialogue en Direct
                  </CardTitle>
                  <CardDescription>Aperçu en temps réel du texte transcrit lors de votre conversation.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-4 bg-muted/10 overflow-y-auto space-y-3 max-h-[460px]">
                  {testTranscript.length > 0 ? (
                    testTranscript.map((t, idx) => (
                      <div key={idx} className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${
                        t.role === 'user' 
                          ? 'bg-card border border-border mr-auto' 
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 ml-auto'
                      }`}>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">
                          {t.role === 'user' ? 'Vous (Client)' : 'Clara (AI)'}
                        </p>
                        <p className="font-medium text-sm leading-relaxed">{t.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center">
                      <HelpCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                      <p className="font-bold">Aucune conversation en cours</p>
                      <p className="text-xs mt-1">Cliquez sur démarrer à gauche pour entamer la discussion.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: SETTINGS & TRAINING PROMPT */}
          <TabsContent value="settings" className="space-y-6 animate-in fade-in duration-300">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-500" />
                    Entraînement de Clara
                  </CardTitle>
                  <CardDescription>Ajustez le prompt système, la voix, le modèle d'API et la base de connaissances FAQ.</CardDescription>
                </div>
                <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2 bg-amber-500 text-black hover:bg-amber-600">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer les modifications
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Configurations */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold">Nom de l'Assistant</label>
                      <Input
                        value={settings?.agent_name || ''}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, agent_name: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Fournisseur de Modèle (Provider)</label>
                      <Select
                        value={settings?.provider || 'gemini'}
                        onValueChange={(val: any) => setSettings(prev => prev ? { ...prev, provider: val } : null)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Gemini Live API (WebSocket PCM)</SelectItem>
                          <SelectItem value="openai">OpenAI Realtime (WebSocket Mu-Law)</SelectItem>
                          <SelectItem value="webhook">Webhook Fallback (Twilio Gather HTTP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Modèle de Voix (Voice ID)</label>
                      <Select
                        value={settings?.voice_id || 'alloy'}
                        onValueChange={(val: any) => setSettings(prev => prev ? { ...prev, voice_id: val } : null)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {settings?.provider === 'openai' ? (
                            <>
                              <SelectItem value="alloy">Alloy (Neutre)</SelectItem>
                              <SelectItem value="echo">Echo (Masculin)</SelectItem>
                              <SelectItem value="shimmer">Shimmer (Féminin)</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Aoede">Aoede (Gemini - Féminin Chaleureux)</SelectItem>
                              <SelectItem value="Puck">Puck (Gemini - Masculin Amical)</SelectItem>
                              <SelectItem value="Charon">Charon (Gemini - Grave)</SelectItem>
                              <SelectItem value="Fenrir">Fenrir (Gemini - Énergique)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Numéro de Transfert Backup</label>
                      <Input
                        value={settings?.transfer_phone_number || ''}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, transfer_phone_number: e.target.value } : null)}
                        className="mt-1 font-mono text-sm"
                        placeholder="02 32 11 26 13"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Numéro vers lequel rediriger l'appel si le client demande un gérant.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-bold">API Key (Gemini/OpenAI)</label>
                      <Input
                        type="password"
                        value={settings?.api_key || ''}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, api_key: e.target.value } : null)}
                        className="mt-1 font-mono text-sm"
                        placeholder="Laisser vide pour utiliser la clé .env"
                      />
                    </div>
                  </div>

                  {/* Prompts and Instructions */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="text-sm font-bold">Message d'Accueil Téléphonique</label>
                      <Input
                        value={settings?.greeting_message || ''}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, greeting_message: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold flex items-center justify-between">
                        <span>Instructions de Personnalité (System Prompt)</span>
                        <Badge variant="outline" className="text-[10px] text-primary">Recommandé</Badge>
                      </label>
                      <Textarea
                        value={settings?.system_prompt || ''}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, system_prompt: e.target.value } : null)}
                        rows={11}
                        className="mt-1 font-sans text-sm leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* FAQ Knowledge Base Section */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-extrabold text-base flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    Base de Connaissances FAQ (Questions Récurrentes)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Ces questions et réponses sont injectées dans la mémoire de Clara afin qu'elle réponde parfaitement aux questions sur le restaurant.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-2xl border">
                    <div className="md:col-span-1 space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Ajouter une Question</h5>
                      <div className="space-y-2">
                        <Input
                          placeholder="Question (ex: Quels sont vos tarifs ?)"
                          value={newFAQ.question}
                          onChange={(e) => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
                        />
                        <Textarea
                          placeholder="Réponse pour le client..."
                          value={newFAQ.answer}
                          onChange={(e) => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
                          rows={3}
                        />
                        <Button variant="secondary" size="sm" className="w-full gap-2 font-bold" onClick={handleAddFAQ}>
                          <Plus className="w-4 h-4" />
                          Ajouter aux FAQ
                        </Button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">Questions Enregistrées</h5>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {localFAQs.length > 0 ? (
                          localFAQs.map((faq) => (
                            <div key={faq.key} className="p-3 bg-card border rounded-xl flex items-start justify-between gap-4 text-xs shadow-sm">
                              <div className="space-y-1">
                                <p className="font-extrabold text-primary">Q: {faq.question}</p>
                                <p className="text-muted-foreground leading-relaxed">R: {faq.answer}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveFAQ(faq.key)}>
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-10 text-muted-foreground italic text-xs">Aucune FAQ définie.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* DIALOG FOR FULL CALL TRANSCRIPT */}
      <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="font-bold flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-500" />
              Détails de l'Appel
            </DialogTitle>
            <DialogDescription>
              {selectedCall && (
                <span>
                  Numéro : {selectedCall.phone_number} • Date : {new Date(selectedCall.created_at).toLocaleString('fr-FR')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {selectedCall && selectedCall.transcript && selectedCall.transcript.length > 0 ? (
              selectedCall.transcript.map((t, idx) => (
                <div key={idx} className={`p-3 rounded-2xl max-w-[80%] ${
                  t.role === 'user' 
                    ? 'bg-muted mr-auto border' 
                    : 'bg-amber-500/10 text-amber-900 dark:text-amber-200 ml-auto border border-amber-500/20'
                }`}>
                  <div className="flex justify-between items-center gap-8 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.role === 'user' ? 'Client' : 'Clara (AI)'}
                    </span>
                    {t.time && (
                      <span className="text-[8px] opacity-40">
                        {new Date(t.time).toLocaleTimeString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{t.text}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">Aucun transcript disponible pour cet appel.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
