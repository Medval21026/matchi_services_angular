import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ReservationService } from '../../../core/services/reservation.service';
import { TerrainService } from '../../../core/services/terrain.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ReservationPonctuelleDTO } from '../../../core/models/reservation.model';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-ajouter-reservation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './ajouter-reservation-modal.component.html',
  styleUrls: ['./ajouter-reservation-modal.component.css']
})
export class AjouterReservationModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  private _reservation?: ReservationPonctuelleDTO;
  @Input() 
  set reservation(value: ReservationPonctuelleDTO | undefined) {
    this._reservation = value;
    if (value) {
      this.isEditMode = true;
      if (this.reservationForm) {
        this.reservationForm.patchValue({
          terrainId: value.terrainId,
          date: value.date,
          heureDebut: value.heureDebut,
          clientTelephone: value.clientTelephone,
          prix: value.prix
        });
      }
    } else {
      this.isEditMode = false;
      if (this.reservationForm) {
        this.reservationForm.reset();
      }
    }
  }
  get reservation(): ReservationPonctuelleDTO | undefined {
    return this._reservation;
  }
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  reservationForm!: FormGroup;
  terrains: TerrainServiceDTO[] = [];
  isLoading = false;
  errorMessage = '';
  isEditMode = false;
  showTerrainInput = false; // Pour cacher l'input du terrain

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private terrainService: TerrainService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTerrains();
    // Si reservation est déjà défini, charger les données
    if (this._reservation) {
      this.isEditMode = true;
      this.reservationForm.patchValue({
        terrainId: this._reservation.terrainId,
        date: this._reservation.date,
        heureDebut: this._reservation.heureDebut,
        clientTelephone: this._reservation.clientTelephone,
        prix: this._reservation.prix
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recharger les terrains quand le modal s'ouvre
    if (changes['isOpen'] && changes['isOpen'].currentValue === true && !changes['isOpen'].firstChange) {
      this.loadTerrains();
    }
  }

  private initForm(): void {
    this.reservationForm = this.fb.group({
      terrainId: [''], // Pas obligatoire car peut être pré-rempli automatiquement
      date: [this.getTodayDate(), Validators.required],
      heureDebut: ['', Validators.required],
      clientTelephone: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      prix: ['', [Validators.required, Validators.min(0)]]
    });
  }

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadTerrains(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id) {
      this.errorMessage = this.translationService.translate('reservation.userNotConnected');
      return;
    }

    // Charger tous les terrains et filtrer par proprietaireId (plus fiable que terrainIds)
    this.terrainService.getAllTerrains().subscribe({
      next: (data) => {
        // Filtrer par proprietaireId pour obtenir tous les terrains du propriétaire
        // Cela inclut les nouveaux terrains même si terrainIds n'est pas encore mis à jour
        this.terrains = data.filter(t => t.proprietaireId === currentUser.id);
        
        // Si aucun terrain trouvé par proprietaireId, essayer avec terrainIds comme fallback
        if (this.terrains.length === 0 && currentUser.terrainIds && currentUser.terrainIds.length > 0) {
          const terrainIds = currentUser.terrainIds.map(id => Number(id));
          this.terrains = data.filter(t => terrainIds.includes(Number(t.id)));
        }
        
        if (this.terrains.length === 0) {
          this.errorMessage = this.translationService.translate('reservation.noTerrainFound');
          return;
        }
        
        // Réinitialiser le message d'erreur si des terrains sont trouvés
        this.errorMessage = '';
        
        // Si un seul terrain, l'utiliser automatiquement et cacher l'input
        if (this.terrains.length === 1) {
          this.reservationForm.patchValue({ terrainId: this.terrains[0].id });
          this.showTerrainInput = false; // Cacher l'input
        } else if (this.terrains.length > 1) {
          this.showTerrainInput = true; // Afficher l'input si plusieurs terrains
        }
      },
      error: (error) => {
        console.error('Erreur de chargement des terrains:', error);
        this.errorMessage = this.translationService.translate('reservation.terrainLoadError');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
    this.reservationForm.reset({
      date: this.getTodayDate()
    });
    this.errorMessage = '';
    this.isEditMode = false;
    this._reservation = undefined;
  }

  onSubmit(): void {
    if (this.reservationForm.invalid) {
      this.markFormGroupTouched(this.reservationForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.reservationForm.value;
    const reservation: ReservationPonctuelleDTO = {
      terrainId: Number(formValue.terrainId),
      date: formValue.date,
      heureDebut: formValue.heureDebut,
      clientTelephone: Number(formValue.clientTelephone),
      prix: Number(formValue.prix)
    };

        if (this.isEditMode && this.reservation?.id) {
          reservation.id = this.reservation.id;
          this.reservationService.updateReservation(this.reservation.id, reservation).subscribe({
            next: () => {
              this.isLoading = false;
              this.notificationService.showSuccess(this.translationService.translate('reservation.modifiedSuccess'));
              this.saved.emit(); // Déclenche le rechargement de la liste
              this.closeModal(); // Ferme le modal
            },
            error: (error: HttpErrorResponse) => {
              this.isLoading = false;
              const errorMsg = this.extractErrorMessage(error, 'modification');
              this.errorMessage = errorMsg;
              this.notificationService.showError(errorMsg);
              console.error('Erreur de modification:', error);
            }
          });
        } else {
          this.reservationService.createReservation(reservation).subscribe({
            next: () => {
              this.isLoading = false;
              this.notificationService.showSuccess(this.translationService.translate('reservation.createdSuccess'));
              this.saved.emit(); // Déclenche le rechargement de la liste
              this.closeModal(); // Ferme le modal
            },
            error: (error: HttpErrorResponse) => {
              this.isLoading = false;
              const errorMsg = this.extractErrorMessage(error, 'création');
              this.errorMessage = errorMsg;
              this.notificationService.showError(errorMsg);
              console.error('Erreur de création:', error);
            }
          });
        }
  }

  private extractErrorMessage(error: HttpErrorResponse, operation: string): string {
    // Si le backend retourne un message d'erreur spécifique
    if (error.error) {
      // Format standard : { message: "..." }
      if (error.error.message) {
        return error.error.message;
      }
      // Format alternatif : { error: "..." }
      if (error.error.error) {
        return error.error.error;
      }
      // Format Spring Boot : { message: "...", ... }
      if (typeof error.error === 'string') {
        return error.error;
      }
    }

    // Messages par code d'erreur HTTP
    switch (error.status) {
      case 0:
        return 'Erreur de connexion. Vérifiez que le serveur est démarré et accessible.';
      case 400:
        return 'Données invalides. Vérifiez que tous les champs sont correctement remplis.';
      case 401:
        return 'Session expirée. Veuillez vous reconnecter.';
      case 403:
        return 'Vous n\'avez pas les permissions pour cette action.';
      case 404:
        return operation === 'modification' 
          ? 'La réservation à modifier n\'existe pas.' 
          : 'Ressource non trouvée.';
      case 409:
        return 'Conflit : Cette réservation entre en conflit avec une autre réservation ou un horaire indisponible.';
      case 422:
        return 'Données non valides. Vérifiez les informations saisies.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      default:
        return `Erreur lors de la ${operation} de la réservation (Code: ${error.status}).`;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.reservationForm.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return this.translationService.translate('reservation.fieldRequired');
    }
    if (field?.hasError('pattern') && field.touched) {
      return this.translationService.translate('reservation.fieldInvalidFormat');
    }
    if (field?.hasError('min') && field.touched) {
      return this.translationService.translate('reservation.minValue');
    }
    return '';
  }
}
