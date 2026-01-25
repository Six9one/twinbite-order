import { useState, useEffect } from 'react';
import { Clock, Calendar, X, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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
  const [reopenTime, setReopenTime] = useState('');
  const [allHours, setAllHours] = useState<OpeningHour[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    checkIfClosed();
    // Recheck every minute
    const interval = setInterval(checkIfClosed, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkIfClosed = async () => {
    const { data, error } = await supabase
      .from('opening_hours' as any)
      .select('*')
      .order('day_of_week');

    if (error || !data) return;

    const hours = data as unknown as OpeningHour[];
    setAllHours(hours);

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    const todayHours = hours.find(h => h.day_of_week === currentDay);

    if (!todayHours) return;

    // If closed today (like Sunday)
    if (!todayHours.is_open) {
      // Find next open day
      let nextOpenDay = null;
      for (let i = 1; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        const dayHours = hours.find(h => h.day_of_week === checkDay);
        if (dayHours?.is_open) {
          nextOpenDay = dayHours;
          break;
        }
      }

      const nextOpenTime = nextOpenDay?.morning_open?.slice(0, 5) || '11:00';
      const nextDayName = nextOpenDay?.day_name || 'demain';

      setClosedMessage(`Fermé aujourd'hui`);
      setReopenTime(`Réouverture ${nextDayName} à ${nextOpenTime}`);
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
      switch (statusType) {
        case 'closed_before':
          const openHour = morningOpen !== null ? `${Math.floor(morningOpen / 60).toString().padStart(2, '0')}:${(morningOpen % 60).toString().padStart(2, '0')}` : '11:00';
          setClosedMessage(`Nous ouvrons bientôt !`);
          setReopenTime(`Ouverture à ${openHour}`);
          setIsBreakTime(false);
          break;

        case 'break':
          const reopenHour = eveningOpen !== null ? `${Math.floor(eveningOpen / 60).toString().padStart(2, '0')}:${(eveningOpen % 60).toString().padStart(2, '0')}` : '17:30';
          setClosedMessage(`Pause en cours`);
          setReopenTime(`Réouverture à ${reopenHour}`);
          setIsBreakTime(true);
          break;

        case 'closed_after':
          setClosedMessage(`Fermé pour aujourd'hui`);
          setReopenTime(`Réouverture demain à 11:00`);
          setIsBreakTime(false);
          break;
      }

      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  if (!isVisible) return null;

  return (
    <div className={`${isBreakTime ? 'bg-amber-500' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white shadow-lg`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status info */}
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">{closedMessage}</p>
              <p className="text-white/90 text-sm">{reopenTime}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSchedule(!showSchedule)}
              className="border-white/30 text-white hover:bg-white/20 bg-white/10"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Horaires
            </Button>

            <Link to="/?schedule=true">
              <Button
                size="sm"
                className="bg-white text-red-600 hover:bg-white/90 font-bold"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Commander pour plus tard
              </Button>
            </Link>

            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors ml-2"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Opening Hours Dropdown */}
        {showSchedule && allHours.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {allHours.map((day) => (
                <div
                  key={day.day_of_week}
                  className={`flex justify-between items-center p-2 rounded ${day.day_of_week === new Date().getDay() ? 'bg-white/20 font-bold' : ''}`}
                >
                  <span>{day.day_name}</span>
                  <span>
                    {!day.is_open ? (
                      <span className="text-white/70">Fermé</span>
                    ) : (
                      <>
                        {formatTime(day.morning_open)}-{formatTime(day.morning_close)}
                        {day.evening_open && (
                          <> / {formatTime(day.evening_open)}-{formatTime(day.evening_close)}</>
                        )}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}