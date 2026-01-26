import { useState, useEffect } from 'react';
import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Truck, UtensilsCrossed, CalendarClock } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isSunday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

interface HeroOrderSelectorProps {
  onSelect: () => void;
}

const orderOptions = [{
  type: 'emporter' as OrderType,
  label: 'À Emporter',
  description: 'Récupérez votre commande',
  icon: ShoppingBag,
  promo: '1 achetée = 1 offerte'
}, {
  type: 'livraison' as OrderType,
  label: 'Livraison',
  description: 'Livré chez vous',
  icon: Truck,
  promo: '2 achetées = 1 offerte'
}, {
  type: 'surplace' as OrderType,
  label: 'Sur Place',
  description: 'Mangez au restaurant',
  icon: UtensilsCrossed,
  promo: '1 achetée = 1 offerte'
}];

// Generate time slots for ordering
const generateTimeSlots = () => {
  const slots: string[] = [];
  // Midi: 11:30 - 14:30
  for (let h = 11; h <= 14; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 11 && m < 30) continue;
      if (h === 14 && m > 30) continue;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  // Soir: 18:00 - 22:30
  for (let h = 18; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 30) continue;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export function HeroOrderSelector({
  onSelect
}: HeroOrderSelectorProps) {
  const {
    setOrderType,
    setScheduledInfo
  } = useOrder();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Auto-open schedule dialog if ?schedule=true is in URL
  useEffect(() => {
    if (searchParams.get('schedule') === 'true') {
      setShowScheduleDialog(true);
      // Remove the param from URL
      searchParams.delete('schedule');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSelect = (type: OrderType) => {
    setOrderType(type);
    setScheduledInfo({ isScheduled: false, scheduledFor: null });
    onSelect();
  };

  const handleScheduleClick = () => {
    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = () => {
    if (!selectedOrderType || !selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);

    setOrderType(selectedOrderType);
    setScheduledInfo({ isScheduled: true, scheduledFor: scheduledDateTime });
    setShowScheduleDialog(false);
    onSelect();
  };

  // Check if a date is a Sunday (closed day)
  const isDisabledDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalize the check date to midnight as well to ensure fair comparison
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Disable past dates, dates more than 30 days ahead, and Sundays
    return checkDate.getTime() < today.getTime() || checkDate > addDays(new Date(), 30) || isSunday(checkDate);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-center text-white/80 mb-6 text-lg">
        Comment souhaitez-vous commander ?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {orderOptions.map(option => {
          const Icon = option.icon;
          return (
            <Card
              key={option.type}
              className="p-4 sm:p-6 cursor-pointer transition-all duration-300 bg-background/90 hover:bg-primary/10 hover:scale-105 hover:ring-2 hover:ring-primary active:scale-100 touch-target"
              onClick={() => handleSelect(option.type)}
            >
              <div className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 sm:mx-auto rounded-full flex items-center justify-center sm:mb-4 transition-colors bg-primary flex-shrink-0">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="flex-1 sm:flex-none">
                  <h3 className="font-display font-bold text-lg sm:text-xl mb-0.5 sm:mb-1">{option.label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-3">{option.description}</p>
                  <span className="inline-block text-xs font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                    🍕 {option.promo}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Schedule Order Button - Under order type options */}
      <div className="flex justify-center">
        <Button
          onClick={handleScheduleClick}
          variant="outline"
          className="gap-2 px-6 py-3 bg-purple-600/90 hover:bg-purple-700 border-purple-500 text-white"
        >
          <CalendarClock className="w-5 h-5" />
          Commander pour plus tard
        </Button>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
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
              <label className="block text-sm font-medium mb-3">Type de commande</label>
              <div className="grid grid-cols-3 gap-2">
                {orderOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.type}
                      className={cn(
                        "p-3 cursor-pointer transition-all text-center",
                        selectedOrderType === option.type
                          ? "ring-2 ring-purple-500 bg-purple-50"
                          : "hover:bg-muted"
                      )}
                      onClick={() => setSelectedOrderType(option.type)}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                      <p className="text-xs font-medium truncate">{option.label}</p>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Date <span className="text-red-500">(Dimanche = Fermé)</span></label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDisabledDay}
                locale={fr}
                modifiers={{
                  sunday: (date) => isSunday(date)
                }}
                modifiersStyles={{
                  sunday: { color: 'red', textDecoration: 'line-through', opacity: 0.5 }
                }}
                className={cn("rounded-md border mx-auto pointer-events-auto")}
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Heure</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une heure" />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-xs text-muted-foreground px-2 py-1 font-medium">Midi (11h30 - 14h30)</div>
                  {timeSlots.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h < 15;
                  }).map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                  <div className="text-xs text-muted-foreground px-2 py-1 font-medium border-t mt-1">Soir (18h00 - 22h30)</div>
                  {timeSlots.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 18;
                  }).map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && selectedOrderType && (
              <Card className="p-4 bg-purple-50 border-purple-200">
                <p className="text-sm text-purple-700">
                  <span className="font-semibold">📅 Récapitulatif:</span><br />
                  {orderOptions.find(o => o.type === selectedOrderType)?.label} le{' '}
                  <span className="font-semibold">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</span> à{' '}
                  <span className="font-semibold">{selectedTime}</span>
                </p>
              </Card>
            )}

            <Button
              onClick={handleConfirmSchedule}
              disabled={!selectedOrderType || !selectedDate || !selectedTime}
              className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <CalendarClock className="w-5 h-5" />
              Confirmer et commander
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}