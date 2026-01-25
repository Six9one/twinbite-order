import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MapPin, Phone, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/logo.png';

interface OpeningHour {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
}

export function Footer() {
  const [hours, setHours] = useState<OpeningHour[]>([]);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    const { data } = await supabase
      .from('opening_hours' as any)
      .select('*')
      .order('day_of_week');

    if (data) {
      setHours(data as unknown as OpeningHour[]);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const formatHours = (day: OpeningHour) => {
    if (!day.is_open) return 'Fermé';

    let result = `${formatTime(day.morning_open)}-${formatTime(day.morning_close)}`;
    if (day.evening_open) {
      result += ` / ${formatTime(day.evening_open)}-${formatTime(day.evening_close)}`;
    }
    return result;
  };

  return (
    <footer className="bg-foreground text-background py-10">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo & Info */}
          <div className="text-center md:text-left">
            <Link to="/" className="hover:opacity-80 transition-opacity inline-flex items-center gap-3 mb-4">
              <img
                src={logoImage}
                alt="Twin Pizza"
                className="w-14 h-14 rounded-full"
              />
              <h3 className="font-display text-2xl font-bold">Twin Pizza</h3>
            </Link>
            <div className="space-y-2 text-sm text-background/70">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>60 Rue Georges Clemenceau, 76530 Grand-Couronne</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href="tel:0232112613" className="hover:text-primary">02 32 11 26 13</a>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="text-center">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 justify-center">
              <Clock className="w-5 h-5 text-primary" />
              Horaires d'ouverture
            </h4>
            <div className="text-sm space-y-1">
              {hours.length > 0 ? (
                hours.map(day => (
                  <div
                    key={day.day_of_week}
                    className={`flex justify-between gap-4 max-w-xs mx-auto ${day.day_of_week === new Date().getDay() ? 'text-primary font-bold' : 'text-background/70'}`}
                  >
                    <span>{day.day_name}</span>
                    <span>{formatHours(day)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="text-background/70">Lun-Sam: 11:00-15:00 / 17:30-00:00</div>
                  <div className="text-background/70">Dimanche: Fermé</div>
                </>
              )}
            </div>
          </div>

          {/* Social Media */}
          <div className="text-center md:text-right">
            <h4 className="font-semibold text-lg mb-4">Suivez-nous</h4>
            <div className="flex items-center justify-center md:justify-end gap-4">
              <a
                href="https://facebook.com/twinpizza"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/twinpizza"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 pt-6 text-center text-sm text-background/50">
          © 2025 Twin Pizza Grand-Couronne. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
