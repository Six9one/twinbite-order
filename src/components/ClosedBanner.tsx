import { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { setHours, setMinutes, addDays } from 'date-fns';
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

// Default hours - always used if DB doesn't have values
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

interface ClosedBannerProps {
  onScheduleConfirmed?: () => void;
}

export function ClosedBanner({ onScheduleConfirmed }: ClosedBannerProps) {
  const { setOrderType, setScheduledInfo } = useOrder();

  // Start with closed overlay showing immediately while we check
  const [isClosed, setIsClosed] = useState(true);
  const [closedMessage, setClosedMessage] = useState('Vérification...');
  const [reopenTime, setReopenTime] = useState('');
  const [displayHours, setDisplayHours] = useState<OpeningHour[]>(defaultHours);
  const [loading, setLoading] = useState(true);

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Helper to check if a time slot is in the past (for today)
  const isTimeSlotDisabled = (time: string): boolean => {
    if (!selectedDate) return false;

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);

    // If not today, all slots are available
    if (checkDate.getTime() !== today.getTime()) return false;

    // For today, check if the time has passed (with 30 min buffer for preparation)
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    // Disable if slot is less than 30 minutes from now
    const bufferMs = 30 * 60 * 1000; // 30 minutes buffer
    return slotTime.getTime() < (now.getTime() + bufferMs);
  };

  useEffect(() => {
    checkIfClosed();
    const interval = setInterval(checkIfClosed, 60000);
    return () => clearInterval(interval);
  }, []);

  // Reset selected time when date changes to force re-render of time slots
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  const checkIfClosed = async () => {
    try {
      // First check if hours enforcement is enabled
      const { data: settingsData } = await supabase
        .from('site_settings' as any)
        .select('value')
        .eq('key', 'hours_enforcement_enabled')
        .single();

      // If enforcement is disabled, don't show the closed banner
      if (settingsData && (settingsData as any).value === 'false') {
        setIsClosed(false);
        setLoading(false);
        return;
      }

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Try to fetch from DB, but use defaults if fetch fails or returns incomplete data
      let hours = [...defaultHours];

      try {
        const { data } = await supabase
          .from('opening_hours' as any)
          .select('*')
          .order('day_of_week');

        if (data && data.length > 0) {
          // Merge DB data with defaults (DB takes priority where values exist)
          hours = defaultHours.map(defaultDay => {
            const dbDay = (data as any[]).find((d: any) => d.day_of_week === defaultDay.day_of_week);
            if (dbDay) {
              return {
                day_of_week: dbDay.day_of_week,
                day_name: dbDay.day_name || defaultDay.day_name,
                is_open: dbDay.is_open !== undefined ? dbDay.is_open : defaultDay.is_open,
                morning_open: dbDay.morning_open || defaultDay.morning_open,
                morning_close: dbDay.morning_close || defaultDay.morning_close,
                evening_open: dbDay.evening_open || defaultDay.evening_open,
                evening_close: dbDay.evening_close || defaultDay.evening_close,
              };
            }
            return defaultDay;
          });
        }
      } catch (e) {
        console.log('Using default hours');
      }

      setDisplayHours(hours);

      const todayHours = hours.find(h => h.day_of_week === currentDay);
      const todayName = dayNames[currentDay];

      // Sunday or closed day
      if (!todayHours || !todayHours.is_open) {
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

        setClosedMessage(`Fermé le ${todayName}`);
        setReopenTime(`Réouverture ${nextDayName} à ${nextOpenTime}`);
        setIsClosed(true);
        setLoading(false);
        return;
      }

      // Parse times
      const timeToMinutes = (time: string | null) => {
        if (!time) return null;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const morningOpen = timeToMinutes(todayHours.morning_open) ?? 11 * 60;
      const morningClose = timeToMinutes(todayHours.morning_close) ?? 15 * 60;
      const eveningOpen = timeToMinutes(todayHours.evening_open) ?? 17 * 60 + 30;
      const eveningClose = timeToMinutes(todayHours.evening_close);
      const effectiveClose = (eveningClose === 0 || eveningClose === null) ? 24 * 60 : eveningClose;

      let isCurrentlyOpen = false;

      // Check morning
      if (currentTime >= morningOpen && currentTime < morningClose) {
        isCurrentlyOpen = true;
      }

      // Check evening (handles midnight)
      if (currentTime >= eveningOpen && currentTime < effectiveClose) {
        isCurrentlyOpen = true;
      }
      // After midnight before close
      if (eveningClose !== null && eveningClose < eveningOpen && currentTime < eveningClose) {
        isCurrentlyOpen = true;
      }

      if (!isCurrentlyOpen) {
        if (currentTime < morningOpen) {
          setClosedMessage(`Nous ouvrons bientôt !`);
          setReopenTime(`Ouverture à ${todayHours.morning_open?.slice(0, 5) || '11:00'}`);
        } else if (currentTime >= morningClose && currentTime < eveningOpen) {
          setClosedMessage(`Pause en cours`);
          setReopenTime(`Réouverture à ${todayHours.evening_open?.slice(0, 5) || '17:30'}`);
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
      console.error('Error:', err);
      setClosedMessage('Fermé actuellement');
      setReopenTime('Réouverture bientôt');
      setLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '11:00';
    return time.slice(0, 5);
  };

  const handleOrderLater = () => {
    console.log('Opening schedule dialog');
    // Pre-select today's date when opening the dialog
    const today = new Date();
    // If today is Sunday, select tomorrow instead
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    setSelectedDate(today);
    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = () => {
    if (!selectedOrderType || !selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);

    setOrderType(selectedOrderType);
    setScheduledInfo({ isScheduled: true, scheduledFor: scheduledDateTime });
    setShowScheduleDialog(false);
    setIsClosed(false);

    // Call the callback to redirect to menu
    if (onScheduleConfirmed) {
      onScheduleConfirmed();
    }
  };

  const isDisabledDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalize the check date to midnight as well to ensure fair comparison
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Disable past dates (strictly before today), dates more than 30 days ahead, and Sundays
    return checkDate.getTime() < today.getTime() || checkDate > addDays(today, 30) || checkDate.getDay() === 0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  // Restaurant is open
  if (!isClosed) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center p-4">
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">{closedMessage}</h1>
            <p className="text-white/90">{reopenTime}</p>
          </div>

          {/* Hours */}
          <div className="p-5 space-y-4">
            <h3 className="text-white font-semibold text-center flex items-center justify-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-amber-400" />
              Nos Horaires
            </h3>

            <div className="bg-black/30 rounded-xl p-3 space-y-1.5 text-sm">
              {displayHours.map(day => (
                <div
                  key={day.day_of_week}
                  className={`flex justify-between ${day.day_of_week === new Date().getDay() ? 'text-amber-400 font-bold' : 'text-white/70'}`}
                >
                  <span>{day.day_name}</span>
                  <span>
                    {!day.is_open ? 'Fermé' : (
                      `${formatTime(day.morning_open)}-${formatTime(day.morning_close)} / ${formatTime(day.evening_open)}-${formatTime(day.evening_close)}`
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Button */}
            <Button
              onClick={handleOrderLater}
              size="lg"
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-5 text-base rounded-xl"
            >
              <CalendarClock className="w-5 h-5 mr-2" />
              Commander pour plus tard
            </Button>

            {/* Contact */}
            <div className="flex gap-4 text-white/60 text-xs justify-center items-center">
              <a href="tel:0232112613" className="flex items-center gap-1 hover:text-amber-400">
                <Phone className="w-3 h-3" />
                02 32 11 26 13
              </a>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Grand-Couronne
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <CalendarClock className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-bold">Programmer votre commande</h2>
              </div>

              <div className="space-y-4">
                {/* 1. Order Type */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Type de commande</label>
                  <div className="grid grid-cols-3 gap-2">
                    {orderOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => setSelectedOrderType(opt.type)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                            selectedOrderType === opt.type
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", selectedOrderType === opt.type ? "text-purple-500" : "text-gray-400")} />
                          <span className="text-xs font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Date - Full width calendar */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Date <span className="text-red-500 text-xs">(Fermé le dimanche)</span></label>
                  <div className="flex justify-center">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={isDisabledDay}
                      locale={fr}
                      className="rounded-xl border"
                    />
                  </div>
                </div>

                {/* 3. Time - Chips horizontaly */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Heure</label>
                  <div className="space-y-3">
                    {/* Midi */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1.5">🌞 Midi (11h-15h)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'].map(time => {
                          const disabled = isTimeSlotDisabled(time);
                          return (
                            <button
                              key={time}
                              onClick={() => !disabled && setSelectedTime(time)}
                              disabled={disabled}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                disabled
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                                  : selectedTime === time
                                    ? "bg-purple-500 text-white"
                                    : "bg-gray-100 hover:bg-gray-200"
                              )}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Soir */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1.5">🌙 Soir (17h30-00h)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'].map(time => {
                          const disabled = isTimeSlotDisabled(time);
                          return (
                            <button
                              key={time}
                              onClick={() => !disabled && setSelectedTime(time)}
                              disabled={disabled}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                disabled
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                                  : selectedTime === time
                                    ? "bg-purple-500 text-white"
                                    : "bg-gray-100 hover:bg-gray-200"
                              )}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowScheduleDialog(false)}
                    className="flex-1 h-11"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleConfirmSchedule}
                    disabled={!selectedOrderType || !selectedDate || !selectedTime}
                    className="flex-1 h-11 bg-purple-600 hover:bg-purple-700"
                  >
                    Confirmer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
