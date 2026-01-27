import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
    Sparkles, Camera, Plus, X, Clock, RefreshCw, Trash2,
    Check, Image, ChevronDown, ChevronUp, Calendar, Search
} from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';

interface CleaningEntry {
    id: string;
    zone_name: string;
    scheduled_date: string;
    status: string;
    proof_photo_url: string | null;
    completed_at: string | null;
    completed_by: string | null;
    notes: string | null;
}

// Predefined suggestions for cleaning tasks
const CLEANING_SUGGESTIONS = [
    'Nettoyage friteuse',
    'Four',
    'Plan de travail',
    'Sol cuisine',
    'Hottes',
    'Bacs réfrigérés',
    'Éviers',
    'Poubelles',
    'Zone préparation',
    'Murs et plafond',
    'Vitres',
    'Tables et chaises',
    'Toilettes',
    'Réserve'
];

export function CleaningPlanTab() {
    const [entries, setEntries] = useState<CleaningEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<CleaningEntry[]>([]);
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

    // Form state
    const [taskName, setTaskName] = useState('');
    const [taskNote, setTaskNote] = useState('');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchTodayEntries(); }, []);

    const fetchTodayEntries = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('kitchen_cleaning_tasks' as any)
            .select('*')
            .eq('scheduled_date', today)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });
        if (data) setEntries(data as unknown as CleaningEntry[]);
        setLoading(false);
    };

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('kitchen_cleaning_tasks' as any)
            .select('*')
            .neq('scheduled_date', today)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(50);
        if (data) setHistoryEntries(data as unknown as CleaningEntry[]);
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setCapturedPhoto(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEntry = async () => {
        if (!taskName.trim()) {
            toast.error('Veuillez entrer un nom de tâche');
            return;
        }

        setUploading(true);
        try {
            let photoUrl: string | null = null;

            // Upload photo if captured
            if (capturedPhoto) {
                photoUrl = await uploadToKitchenStorage(
                    KITCHEN_BUCKETS.CLEANING_PROOFS,
                    capturedPhoto,
                    `cleaning_${Date.now()}`
                );
            }

            // Insert new entry
            const { data, error } = await supabase
                .from('kitchen_cleaning_tasks' as any)
                .insert({
                    zone_id: null, // No zone reference
                    zone_name: taskName.trim(),
                    scheduled_date: today,
                    status: 'completed',
                    proof_photo_url: photoUrl,
                    completed_at: new Date().toISOString(),
                    completed_by: 'Staff',
                    notes: taskNote.trim() || null
                } as any)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setEntries(prev => [data as unknown as CleaningEntry, ...prev]);
                toast.success(`✓ ${taskName} ajouté!`);

                // Reset form
                setTaskName('');
                setTaskNote('');
                setCapturedPhoto(null);
                setShowAddForm(false);
            }
        } catch (err) {
            console.error('Error saving cleaning entry:', err);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteEntry = async (entry: CleaningEntry) => {
        if (!confirm(`Supprimer "${entry.zone_name}" ?`)) return;

        try {
            await supabase
                .from('kitchen_cleaning_tasks' as any)
                .delete()
                .eq('id', entry.id);

            setEntries(prev => prev.filter(e => e.id !== entry.id));
            toast.success('Entrée supprimée');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    const filteredSuggestions = CLEANING_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(taskName.toLowerCase())
    );

    const toggleHistory = () => {
        if (!showHistory) fetchHistory();
        setShowHistory(!showHistory);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Nettoyage du jour</h2>
                    <p className="text-slate-400 text-sm">
                        {entries.length === 0
                            ? 'Aucune tâche enregistrée'
                            : `${entries.length} tâche${entries.length > 1 ? 's' : ''} effectuée${entries.length > 1 ? 's' : ''}`
                        }
                    </p>
                </div>
                <Badge className="bg-purple-600 text-lg px-3 py-1">{entries.length}</Badge>
            </div>

            {/* Add Button */}
            {!showAddForm && (
                <Button
                    onClick={() => setShowAddForm(true)}
                    className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-lg font-bold shadow-lg"
                >
                    <Plus className="w-6 h-6 mr-2" />
                    Ajouter un nettoyage
                </Button>
            )}

            {/* Add Form */}
            {showAddForm && (
                <Card className="bg-slate-800/80 border-purple-500/50 border-2">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Nouveau nettoyage
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setTaskName('');
                                    setTaskNote('');
                                    setCapturedPhoto(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Task Name with Suggestions */}
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    value={taskName}
                                    onChange={(e) => {
                                        setTaskName(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder="Qu'avez-vous nettoyé ?"
                                    className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 h-12 text-lg"
                                />
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && taskName.length === 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                    {CLEANING_SUGGESTIONS.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setTaskName(suggestion);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-white hover:bg-purple-600/30 border-b border-slate-800 last:border-0"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Filtered Suggestions */}
                            {showSuggestions && taskName.length > 0 && filteredSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                    {filteredSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setTaskName(suggestion);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-white hover:bg-purple-600/30 border-b border-slate-800 last:border-0"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Photo Capture (Optional) */}
                        <div>
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoCapture}
                                className="hidden"
                            />

                            {capturedPhoto ? (
                                <div className="relative">
                                    <img
                                        src={capturedPhoto}
                                        alt="Photo"
                                        className="w-full h-40 object-cover rounded-xl border-2 border-green-500"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => setCapturedPhoto(null)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="w-full h-12 border-dashed border-slate-600 text-slate-400 hover:border-purple-500 hover:text-purple-400"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    Ajouter une photo (optionnel)
                                </Button>
                            )}
                        </div>

                        {/* Note (Optional) */}
                        <Textarea
                            value={taskNote}
                            onChange={(e) => setTaskNote(e.target.value)}
                            placeholder="Note (optionnel)..."
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 resize-none"
                            rows={2}
                        />

                        {/* Save Button */}
                        <Button
                            onClick={handleSaveEntry}
                            disabled={!taskName.trim() || uploading}
                            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50"
                        >
                            {uploading ? (
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Check className="w-5 h-5 mr-2" />
                            )}
                            Enregistrer
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Today's Entries */}
            {entries.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Aujourd'hui
                    </h3>
                    {entries.map(entry => (
                        <Card key={entry.id} className="bg-slate-800/60 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="p-2 rounded-lg bg-green-500/20">
                                            <Sparkles className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white">{entry.zone_name}</p>
                                            <p className="text-xs text-slate-400">
                                                {entry.completed_at && new Date(entry.completed_at).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {entry.notes && (
                                                <p className="text-sm text-slate-300 mt-1">{entry.notes}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {entry.proof_photo_url && (
                                            <button
                                                onClick={() => setViewingPhoto(entry.proof_photo_url)}
                                                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"
                                            >
                                                <Image className="w-4 h-4 text-slate-300" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteEntry(entry)}
                                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* History Toggle */}
            <Button
                variant="ghost"
                onClick={toggleHistory}
                className="w-full text-slate-400 hover:text-white"
            >
                <Calendar className="w-4 h-4 mr-2" />
                Historique
                {showHistory ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>

            {/* History Section */}
            {showHistory && (
                <div className="space-y-3">
                    {historyEntries.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">Aucun historique</p>
                    ) : (
                        historyEntries.map(entry => (
                            <Card key={entry.id} className="bg-slate-800/40 border-slate-700/50">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-slate-500" />
                                            <span className="text-slate-300">{entry.zone_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {entry.proof_photo_url && (
                                                <button
                                                    onClick={() => setViewingPhoto(entry.proof_photo_url)}
                                                    className="p-1 hover:bg-slate-700 rounded"
                                                >
                                                    <Image className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span>
                                                {entry.scheduled_date && new Date(entry.scheduled_date).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Photo Viewer Modal */}
            {viewingPhoto && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                    onClick={() => setViewingPhoto(null)}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-white"
                        onClick={() => setViewingPhoto(null)}
                    >
                        <X className="w-8 h-8" />
                    </Button>
                    <img
                        src={viewingPhoto}
                        alt="Photo preuve"
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                </div>
            )}
        </div>
    );
}

export default CleaningPlanTab;
