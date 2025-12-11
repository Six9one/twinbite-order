import { Pizza, Phone, MapPin, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Pizza className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl font-bold">Twin Pizza</h3>
            </div>
            <p className="text-background/70 text-sm">
              Les meilleures pizzas, tacos, et sandwiches de la ville. 
              Qualité et saveur garanties depuis 2010.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>01 23 45 67 89</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>123 Rue de la Pizza, 75001 Paris</span>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Horaires</h4>
            <div className="space-y-2 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <div>
                  <p>Lun - Ven: 11h00 - 23h00</p>
                  <p>Sam - Dim: 11h00 - 00h00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm text-background/50">
          © 2024 Twin Pizza. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
