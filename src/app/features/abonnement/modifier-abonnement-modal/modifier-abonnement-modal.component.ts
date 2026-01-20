import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AbonnementService } from '../../../core/services/abonnement.service';
import { AbonnementHoraireService } from '../../../core/services/abonnement-horaire.service';
import { ClientAbonneService } from '../../../core/services/client-abonne.service';
import { IndisponibleService } from '../../../core/services/indisponible.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AbonnementDTO, AbonnementUpdateDTO, AbonnementHoraireDTO } from '../../../core/models/abonnement.model';
import { JourSemaine, StatutAbonnement } from '../../../core/models/common.models';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-modifier-abonnement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './modifier-abonnement-modal.component.html',
  styleUrls: ['./modifier-abonnement-modal.component.css']
})
export class ModifierAbonnementModalComponent implements OnInit {
  @Input() isOpen = false;
  private _abonnement?: AbonnementDTO;
  @Input()
  set abonnement(value: AbonnementDTO | undefined) {
    this._abonnement = value;
    if (value && this.abonnementForm) {
      this.loadAbonnementData(value);
    }
  }
  get abonnement(): AbonnementDTO | undefined {
    return this._abonnement;
  }
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  abonnementForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  joursOptions = Object.values(JourSemaine);
  statutsOptions = Object.values(StatutAbonnement);

  // Formater le statut selon la langue (français ou arabe)
  formatStatus(status: string): string {
    if (!status) return status;
    const translationKey = `status.${status}`;
    const translated = this.translationService.translate(translationKey);
    // Si la traduction existe, l'utiliser, sinon retourner le statut original
    return translated !== translationKey ? translated : status;
  }

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
  
  // Stocker les données originales pour comparer
  private originalAbonnement?: AbonnementDTO;
  private originalHoraires: Map<number, AbonnementHoraireDTO> = new Map();

  constructor(
    private fb: FormBuilder,
    private abonnementService: AbonnementService,
    private horaireService: AbonnementHoraireService,
    private clientService: ClientAbonneService,
    private indisponibleService: IndisponibleService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this._abonnement) {
      this.loadAbonnementData(this._abonnement);
    }
  }

  private initForm(): void {
    this.abonnementForm = this.fb.group({
      clientTelephone: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      status: ['', Validators.required],
      horaires: this.fb.array([])
    }, { validators: this.dateRangeValidator });
  }

  private dateRangeValidator = (form: FormGroup): { [key: string]: any } | null => {
    const dateDebut = form.get('dateDebut')?.value;
    const dateFin = form.get('dateFin')?.value;
    
    if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
      return { dateRangeInvalid: true };
    }
    return null;
  };

  get horaires(): FormArray {
    return this.abonnementForm.get('horaires') as FormArray;
  }

  private loadAbonnementData(abonnement: AbonnementDTO): void {
    // Sauvegarder les données originales
    this.originalAbonnement = { ...abonnement };
    this.originalHoraires.clear();

    // Charger le numéro de téléphone du client
    let clientTelephone: string | number = 'Chargement...';
    
    if (abonnement.clientTelephone) {
      clientTelephone = abonnement.clientTelephone;
      this.abonnementForm.patchValue({
        clientTelephone: clientTelephone,
        dateDebut: abonnement.dateDebut,
        dateFin: abonnement.dateFin,
        status: abonnement.status
      });
    } else if (abonnement.clientId) {
      // Si le téléphone n'est pas disponible, le récupérer via le clientId
      this.clientService.getClientById(abonnement.clientId).subscribe({
        next: (client) => {
          clientTelephone = client.telephone || 'Non disponible';
          this.abonnementForm.patchValue({
            clientTelephone: clientTelephone,
            dateDebut: abonnement.dateDebut,
            dateFin: abonnement.dateFin,
            status: abonnement.status
          });
        },
        error: () => {
          clientTelephone = 'Non disponible';
          this.abonnementForm.patchValue({
            clientTelephone: clientTelephone,
            dateDebut: abonnement.dateDebut,
            dateFin: abonnement.dateFin,
            status: abonnement.status
          });
        }
      });
    } else {
      clientTelephone = 'Non disponible';
      this.abonnementForm.patchValue({
        clientTelephone: clientTelephone,
        dateDebut: abonnement.dateDebut,
        dateFin: abonnement.dateFin,
        status: abonnement.status
      });
    }

    // Charger les horaires - Ne garder qu'un seul horaire unique par combinaison (jourSemaine, heureDebut, prixHeure)
    this.horaires.clear();
    if (abonnement.horaires && abonnement.horaires.length > 0) {
      // Créer un Map pour stocker les horaires uniques (clé = jourSemaine + heureDebut + prixHeure)
      const horairesUniques = new Map<string, AbonnementHoraireDTO>();
      
      abonnement.horaires.forEach(horaire => {
        const cle = `${horaire.jourSemaine}_${horaire.heureDebut}_${horaire.prixHeure}`;
        if (!horairesUniques.has(cle)) {
          horairesUniques.set(cle, horaire);
        }
      });

      // Ajouter seulement les horaires uniques au formulaire et sauvegarder les originaux
      horairesUniques.forEach(horaire => {
        if (horaire.id) {
          this.originalHoraires.set(horaire.id, { ...horaire });
        }
        
        const horaireGroup = this.fb.group({
          id: [horaire.id || null], // Garder l'ID pour la comparaison
          jourSemaine: [horaire.jourSemaine, Validators.required],
          heureDebut: [horaire.heureDebut, Validators.required],
          prixHeure: [horaire.prixHeure, [Validators.required, Validators.min(0)]]
        });
        this.horaires.push(horaireGroup);
      });
    }
  }

  addHoraire(): void {
    const horaireGroup = this.fb.group({
      id: [null], // Nouvel horaire, pas d'ID
      jourSemaine: ['', Validators.required],
      heureDebut: ['', Validators.required],
      prixHeure: ['', [Validators.required, Validators.min(0)]]
    });
    this.horaires.push(horaireGroup);
  }

  removeHoraire(index: number): void {
    const horaireGroup = this.horaires.at(index) as FormGroup;
    const horaireValue = horaireGroup.value;
    
    // Construire le message de confirmation
    let message = this.translationService.translate('abonnement.deleteScheduleConfirm');
    if (horaireValue.jourSemaine && horaireValue.heureDebut) {
      const jourFormate = this.formatJour(horaireValue.jourSemaine);
      message = `${this.translationService.translate('abonnement.deleteScheduleConfirmWithDetails')} ${jourFormate} ${this.translationService.translate('abonnement.at')} ${horaireValue.heureDebut} ?`;
    }
    
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        message: message
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.horaires.removeAt(index);
        this.notificationService.showInfo('Horaire supprimé du formulaire');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.abonnementForm.invalid || !this._abonnement || !this.originalAbonnement) {
      this.markFormGroupTouched(this.abonnementForm);
      this.errorMessage = 'Veuillez remplir tous les champs requis correctement.';
      return;
    }

    if (this.horaires.length === 0) {
      this.notificationService.showWarning(this.translationService.translate('abonnement.addAtLeastOneSchedule'));
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.abonnementForm.value;
    
    // Détecter les changements dans l'abonnement (clientTelephone, dateDebut, dateFin, status)
    const originalClientTel = this.originalAbonnement.clientTelephone?.toString() || '';
    const newClientTel = formValue.clientTelephone?.toString() || '';
    
    const abonnementChanged = 
      newClientTel !== originalClientTel ||
      formValue.dateDebut !== this.originalAbonnement.dateDebut ||
      formValue.dateFin !== this.originalAbonnement.dateFin ||
      formValue.status !== this.originalAbonnement.status;

    // Détecter les horaires modifiés
    const horairesToUpdate: Array<{ id: number; data: Partial<AbonnementHoraireDTO> }> = [];
    const horairesToCreate: AbonnementHoraireDTO[] = [];
    const horairesToDelete: number[] = [];

    // Identifier les horaires modifiés, créés et supprimés
    formValue.horaires.forEach((h: any, index: number) => {
      if (h.id) {
        // Horaire existant - vérifier s'il a été modifié
        const original = this.originalHoraires.get(h.id);
        if (original) {
          const hasChanged = 
            h.jourSemaine !== original.jourSemaine ||
            h.heureDebut !== original.heureDebut ||
            Number(h.prixHeure) !== original.prixHeure;
          
          if (hasChanged) {
            horairesToUpdate.push({
              id: h.id,
              data: {
                jourSemaine: h.jourSemaine as JourSemaine,
                heureDebut: h.heureDebut,
                prixHeure: Number(h.prixHeure)
              }
            });
          }
        }
      } else if (this._abonnement) {
        // Nouvel horaire à créer
        horairesToCreate.push({
          abonnementId: this._abonnement.id,
          jourSemaine: h.jourSemaine as JourSemaine,
          heureDebut: h.heureDebut,
          prixHeure: Number(h.prixHeure)
        });
      }
    });

    // Identifier les horaires supprimés (présents dans original mais pas dans le formulaire)
    this.originalHoraires.forEach((original, id) => {
      const stillExists = formValue.horaires.some((h: any) => h.id === id);
      if (!stillExists) {
        horairesToDelete.push(id);
      }
    });

    // Préparer les appels API
    const updateCalls: Array<any> = [];

    // 1. Mettre à jour l'abonnement si nécessaire (sans horaires)
    if (abonnementChanged) {
      const updateData: AbonnementUpdateDTO = {
        clientTelephone: formValue.clientTelephone ? Number(formValue.clientTelephone) : undefined,
        dateDebut: formValue.dateDebut,
        dateFin: formValue.dateFin,
        status: formValue.status as StatutAbonnement
        // Ne pas inclure horaires ici
      };
      updateCalls.push(
        this.abonnementService.updateAbonnement(this._abonnement.id, updateData).pipe(
          catchError((error) => {
            console.error('Erreur mise à jour abonnement:', error);
            return of(null);
          })
        )
      );
    }

    // 2. Mettre à jour les horaires modifiés
    horairesToUpdate.forEach(({ id, data }) => {
      updateCalls.push(
        this.horaireService.updateHoraire(id, data).pipe(
          catchError((error) => {
            console.error(`Erreur mise à jour horaire ${id}:`, error);
            return of(null);
          })
        )
      );
    });

    // 3. Créer les nouveaux horaires
    horairesToCreate.forEach((horaire) => {
      updateCalls.push(
        this.horaireService.createHoraire(horaire).pipe(
          catchError((error) => {
            console.error('Erreur création horaire:', error);
            return of(null);
          })
        )
      );
    });

    // 4. Supprimer les horaires
    horairesToDelete.forEach((id) => {
      updateCalls.push(
        this.horaireService.deleteHoraire(id).pipe(
          catchError((error) => {
            console.error(`Erreur suppression horaire ${id}:`, error);
            return of(null);
          })
        )
      );
    });

    // Exécuter tous les appels en parallèle
    if (updateCalls.length === 0) {
      this.isLoading = false;
      this.notificationService.showInfo('Aucune modification détectée');
      return;
    }

    forkJoin(updateCalls).subscribe({
      next: (results) => {
        this.isLoading = false;
        const hasErrors = results.some(r => r === null);
        if (hasErrors) {
          this.notificationService.showWarning('Certaines modifications ont échoué. Veuillez vérifier.');
        } else {
          this.notificationService.showSuccess('Abonnement modifié avec succès');
          
          // Synchroniser le terrain pour mettre à jour les indisponibilités dans le planning
          // Attendre un peu pour que le backend traite les modifications avant de synchroniser
          if (this._abonnement?.terrainId) {
            setTimeout(() => {
              this.indisponibleService.synchroniserTerrain(this._abonnement!.terrainId).subscribe({
                next: () => {
                  console.log('Terrain synchronisé avec succès');
                  this.notificationService.showInfo('Planning mis à jour. Rechargez la page planning pour voir les changements.');
                },
                error: (error) => {
                  console.error('Erreur synchronisation terrain:', error);
                  // Ne pas bloquer l'utilisateur si la synchronisation échoue
                }
              });
            }, 500); // Attendre 500ms pour que le backend traite les modifications
          }
        }
        this.saved.emit();
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(error);
        this.notificationService.showError(this.errorMessage);
        console.error('Erreur de modification:', error);
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
          return `Erreur lors de la modification de l'abonnement (Code: ${error.status}). ${backendMessage}`;
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
      if (fieldName === 'clientTelephone') {
        return 'Le numéro de téléphone doit contenir uniquement des chiffres';
      }
      return 'Format invalide';
    }
    if (fieldName === 'dateFin' && field?.touched) {
      const dateDebut = this.abonnementForm.get('dateDebut')?.value;
      const dateFin = field.value;
      if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
        return 'La date de fin doit être après la date de début';
      }
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

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
