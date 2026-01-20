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
      dateFin: ['', [Validators.required]],
      horaires: this.fb.array([])
    }, { validators: this.dateRangeValidator });
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

  dateRangeValidator(group: FormGroup) {
    const dateDebut = group.get('dateDebut')?.value;
    const dateFin = group.get('dateFin')?.value;
    if (!dateDebut || !dateFin) return null;
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    return fin >= debut ? null : { dateRangeInvalid: true };
  }

  private loadTerrains(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id) {
      this.notificationService.showError('Utilisateur non connecté');
      return;
    }

    if (!currentUser.terrainIds || currentUser.terrainIds.length === 0) {
      this.notificationService.showError('Aucun terrain associé à votre compte');
      return;
    }

    const userTerrainIds = currentUser.terrainIds.map(id => Number(id));

    this.terrainService.getAllTerrains().subscribe({
      next: (data) => {
        this.terrains = data.filter(t => userTerrainIds.includes(Number(t.id)));

        if (this.terrains.length === 0) {
          this.notificationService.showError('Aucun terrain trouvé pour votre compte');
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
        this.notificationService.showError('Erreur lors du chargement des terrains');
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
      dateDebut: this.getTodayDate(),
      dateFin: ''
    });
    this.horaires.clear();
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.abonnementForm.invalid) {
      this.markFormGroupTouched(this.abonnementForm);
      this.errorMessage = 'Veuillez remplir tous les champs requis correctement.';
      return;
    }

    if (this.horaires.length === 0) {
      this.notificationService.showWarning('Veuillez ajouter au moins un horaire');
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

    const abonnement: AbonnementCreateDTO = {
      terrainId: Number(formValue.terrainId),
      clientTelephone: Number(formValue.clientTelephone),
      dateDebut: formValue.dateDebut,
      dateFin: formValue.dateFin,
      horaires: horaires
    };

    this.abonnementService.createAbonnement(abonnement).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.showSuccess('Abonnement créé avec succès');
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
        case 404:
          return `Ressource non trouvée: ${backendMessage}`;
        case 500:
          return `Erreur serveur: ${backendMessage}`;
        default:
          return `Erreur lors de la création de l'abonnement (Code: ${error.status}). ${backendMessage}`;
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
      return 'Ce champ est requis';
    }
    if (field?.hasError('pattern') && field.touched) {
      return 'Format invalide';
    }
    if (field?.hasError('min') && field.touched) {
      return 'La valeur ne peut pas être négative';
    }
    return '';
  }

  getHoraireFieldError(index: number, fieldName: string): string {
    const horaireGroup = this.horaires.at(index) as FormGroup;
    const field = horaireGroup.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return 'Requis';
    }
    if (field?.hasError('min') && field.touched) {
      return 'Valeur minimale: 0';
    }
    return '';
  }

  getDateRangeError(): string {
    if (this.abonnementForm.hasError('dateRangeInvalid')) {
      return 'La date de fin doit être postérieure ou égale à la date de début';
    }
    return '';
  }
}
