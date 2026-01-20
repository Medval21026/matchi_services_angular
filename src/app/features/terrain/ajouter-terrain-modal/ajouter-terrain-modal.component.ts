import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TerrainService } from '../../../core/services/terrain.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-ajouter-terrain-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './ajouter-terrain-modal.component.html',
  styleUrls: ['./ajouter-terrain-modal.component.css']
})
export class AjouterTerrainModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  terrainForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private terrainService: TerrainService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.terrainForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      adresse: ['', [Validators.required, Validators.minLength(5)]],
      heureOuverture: ['17:00', [Validators.required, Validators.pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)]],
      heureFermeture: ['01:00', [Validators.required, Validators.pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)]]
    });
  }

  closeModal(): void {
    this.close.emit();
    this.terrainForm.reset({
      heureOuverture: '17:00',
      heureFermeture: '01:00'
    });
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.terrainForm.invalid) {
      this.markFormGroupTouched(this.terrainForm);
      this.notificationService.showWarning(
        this.translationService.translate('terrain.fillAllFields')
      );
      return;
    }
  
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.notificationService.showError(this.translationService.translate('terrain.userNotAuthenticated'));
      return;
    }
  
    const formValue = this.terrainForm.value;
  
    let ouvertureMinutes = this.timeToMinutes(formValue.heureOuverture);
    let fermetureMinutes = this.timeToMinutes(formValue.heureFermeture);
  
    // ⏰ Passage à minuit (ex: 17:00 → 01:00)
    if (fermetureMinutes <= ouvertureMinutes) {
      fermetureMinutes += 24 * 60;
    }
  
    // ❌ Durée invalide
    if (fermetureMinutes - ouvertureMinutes <= 0) {
      this.notificationService.showError(
        this.translationService.translate('terrain.closingAfterOpening')
      );
      return;
    }
  
    this.isLoading = true;
  
    const terrain: TerrainServiceDTO = {
      nom: formValue.nom.trim(),
      adresse: formValue.adresse.trim(),
      proprietaireId: currentUser.id,
      heureOuverture: formValue.heureOuverture,
      heureFermeture: formValue.heureFermeture
    };
  
    this.terrainService.createTerrain(terrain).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.showSuccess(this.translationService.translate('terrain.createdSuccess'));
        this.saved.emit();
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        const msg = this.extractErrorMessage(error);
        this.notificationService.showError(msg);
        console.error('Erreur de création:', error);
      }
    });
  }
  

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return `Erreur client: ${error.error.message}`;
    } else if (error.status === 0) {
      return 'Erreur de connexion: Le serveur backend est inaccessible.';
    } else {
      let backendMessage = 'Une erreur inattendue est survenue.';
      if (error.error && typeof error.error === 'string') {
        backendMessage = error.error;
      } else if (error.error && error.error.message) {
        backendMessage = error.error.message;
      }

      switch (error.status) {
        case 400:
          return `Données invalides: ${backendMessage}`;
        case 401:
          return 'Non autorisé: Votre session a expiré.';
        case 409:
          return `Conflit: ${backendMessage}. Un terrain avec ce nom existe peut-être déjà.`;
        case 500:
          return `Erreur serveur: ${backendMessage}`;
        default:
          return `Erreur lors de la création du terrain (Code: ${error.status}). ${backendMessage}`;
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.terrainForm.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return this.translationService.translate('terrain.fieldRequired');
    }
    if (field?.hasError('minlength') && field.touched) {
      if (fieldName === 'nom') {
        return this.translationService.translate('terrain.nameMinLength');
      }
      return this.translationService.translate('terrain.addressMinLength');
    }
    if (field?.hasError('pattern') && field.touched) {
      return this.translationService.translate('terrain.fieldInvalidFormat');
    }
    return '';
  }
}
