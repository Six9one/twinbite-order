import React from 'react';
import { useLanguage, Language } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';

const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                    <span className="text-lg">{currentLang.flag}</span>
                    <Globe className="w-4 h-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`gap-3 cursor-pointer ${language === lang.code ? 'bg-primary/10' : ''}`}
                    >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                        {language === lang.code && (
                            <Check className="w-4 h-4 ml-auto text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
