import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AbonnementService } from '../../../core/services/abonnement.service';
import { TerrainService } from '../../../core/services/terrain.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AbonnementCreateDTO, AbonnementHoraireDTO } from '../../../core/models/abonnement.model';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { JourSemaine } from '../../../core/models/common.models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-ajouter-abonnement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './ajouter-abonnement-modal.component.html',
  styleUrls: ['./ajouter-abonnement-modal.component.css']
})
export class AjouterAbonnementModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  abonnementForm!: FormGroup;
  terrains: TerrainServiceDTO[] = [];
  isLoading = false;
  errorMessage = '';
  showTerrainInput = false;
  joursOptions = Object.values(JourSemaine);

  // Formater les jours de la semaine selon la langue (français ou arabe)
  formatJour(jour: string): string {
    if (!jour) return jour;
    // Utiliser le service de traduction pour traduire les jours
    const translationKey = `days.${jour}`;
    const translated = this.translationService.translate(translationKey);
    // Si la traduction existe, l'utiliser, sinon formater en français
    if (translated !== translationKey) {
      return translated;
    }
    // Fallback: convertir LUNDI -> Lundi, MARDI -> Mardi, etc.
    return jour.charAt(0) + jour.slice(1).toLowerCase();
  }

  constructor(
    private fb: FormBuilder,
    private abonnementService: AbonnementService,
    private terrainService: TerrainService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTerrains();
  }

  private initForm(): void {
    this.abonnementForm = this.fb.group({
      terrainId: ['', Validators.required],
      clientTelephone: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      dateDebut: [this.getTodayDate(), [Validators.required]],
      dateFin: [''], // Optionnel - calculé automatiquement par le backend (dateDebut + 30 jours)
      horaires: this.fb.array([])
    });
  }

  get horaires(): FormArray {
    return this.abonnementForm.get('horaires') as FormArray;
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Validateur supprimé car dateFin est maintenant optionnel et calculé automatiquement par le backend

  private loadTerrains(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id) {
      this.notificationService.showError(this.translationService.translate('abonnement.userNotConnected'));
      return;
    }

    if (!currentUser.terrainIds || currentUser.terrainIds.length === 0) {
      this.notificationService.showError(this.translationService.translate('abonnement.noTerrainAssociated'));
      return;
    }

    const userTerrainIds = currentUser.terrainIds.map(id => Number(id));

    this.terrainService.getAllTerrains().subscribe({
      next: (data) => {
        this.terrains = data.filter(t => userTerrainIds.includes(Number(t.id)));

        if (this.terrains.length === 0) {
          this.notificationService.showError(this.translationService.translate('abonnement.noTerrainFound'));
          return;
        }

        if (this.terrains.length === 1) {
          this.abonnementForm.patchValue({ terrainId: this.terrains[0].id });
          this.showTerrainInput = false;
        } else {
          this.showTerrainInput = true;
        }
      },
      error: (error) => {
        console.error('Erreur de chargement des terrains:', error);
        this.notificationService.showError(this.translationService.translate('abonnement.terrainLoadError'));
      }
    });
  }

  addHoraire(): void {
    const horaireGroup = this.fb.group({
      jourSemaine: ['', Validators.required],
      heureDebut: ['', Validators.required],
      prixHeure: ['', [Validators.required, Validators.min(0)]]
    });
    this.horaires.push(horaireGroup);
  }

  removeHoraire(index: number): void {
    this.horaires.removeAt(index);
  }

  closeModal(): void {
    this.close.emit();
    this.abonnementForm.reset();
    this.abonnementForm.patchValue({
      dateDebut: this.getTodayDate()
    });
    this.horaires.clear();
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.abonnementForm.invalid) {
      this.markFormGroupTouched(this.abonnementForm);
      this.errorMessage = this.translationService.translate('abonnement.fillAllFields');
      return;
    }

    if (this.horaires.length === 0) {
      this.notificationService.showWarning(this.translationService.translate('abonnement.addAtLeastOneSchedule'));
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.abonnementForm.value;
    const horaires: AbonnementHoraireDTO[] = formValue.horaires.map((h: any) => ({
      jourSemaine: h.jourSemaine as JourSemaine,
      heureDebut: h.heureDebut,
      prixHeure: Number(h.prixHeure)
    }));

    // Construire l'objet abonnement sans dateFin si elle est vide
    // Le backend calcule automatiquement dateFin = dateDebut + 30 jours si dateFin n'est pas fournie
    const abonnement: AbonnementCreateDTO = {
      terrainId: Number(formValue.terrainId),
      clientTelephone: Number(formValue.clientTelephone),
      dateDebut: formValue.dateDebut,
      ...(formValue.dateFin ? { dateFin: formValue.dateFin } : {}),
      horaires: horaires
    };

    this.abonnementService.createAbonnement(abonnement).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.showSuccess(this.translationService.translate('abonnement.createdSuccess'));
        this.saved.emit();
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(error);
        this.notificationService.showError(this.errorMessage);
        console.error('Erreur de création:', error);
      }
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return `${this.translationService.translate('abonnement.clientError')}: ${error.error.message}`;
    } else if (error.status === 0) {
      return this.translationService.translate('abonnement.connectionError');
    } else {
      let backendMessage = this.translationService.translate('abonnement.unexpectedError');
      if (error.error && typeof error.error === 'string') {
        backendMessage = error.error;
      } else if (error.error && error.error.message) {
        backendMessage = error.error.message;
      } else if (error.error && error.error.error) {
        backendMessage = error.error.error;
      }

      // Détecter le message d'erreur de conflit lors de la création d'horaire
      // Format: "Erreur lors de la création de l'horaire pour le SAMEDI (semaine 0) : Conflit avec une réservation ponctuelle : Le créneau 19:00-20:00 est déjà réservé pour ce terrain le 2026-01-24. Réservation existante : 19:00-20:00"
      const scheduleConflictMatch = backendMessage.match(/Erreur lors de la création de l'horaire pour le (\w+) \(semaine (\d+)\)\s*:\s*Conflit avec une réservation ponctuelle\s*:\s*Le créneau ([\d:]+-[\d:]+) est déjà réservé pour ce terrain le ([\d-]+)\.\s*Réservation existante\s*:\s*([\d:]+-[\d:]+)/i);
      
      if (scheduleConflictMatch) {
        const jour = scheduleConflictMatch[1];
        const semaine = scheduleConflictMatch[2];
        const creneau = scheduleConflictMatch[3] || scheduleConflictMatch[5];
        const date = scheduleConflictMatch[4];
        
        // Traduire le jour si possible
        const jourTraduit = this.translationService.translate(`days.${jour}`) !== `days.${jour}` 
          ? this.translationService.translate(`days.${jour}`)
          : jour;
        
        // Utiliser la traduction avec remplacement des placeholders
        let translated = this.translationService.translate('abonnement.scheduleCreationConflict');
        translated = translated.replace(/{jour}/g, jourTraduit);
        translated = translated.replace(/{semaine}/g, semaine);
        translated = translated.replace(/{creneau}/g, creneau);
        translated = translated.replace(/{date}/g, date);
        return translated;
      }

      switch (error.status) {
        case 400:
          return `${this.translationService.translate('abonnement.invalidData')}: ${backendMessage}`;
        case 401:
          return this.translationService.translate('abonnement.unauthorized');
        case 404:
          return `${this.translationService.translate('abonnement.resourceNotFound')}: ${backendMessage}`;
        case 500:
          return `${this.translationService.translate('abonnement.serverError')}: ${backendMessage}`;
        default:
          return `${this.translationService.translate('abonnement.creationError')} (${this.translationService.translate('common.code')}: ${error.status}). ${backendMessage}`;
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormArray) {
        control.controls.forEach(group => {
          if (group instanceof FormGroup) {
            this.markFormGroupTouched(group);
          }
        });
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.abonnementForm.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return this.translationService.translate('abonnement.fieldRequired');
    }
    if (field?.hasError('pattern') && field.touched) {
      return this.translationService.translate('abonnement.fieldInvalidFormat');
    }
    if (field?.hasError('min') && field.touched) {
      return this.translationService.translate('abonnement.valueCannotBeNegative');
    }
    return '';
  }

  getHoraireFieldError(index: number, fieldName: string): string {
    const horaireGroup = this.horaires.at(index) as FormGroup;
    const field = horaireGroup.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return this.translationService.translate('abonnement.fieldRequiredShort');
    }
    if (field?.hasError('min') && field.touched) {
      return this.translationService.translate('abonnement.minValue');
    }
    return '';
  }

  // Méthode getDateRangeError supprimée car dateFin n'est plus requis
}
