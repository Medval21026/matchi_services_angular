import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { TranslationService } from './app/core/services/translation.service';

bootstrapApplication(App, appConfig)
  .then(appRef => {
    // Initialiser le service de traduction pour appliquer la langue au démarrage
    const translationService = appRef.injector.get(TranslationService);
    const savedLang = localStorage.getItem('language') as 'fr' | 'ar';
    if (savedLang && (savedLang === 'fr' || savedLang === 'ar')) {
      translationService.setLanguage(savedLang);
    } else {
      translationService.setLanguage('fr');
    }
  })
  .catch((err) => console.error(err));
