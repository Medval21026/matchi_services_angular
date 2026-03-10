import { Directive, ElementRef, HostListener, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: 'input[type="date"]',
  standalone: true
})
export class DateFormatDirective implements OnInit {
  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Forcer le format français
    this.renderer.setAttribute(this.el.nativeElement, 'lang', 'fr');
    this.renderer.setAttribute(this.el.nativeElement, 'data-format', 'dd/MM/yyyy');
    
    // Ajouter des styles pour forcer le format correct
    this.renderer.setStyle(this.el.nativeElement, 'text-align', 'left');
    this.renderer.setStyle(this.el.nativeElement, 'direction', 'ltr');
    this.renderer.setStyle(this.el.nativeElement, 'font-variant-numeric', 'tabular-nums');
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Si la valeur est au format YYYY-MM-DD, s'assurer qu'elle est correcte
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // La valeur est déjà au bon format pour l'input date
      // Mais on peut forcer le format d'affichage via CSS
      this.forceDateFormat();
    }
  }

  @HostListener('change', ['$event'])
  onChange(event: Event): void {
    this.forceDateFormat();
  }

  private forceDateFormat(): void {
    // Ajouter une classe pour forcer le format
    this.renderer.addClass(this.el.nativeElement, 'date-format-fixed');
    
    // Injecter des styles CSS supplémentaires si nécessaire
    if (window.innerWidth <= 640) {
      // Sur mobile, forcer le format via JavaScript si possible
      if (!document.getElementById('date-format-fix')) {
        const style = document.createElement('style');
        style.id = 'date-format-fix';
        style.textContent = `
          @media (max-width: 640px) {
            input[type="date"].date-format-fixed {
              font-variant-numeric: tabular-nums !important;
              text-align: left !important;
              direction: ltr !important;
            }
            input[type="date"].date-format-fixed::-webkit-datetime-edit {
              display: flex !important;
              flex-direction: row !important;
              width: 100% !important;
            }
            input[type="date"].date-format-fixed::-webkit-datetime-edit-fields-wrapper {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              gap: 0 !important;
            }
            input[type="date"].date-format-fixed::-webkit-datetime-edit-day-field {
              order: 1 !important;
              width: 2ch !important;
              min-width: 2ch !important;
              max-width: 2ch !important;
              text-align: center !important;
            }
            input[type="date"].date-format-fixed::-webkit-datetime-edit-month-field {
              order: 2 !important;
              width: 2ch !important;
              min-width: 2ch !important;
              max-width: 2ch !important;
              text-align: center !important;
            }
            input[type="date"].date-format-fixed::-webkit-datetime-edit-year-field {
              order: 3 !important;
              width: 4ch !important;
              min-width: 4ch !important;
              max-width: 4ch !important;
              text-align: center !important;
            }
            input[type="date"].date-format-fixed::-webkit-datetime-edit-text {
              padding: 0 2px !important;
              color: #374151 !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }
}
