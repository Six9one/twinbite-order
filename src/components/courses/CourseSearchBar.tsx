import { useState, useEffect } from 'react';
import { Search, Mic, MicOff, X } from 'lucide-react';
import { toast } from 'sonner';

interface CourseSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onVoiceMatch?: (transcript: string) => void;
}

export function CourseSearchBar({
  searchQuery,
  onSearchChange,
  onVoiceMatch,
}: CourseSearchBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasSpeechRecognition(true);
      }
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!hasSpeechRecognition) {
      toast.error('Reconnaissance vocale non disponible sur ce navigateur');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (!isListening) {
      setIsListening(true);
      toast.info('🎙️ Parlez maintenant : dites vos produits...', { duration: 3000 });

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        toast.success(`Dicté : "${transcript}"`);
        onSearchChange(transcript);
        if (onVoiceMatch) onVoiceMatch(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Erreur de dictée vocale');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      setIsListening(false);
      recognition.stop();
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un produit (poulet, mozza, 31...)"
          className="w-full h-11 pl-10 pr-9 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasSpeechRecognition && (
        <button
          type="button"
          onClick={toggleVoiceRecognition}
          className={`h-11 px-3.5 rounded-xl border flex items-center justify-center transition-all ${
            isListening
              ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 active:scale-95'
          }`}
          title="Dicter à la voix"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
        </button>
      )}
    </div>
  );
}
