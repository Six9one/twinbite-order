import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MapPin, Phone, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/logo.png';

interface OpeningHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  open_time_evening: string | null;
  close_time_evening: string | null;
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

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

    let result = `${formatTime(day.open_time)}-${formatTime(day.close_time)}`;
    if (day.open_time_evening) {
      result += ` / ${formatTime(day.open_time_evening)}-${formatTime(day.close_time_evening)}`;
    }
    return result;
  };

  return (
    <footer className="bg-foreground text-background py-8 sm:py-10">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Logo & Info */}
          <div className="text-center md:text-left">
            <Link to="/" className="hover:opacity-80 transition-opacity inline-flex items-center gap-3 mb-3 sm:mb-4">
              <img
                src={logoImage}
                alt="Twin Pizza"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full"
              />
              <h3 className="font-display text-xl sm:text-2xl font-bold">Twin Pizza</h3>
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
          <div className="text-center sm:text-left md:text-center">
            <h4 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2 justify-center sm:justify-start md:justify-center">
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
                    <span>{DAY_NAMES[day.day_of_week]}</span>
                    <span>{formatHours(day)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="text-background/70">Lun - Sam: 11h00-15h00 / 17h30-00h00</div>
                  <div className="text-background/70">Dimanche: Fermé</div>
                </>
              )}
            </div>
          </div>

          {/* Social Media */}
          <div className="text-center sm:text-right">
            <h4 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Suivez-nous</h4>
            <div className="flex items-center justify-center sm:justify-end gap-3 sm:gap-4">
              <a
                href="https://facebook.com/twinpizza"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
              >
                <Facebook className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a
                href="https://instagram.com/twinpizza"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
              >
                <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="border-t border-background/20 pt-6">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-background/60 mb-4">
            <Link to="/mentions-legales" className="hover:text-primary transition-colors">Mentions Légales</Link>
            <span className="text-background/30">•</span>
            <Link to="/confidentialite" className="hover:text-primary transition-colors">Confidentialité</Link>
            <span className="text-background/30">•</span>
            <Link to="/cgv" className="hover:text-primary transition-colors">CGV</Link>
          </div>
          <div className="text-center text-sm text-background/50">
            © 2026 Twin Pizza Grand-Couronne. Tous droits réservés.
          </div>
        </div>
      </div>
    </footer>
  );
}
