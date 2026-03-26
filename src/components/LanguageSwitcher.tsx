'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname, routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Languages, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

export function LanguageSwitcher() {
    const locale = useLocale();
    const t = useTranslations('LanguageSwitcher');
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const onLocaleChange = (newLocale: string) => {
        router.replace(
            // @ts-ignore
            { pathname, params },
            { locale: newLocale }
        );
    };

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
    ];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors">
                    <Languages className="h-5 w-5" />
                    <span className="sr-only">{t('switchLanguage')}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5 rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl" align="end">
                <div className="space-y-1">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => onLocaleChange(lang.code)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-muted group",
                                locale === lang.code ? "text-primary bg-primary/5" : "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="text-lg leading-none">{lang.flag}</span>
                                <span>{lang.label}</span>
                            </div>
                            {locale === lang.code && <Check className="h-4 w-4" />}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
