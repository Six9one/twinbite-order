import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import logoImage from '@/assets/logo.png';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-8">
      <div className="container mx-auto px-4">
        {/* Centered Logo */}
        <div className="flex flex-col items-center justify-center mb-6">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img 
              src={logoImage} 
              alt="Twin Pizza" 
              className="w-16 h-16 rounded-full mb-3"
            />
          </Link>
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <h3 className="font-display text-xl font-bold">Twin Pizza</h3>
          </Link>
        </div>

        {/* Social Media */}
        <div className="flex items-center justify-center gap-6 mb-6">
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
          <a 
            href="https://twitter.com/twinpizza" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Twitter className="w-5 h-5" />
          </a>
        </div>

        <div className="border-t border-background/20 pt-6 text-center text-sm text-background/50">
          © 2025 Twin Pizza. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
