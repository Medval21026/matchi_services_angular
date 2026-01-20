import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TerrainService } from '../../../core/services/terrain.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-modifier-terrain-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './modifier-terrain-modal.component.html',
  styleUrls: ['./modifier-terrain-modal.component.css']
})
export class ModifierTerrainModalComponent implements OnInit {

  @Input() isOpen = false;

  private _terrain?: TerrainServiceDTO;
  @Input()
  set terrain(value: TerrainServiceDTO | undefined) {
    this._terrain = value;
    if (value && this.terrainForm) {
      this.loadTerrainData(value);
    }
  }
  get terrain(): TerrainServiceDTO | undefined {
    return this._terrain;
  }

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  terrainForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private terrainService: TerrainService,
    private notificationService: NotificationService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this._terrain) {
      this.loadTerrainData(this._terrain);
    }
  }

  private initForm(): void {
    this.terrainForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      adresse: ['', [Validators.required, Validators.minLength(5)]],
      heureOuverture: ['08:00', [Validators.required, Validators.pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)]],
      heureFermeture: ['22:00', [Validators.required, Validators.pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)]]
    });
  }

  private loadTerrainData(terrain: TerrainServiceDTO): void {
    this.terrainForm.patchValue({
      nom: terrain.nom,
      adresse: terrain.adresse,
      heureOuverture: terrain.heureOuverture?.substring(0, 5) ?? '08:00',
      heureFermeture: terrain.heureFermeture?.substring(0, 5) ?? '22:00'
    });
  }

  closeModal(): void {
    this.errorMessage = '';
    this.close.emit();
  }

  onSubmit(): void {
    if (this.terrainForm.invalid || !this._terrain?.id) {
      this.markFormGroupTouched(this.terrainForm);
      this.notificationService.showWarning(this.translationService.translate('terrain.fillAllFields'));
      return;
    }

    const formValue = this.terrainForm.value;

    let ouvertureMinutes = this.timeToMinutes(formValue.heureOuverture);
    let fermetureMinutes = this.timeToMinutes(formValue.heureFermeture);

    // ⏰ Gestion passage à minuit (ex: 18:00 → 02:00)
    if (fermetureMinutes <= ouvertureMinutes) {
      fermetureMinutes += 24 * 60;
    }

    if (fermetureMinutes - ouvertureMinutes <= 0) {
      this.notificationService.showError(
        this.translationService.translate('terrain.closingAfterOpening')
      );
      return;
    }

    this.isLoading = true;

    const terrain: TerrainServiceDTO = {
      id: this._terrain.id,
      nom: formValue.nom.trim(),
      adresse: formValue.adresse.trim(),
      proprietaireId: this._terrain.proprietaireId,
      heureOuverture: formValue.heureOuverture,
      heureFermeture: formValue.heureFermeture
    };

    this.terrainService.updateTerrain(this._terrain.id, terrain).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.showSuccess(this.translationService.translate('terrain.modifiedSuccess'));
        this.saved.emit();
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        const msg = this.extractErrorMessage(error);
        this.notificationService.showError(msg);
        console.error(error);
      }
    });
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.terrainForm.get(fieldName);
    if (!field || !field.touched) return '';

    if (field.hasError('required')) return this.translationService.translate('terrain.fieldRequired');
    if (field.hasError('minlength')) {
      return fieldName === 'nom'
        ? this.translationService.translate('terrain.nameMinLength')
        : this.translationService.translate('terrain.addressMinLength');
    }
    if (field.hasError('pattern')) return this.translationService.translate('terrain.fieldInvalidFormat');

    return '';
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Le serveur est inaccessible.';
    }
    return error.error?.message || 'Une erreur est survenue.';
  }
}
