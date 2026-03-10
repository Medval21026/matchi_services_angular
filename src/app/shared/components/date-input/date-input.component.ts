import { Component, Input, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-date-input',
  standalone: true,
  template: `
    @if (isMobile) {
      <input
        type="text"
        [id]="inputId"
        [value]="displayValue"
        [placeholder]="placeholder"
        [class]="inputClass"
        [class.border-red-500]="hasError"
        [style]="inputStyle"
        (input)="onTextInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus()"
        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
        maxlength="10"
        [disabled]="isDisabled"
      />
    } @else {
      <input
        type="date"
        [id]="inputId"
        [value]="internalValue"
        [min]="minDate"
        [placeholder]="placeholder"
        lang="fr"
        [class]="inputClass"
        [class.border-red-500]="hasError"
        [style]="inputStyle"
        (input)="onDateInput($event)"
        (blur)="onBlur()"
        [disabled]="isDisabled"
      />
    }
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true
    }
  ]
})
export class DateInputComponent implements ControlValueAccessor, Validator, OnInit, OnDestroy {
  @Input() inputId: string = '';
  @Input() placeholder: string = 'JJ/MM/AAAA';
  @Input() minDate: string = '';
  @Input() inputClass: string = '';
  @Input() inputStyle: string = '';
  @Input() hasError: boolean = false;

  internalValue: string = ''; // Format YYYY-MM-DD
  displayValue: string = ''; // Format DD/MM/YYYY pour mobile
  isMobile: boolean = false;
  isDisabled: boolean = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};
  private onValidationChange = () => {};

  ngOnInit(): void {
    // Détecter si on est sur mobile
    this.isMobile = window.innerWidth <= 640;
    
    // Écouter les changements de taille de fenêtre
    window.addEventListener('resize', this.checkMobile);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.checkMobile);
  }

  private checkMobile = (): void => {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 640;
    
    // Si on passe de desktop à mobile ou vice versa, convertir la valeur
    if (wasMobile !== this.isMobile && this.internalValue) {
      if (this.isMobile) {
        this.displayValue = this.formatToDisplay(this.internalValue);
      } else {
        this.displayValue = '';
      }
    }
  };

  // Conversion YYYY-MM-DD vers DD/MM/YYYY
  private formatToDisplay(value: string): string {
    if (!value || !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return '';
    }
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  // Conversion DD/MM/YYYY vers YYYY-MM-DD
  private formatToValue(value: string): string {
    if (!value) return '';
    
    // Nettoyer la valeur (enlever les espaces, etc.)
    const cleaned = value.replace(/\s+/g, '').replace(/[^\d/]/g, '');
    
    // Vérifier le format DD/MM/YYYY
    const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return '';
    }
    
    const [, day, month, year] = match;
    
    // Valider la date
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return '';
    }
    
    return `${year}-${month}-${day}`;
  }

  onTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // Supprimer tout ce qui n'est pas un chiffre ou un slash
    value = value.replace(/[^\d/]/g, '');
    
    // Ajouter automatiquement les slashes
    if (value.length > 2 && value[2] !== '/') {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length > 5 && value[5] !== '/') {
      value = value.slice(0, 5) + '/' + value.slice(5);
    }
    
    // Limiter à 10 caractères (DD/MM/YYYY)
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    
    this.displayValue = value;
    input.value = value;
    
    // Convertir en format YYYY-MM-DD
    const formattedValue = this.formatToValue(value);
    if (formattedValue) {
      this.internalValue = formattedValue;
      this.onChange(formattedValue);
    }
  }

  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.internalValue = input.value;
    this.onChange(input.value);
  }

  onFocus(): void {
    // Sur mobile, si le champ est vide, afficher le placeholder
    if (this.isMobile && !this.displayValue) {
      // Ne rien faire, le placeholder HTML fera le travail
    }
  }

  onBlur(): void {
    this.onTouched();
    
    // Sur mobile, valider et formater la date
    if (this.isMobile && this.displayValue) {
      const formatted = this.formatToValue(this.displayValue);
      if (formatted) {
        this.displayValue = this.formatToDisplay(formatted);
        this.internalValue = formatted;
        this.onChange(formatted);
      } else if (this.displayValue) {
        // Si le format est invalide, réinitialiser
        this.displayValue = '';
        this.internalValue = '';
        this.onChange('');
      }
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.internalValue = value || '';
    if (this.isMobile) {
      this.displayValue = this.formatToDisplay(value || '');
    } else {
      this.displayValue = '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // Validator implementation
  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // La validation required est gérée par le formulaire
    }
    
    // Vérifier que la valeur est au format YYYY-MM-DD
    if (!control.value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { invalidDate: true };
    }
    
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidationChange = fn;
  }
}
