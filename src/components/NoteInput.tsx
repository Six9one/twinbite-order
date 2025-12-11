import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare } from 'lucide-react';

interface NoteInputProps {
  note: string;
  onChange: (note: string) => void;
  placeholder?: string;
}

export function NoteInput({ note, onChange, placeholder = "Ex: Sans oignon, bien cuit, allergie..." }: NoteInputProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="w-4 h-4 text-primary" />
        Note pour ce produit (optionnel)
      </Label>
      <Textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background resize-none h-20"
        maxLength={200}
      />
      <p className="text-xs text-muted-foreground text-right">
        {note.length}/200 caractères
      </p>
    </div>
  );
}
