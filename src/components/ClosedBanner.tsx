import { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [isClosed, setIsClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState('');
  const [reopenTime, setReopenTime] = useState('');
  const [allHours, setAllHours] = useState<OpeningHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIfClosed();
    // Recheck every minute
    const interval = setInterval(checkIfClosed, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkIfClosed = async () => {
    try {
      const { data, error } = await supabase
        .from('opening_hours' as any)
        .select('*')
        .order('day_of_week');

      if (error) {
        console.error('Error fetching hours:', error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No opening hours found');
        setLoading(false);
        return;
      }

      const hours = data as unknown as OpeningHour[];
      setAllHours(hours);

      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

      const todayHours = hours.find(h => h.day_of_week === currentDay);

      if (!todayHours) {
        setLoading(false);
        return;
      }

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

        setClosedMessage(`Nous sommes fermés le ${todayHours.day_name}`);
        setReopenTime(`Réouverture ${nextDayName} à ${nextOpenTime}`);
        setIsClosed(true);
        setLoading(false);
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

      // Determine status
      if (!isCurrentlyOpen) {
        if (morningOpen !== null && currentTime < morningOpen) {
          const openHour = `${Math.floor(morningOpen / 60).toString().padStart(2, '0')}:${(morningOpen % 60).toString().padStart(2, '0')}`;
          setClosedMessage(`Nous ouvrons bientôt !`);
          setReopenTime(`Ouverture aujourd'hui à ${openHour}`);
        } else if (morningClose !== null && eveningOpen !== null && currentTime >= morningClose && currentTime < eveningOpen) {
          const reopenHour = `${Math.floor(eveningOpen / 60).toString().padStart(2, '0')}:${(eveningOpen % 60).toString().padStart(2, '0')}`;
          setClosedMessage(`Pause en cours`);
          setReopenTime(`Réouverture à ${reopenHour}`);
        } else {
          setClosedMessage(`Fermé pour aujourd'hui`);
          setReopenTime(`Réouverture demain à 11:00`);
        }
        setIsClosed(true);
      } else {
        setIsClosed(false);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking hours:', err);
      setLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const handleOrderLater = () => {
    // Navigate to home with schedule parameter
    navigate('/?schedule=true');
    // Close the overlay temporarily to allow ordering
    setIsClosed(false);
  };

  // Don't show while loading
  if (loading) return null;

  // Don't show if open
  if (!isClosed) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{closedMessage}</h1>
          <p className="text-white/90 text-lg">{reopenTime}</p>
        </div>

        {/* Opening Hours */}
        <div className="p-6 space-y-4">
          <h3 className="text-white font-semibold text-center flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Nos Horaires
          </h3>

          <div className="bg-black/30 rounded-xl p-4 space-y-2">
            {allHours.length > 0 ? (
              allHours.map(day => (
                <div
                  key={day.day_of_week}
                  className={`flex justify-between text-sm ${day.day_of_week === new Date().getDay() ? 'text-amber-400 font-bold' : 'text-white/70'}`}
                >
                  <span>{day.day_name}</span>
                  <span>
                    {!day.is_open ? (
                      'Fermé'
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
              ))
            ) : (
              <div className="text-white/70 text-center text-sm">
                <div>Lun-Sam: 11:00-15:00 / 17:30-00:00</div>
                <div>Dimanche: Fermé</div>
              </div>
            )}
          </div>

          {/* Commander pour plus tard button */}
          <Button
            onClick={handleOrderLater}
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 text-lg rounded-xl"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Commander pour plus tard
          </Button>

          {/* Contact info */}
          <div className="flex flex-col sm:flex-row gap-3 text-white/60 text-sm justify-center items-center pt-2">
            <a href="tel:0232112613" className="flex items-center gap-2 hover:text-amber-400 transition-colors">
              <Phone className="w-4 h-4" />
              02 32 11 26 13
            </a>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Grand-Couronne
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}