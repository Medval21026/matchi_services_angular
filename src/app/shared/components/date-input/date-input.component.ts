import { Component, Input, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-date-input',
  standalone: true,
  template: `
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
export class DateInputComponent implements ControlValueAccessor, Validator {
  @Input() inputId: string = '';
  @Input() placeholder: string = 'JJ/MM/AAAA';
  @Input() minDate: string = '';
  @Input() inputClass: string = '';
  @Input() inputStyle: string = '';
  @Input() hasError: boolean = false;

  internalValue: string = ''; // Format YYYY-MM-DD
  isDisabled: boolean = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};
  private onValidationChange = () => {};


  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.internalValue = input.value;
    this.onChange(input.value);
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
