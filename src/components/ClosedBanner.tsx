import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OpeningHour {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
}

export function ClosedBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [closedMessage, setClosedMessage] = useState('');

  useEffect(() => {
    checkIfClosed();
  }, []);

  const checkIfClosed = async () => {
    const { data, error } = await supabase
      .from('opening_hours' as any)
      .select('*');
    
    if (error || !data) return;

    const hours = data as unknown as OpeningHour[];
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    const todayHours = hours.find(h => h.day_of_week === currentDay);
    
    if (!todayHours) return;

    // If closed today (like Sunday)
    if (!todayHours.is_open) {
      setClosedMessage(`Nous sommes fermés le ${todayHours.day_name}. À bientôt!`);
      setIsVisible(true);
      return;
    }

    // Check if we're within opening hours
    const timeToMinutes = (time: string | null) => {
      if (!time) return null;
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const morningOpen = timeToMinutes(todayHours.morning_open);
    const morningClose = timeToMinutes(todayHours.morning_close);
    const eveningOpen = timeToMinutes(todayHours.evening_open);
    const eveningClose = timeToMinutes(todayHours.evening_close);

    let isCurrentlyOpen = false;

    // Check morning hours
    if (morningOpen !== null && morningClose !== null) {
      if (currentTime >= morningOpen && currentTime < morningClose) {
        isCurrentlyOpen = true;
      }
    }

    // Check evening hours (handle midnight crossing)
    if (eveningOpen !== null && eveningClose !== null) {
      if (eveningClose < eveningOpen) {
        // Closes after midnight
        if (currentTime >= eveningOpen || currentTime < eveningClose) {
          isCurrentlyOpen = true;
        }
      } else {
        if (currentTime >= eveningOpen && currentTime < eveningClose) {
          isCurrentlyOpen = true;
        }
      }
    }

    if (!isCurrentlyOpen) {
      // Format next opening time
      let nextOpening = '';
      if (morningOpen !== null && currentTime < morningOpen) {
        const hours = Math.floor(morningOpen / 60);
        const mins = morningOpen % 60;
        nextOpening = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      } else if (eveningOpen !== null && currentTime < eveningOpen) {
        const hours = Math.floor(eveningOpen / 60);
        const mins = eveningOpen % 60;
        nextOpening = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }

      setClosedMessage(
        nextOpening 
          ? `Nous sommes actuellement fermés. Réouverture à ${nextOpening}.`
          : 'Nous sommes actuellement fermés.'
      );
      setIsVisible(true);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-destructive text-destructive-foreground">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{closedMessage}</span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-destructive-foreground/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}