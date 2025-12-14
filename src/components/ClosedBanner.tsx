import { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';
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
  const [isBreakTime, setIsBreakTime] = useState(false);

  useEffect(() => {
    checkIfClosed();
    // Recheck every minute
    const interval = setInterval(checkIfClosed, 60000);
    return () => clearInterval(interval);
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
      // Find next open day
      const tomorrowDay = (currentDay + 1) % 7;
      const tomorrowHours = hours.find(h => h.day_of_week === tomorrowDay);
      const nextOpenTime = tomorrowHours?.morning_open || '11:00';
      
      setClosedMessage(`Nous sommes fermés le ${todayHours.day_name}. Réouverture demain à ${nextOpenTime.slice(0, 5)}.`);
      setIsBreakTime(false);
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
    let statusType: 'closed_before' | 'break' | 'closed_after' | 'open' = 'open';

    // Check morning hours (11:00 - 15:00)
    if (morningOpen !== null && morningClose !== null) {
      if (currentTime >= morningOpen && currentTime < morningClose) {
        isCurrentlyOpen = true;
      }
    }

    // Check evening hours (17:30 - 00:00)
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

    // Determine status type
    if (!isCurrentlyOpen) {
      if (morningOpen !== null && currentTime < morningOpen) {
        statusType = 'closed_before';
      } else if (morningClose !== null && eveningOpen !== null && currentTime >= morningClose && currentTime < eveningOpen) {
        statusType = 'break';
      } else {
        statusType = 'closed_after';
      }

      // Build message based on status
      let message = '';
      
      switch (statusType) {
        case 'closed_before':
          const openHour = morningOpen !== null ? `${Math.floor(morningOpen / 60).toString().padStart(2, '0')}:${(morningOpen % 60).toString().padStart(2, '0')}` : '11:00';
          message = `🌅 Nous ouvrons à ${openHour}. À très vite !`;
          setIsBreakTime(false);
          break;
          
        case 'break':
          const reopenHour = eveningOpen !== null ? `${Math.floor(eveningOpen / 60).toString().padStart(2, '0')}:${(eveningOpen % 60).toString().padStart(2, '0')}` : '17:30';
          message = `☕ Pause en cours ! Réouverture à ${reopenHour}.`;
          setIsBreakTime(true);
          break;
          
        case 'closed_after':
          message = `🌙 Nous sommes fermés pour aujourd'hui. À demain dès 11:00 !`;
          setIsBreakTime(false);
          break;
      }

      setClosedMessage(message);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`${isBreakTime ? 'bg-amber-500' : 'bg-destructive'} text-white`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <span className="text-sm font-medium">{closedMessage}</span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}