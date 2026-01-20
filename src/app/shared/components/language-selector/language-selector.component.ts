import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, Language } from '../../../core/services/translation.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2">
      <button
        (click)="setLanguage('fr')"
        [class.bg-blue-500]="currentLang === 'fr'"
        [class.text-white]="currentLang === 'fr'"
        [class.bg-gray-200]="currentLang !== 'fr'"
        [class.text-gray-700]="currentLang !== 'fr'"
        class="px-3 py-1 rounded-md text-sm font-medium transition-colors hover:bg-blue-600 hover:text-white"
      >
        FR
      </button>
      <button
        (click)="setLanguage('ar')"
        [class.bg-blue-500]="currentLang === 'ar'"
        [class.text-white]="currentLang === 'ar'"
        [class.bg-gray-200]="currentLang !== 'ar'"
        [class.text-gray-700]="currentLang !== 'ar'"
        class="px-3 py-1 rounded-md text-sm font-medium transition-colors hover:bg-blue-600 hover:text-white"
      >
        AR
      </button>
    </div>
  `
})
export class LanguageSelectorComponent {
  currentLang: Language = 'fr';

  constructor(private translationService: TranslationService) {
    this.translationService.getCurrentLanguage().subscribe(lang => {
      this.currentLang = lang;
    });
  }

  setLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
  }
}
