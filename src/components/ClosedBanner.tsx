import { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ShoppingBag, Truck, UtensilsCrossed, CalendarClock } from 'lucide-react';

interface OpeningHour {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
}

// Default hours to show while loading
const defaultHours: OpeningHour[] = [
  { day_of_week: 0, day_name: 'Dimanche', is_open: false, morning_open: null, morning_close: null, evening_open: null, evening_close: null },
  { day_of_week: 1, day_name: 'Lundi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 2, day_name: 'Mardi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 3, day_name: 'Mercredi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 4, day_name: 'Jeudi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 5, day_name: 'Vendredi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 6, day_name: 'Samedi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
];

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Order options for scheduling
const orderOptions = [
  { type: 'emporter' as OrderType, label: 'À Emporter', icon: ShoppingBag },
  { type: 'livraison' as OrderType, label: 'Livraison', icon: Truck },
  { type: 'surplace' as OrderType, label: 'Sur Place', icon: UtensilsCrossed },
];

// Generate time slots: 11:00-15:00 and 17:30-00:00
const generateTimeSlots = () => {
  const slots: string[] = [];
  // Midi: 11:00 - 15:00
  for (let h = 11; h <= 14; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  slots.push('15:00');

  // Soir: 17:30 - 23:45
  for (let h = 17; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m < 30) continue;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export function ClosedBanner() {
  const { setOrderType, setScheduledInfo } = useOrder();

  // Start with closed overlay showing immediately while we check
  const [isClosed, setIsClosed] = useState(true);
  const [closedMessage, setClosedMessage] = useState('Vérification des horaires...');
  const [reopenTime, setReopenTime] = useState('');
  const [allHours, setAllHours] = useState<OpeningHour[]>(defaultHours);
  const [loading, setLoading] = useState(true);

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

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

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Use fetched hours or default hours
      const hours = (data && data.length > 0)
        ? data as unknown as OpeningHour[]
        : defaultHours;

      setAllHours(hours);

      const todayHours = hours.find(h => h.day_of_week === currentDay);
      const todayName = dayNames[currentDay];

      if (!todayHours || !todayHours.is_open) {
        // Find next open day
        let nextOpenDay = null;
        let daysAhead = 0;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          const dayHours = hours.find(h => h.day_of_week === checkDay);
          if (dayHours?.is_open) {
            nextOpenDay = dayHours;
            daysAhead = i;
            break;
          }
        }

        const nextOpenTime = nextOpenDay?.morning_open?.slice(0, 5) || '11:00';
        const nextDayName = daysAhead === 1 ? 'demain' : dayNames[(currentDay + daysAhead) % 7];

        setClosedMessage(`Nous sommes fermés le ${todayName}`);
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

      // Check morning hours
      if (morningOpen !== null && morningClose !== null) {
        if (currentTime >= morningOpen && currentTime < morningClose) {
          isCurrentlyOpen = true;
        }
      }

      // Check evening hours (handles midnight crossing)
      if (eveningOpen !== null && eveningClose !== null) {
        const effectiveClose = eveningClose === 0 ? 24 * 60 : eveningClose;
        if (eveningClose < eveningOpen) {
          // Closes after midnight
          if (currentTime >= eveningOpen || currentTime < eveningClose) {
            isCurrentlyOpen = true;
          }
        } else {
          if (currentTime >= eveningOpen && currentTime < effectiveClose) {
            isCurrentlyOpen = true;
          }
        }
      }

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
      // On error, default to showing closed
      setClosedMessage('Fermé actuellement');
      setReopenTime('Réouverture bientôt');
      setLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.slice(0, 5);
  };

  const handleOrderLater = () => {
    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = () => {
    if (!selectedOrderType || !selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);

    setOrderType(selectedOrderType);
    setScheduledInfo({ isScheduled: true, scheduledFor: scheduledDateTime });
    setShowScheduleDialog(false);
    setIsClosed(false); // Allow access after scheduling
  };

  const isDisabledDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || date > addDays(today, 30) || date.getDay() === 0;
  };

  // Show loading/checking overlay immediately
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Vérification des horaires...</p>
        </div>
      </div>
    );
  }

  // Don't show if open
  if (!isClosed) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
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
              {allHours.map(day => (
                <div
                  key={day.day_of_week}
                  className={`flex justify-between text-sm ${day.day_of_week === new Date().getDay() ? 'text-amber-400 font-bold' : 'text-white/70'}`}
                >
                  <span>{day.day_name || dayNames[day.day_of_week]}</span>
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
              ))}
            </div>

            {/* Commander pour plus tard button */}
            <Button
              onClick={handleOrderLater}
              size="lg"
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 text-lg rounded-xl"
            >
              <CalendarClock className="w-5 h-5 mr-2" />
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

      {/* Schedule Dialog - Cannot be closed by clicking outside or pressing escape */}
      <Dialog open={showScheduleDialog} onOpenChange={() => { }}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CalendarClock className="w-6 h-6 text-purple-500" />
              Programmer votre commande
            </DialogTitle>
            <DialogDescription>
              Choisissez la date, l'heure et le type de commande. <span className="text-red-500 font-medium">Fermé le dimanche.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Order Type Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Type de commande</label>
              <div className="grid grid-cols-3 gap-2">
                {orderOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      onClick={() => setSelectedOrderType(opt.type)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        selectedOrderType === opt.type
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <Icon className={cn("w-6 h-6", selectedOrderType === opt.type ? "text-purple-500" : "text-gray-500")} />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Date <span className="text-red-500">(Dimanche = Fermé)</span></label>
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDisabledDay}
                locale={fr}
                className="rounded-xl border mx-auto"
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Heure</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une heure" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">Midi (11h00 - 15h00)</div>
                  {timeSlots.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 11 && h < 16;
                  }).map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                  <div className="text-xs text-muted-foreground px-2 py-1 font-semibold border-t mt-1 pt-2">Soir (17h30 - 00h00)</div>
                  {timeSlots.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 17;
                  }).map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Back and Confirm buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowScheduleDialog(false)}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={handleConfirmSchedule}
                disabled={!selectedOrderType || !selectedDate || !selectedTime}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Confirmer et commander
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}