
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Languages } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { useLanguage } from '@/context/language-context';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function AboutPage() {
  const { t, language, setLanguage } = useLanguage();

  const handleLanguageChange = (checked: boolean) => {
    setLanguage(checked ? 'hi' : 'en');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          {t('about_this_app')}
        </h2>
      </div>
      <Card>
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="text-2xl pt-4">{t('app_title')}</CardTitle>
          <CardDescription>
            {t('developed_by')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground px-4 md:px-8">
           <Separator className="my-4" />
          <div className="flex items-center justify-center space-x-2 my-6">
            <Label htmlFor="language-toggle" className="text-lg font-semibold text-foreground">
              {t('language_toggle_label')}
            </Label>
            <Switch
              id="language-toggle"
              checked={language === 'hi'}
              onCheckedChange={handleLanguageChange}
              aria-label="Toggle language between English and Hindi"
            />
             <Languages className="h-5 w-5 text-foreground" />
          </div>
          <Separator className="my-4" />
          <div className="space-y-4 text-center max-w-3xl mx-auto">
              <p>
                {t('about_p1')}
              </p>
              <p>
                {t('about_p2')}
              </p>
              <p>
                {t('about_p3')}
              </p>
          </div>
           <Separator className="my-6" />
           <div className="text-center">
             <h3 className="text-lg font-semibold text-foreground mb-4">{t('contact_devs')}</h3>
             <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-foreground">
                <a href="mailto:help.hope8236@gmail.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                    <span>help.hope8236@gmail.com</span>
                </a>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                    <a href="tel:7247089447" className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Phone className="h-5 w-5" />
                        <span>UDAY JATALE: 7247089447</span>
                    </a>
                     <a href="tel:8236001216" className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Phone className="h-5 w-5" />
                        <span>KOUSHAL MAHAJAN: 8236001216</span>
                    </a>
                </div>
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
