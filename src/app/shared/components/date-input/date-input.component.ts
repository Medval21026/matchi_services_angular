import { Component, Input, forwardRef, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-date-input',
  standalone: true,
  template: `
    <div class="relative flex items-center w-full">
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
        class="flex-1"
        #dateInput
      />
      <button
        type="button"
        class="ml-2 p-2 text-gray-400 hover:text-gray-600 focus:outline-none rounded-lg hover:bg-gray-100 transition-colors"
        (click)="openDatePicker()"
        [disabled]="isDisabled"
        tabindex="-1"
        aria-label="Ouvrir le calendrier"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </button>
    </div>
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

  @ViewChild('dateInput', { static: false }) dateInput?: ElementRef<HTMLInputElement>;

  internalValue: string = ''; // Format YYYY-MM-DD
  isDisabled: boolean = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};
  private onValidationChange = () => {};

  ngOnInit(): void {
    // Plus besoin de détecter mobile, on utilise toujours input date
  }

  ngOnDestroy(): void {
    // Plus besoin de listener
  }


  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.internalValue = input.value;
    this.onChange(input.value);
  }

  openDatePicker(): void {
    if (this.isDisabled) return;
    
    if (this.dateInput?.nativeElement) {
      // Ouvrir le date picker natif
      this.dateInput.nativeElement.showPicker();
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.internalValue = value || '';
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
