import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef } from '@angular/core';
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
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
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
      dateFin: [''], // Optionnel - calculé automatiquement par le backend (dateDebut + 30 jours) si non fourni
      status: ['', Validators.required],
      horaires: this.fb.array([])
    });
  }

  // Validateur supprimé car dateFin est maintenant optionnel et calculé automatiquement par le backend

  get horaires(): FormArray {
    return this.abonnementForm.get('horaires') as FormArray;
  }

  private loadAbonnementData(abonnement: AbonnementDTO): void {
    // Sauvegarder les données originales
    this.originalAbonnement = { ...abonnement };
    this.originalHoraires.clear();

    // Charger le numéro de téléphone du client
    let clientTelephone: string | number = this.translationService.translate('abonnement.loading');
    
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
          clientTelephone = client.telephone || this.translationService.translate('abonnement.notAvailable');
          this.abonnementForm.patchValue({
            clientTelephone: clientTelephone,
            dateDebut: abonnement.dateDebut,
            dateFin: abonnement.dateFin,
            status: abonnement.status
          });
        },
        error: () => {
          clientTelephone = this.translationService.translate('abonnement.notAvailable');
          this.abonnementForm.patchValue({
            clientTelephone: clientTelephone,
            dateDebut: abonnement.dateDebut,
            dateFin: abonnement.dateFin,
            status: abonnement.status
          });
        }
      });
    } else {
      clientTelephone = this.translationService.translate('abonnement.notAvailable');
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
      id: [null],
      jourSemaine: ['', Validators.required],
      heureDebut: ['', Validators.required],
      prixHeure: ['', [Validators.required, Validators.min(0)]]
    });
    this.horaires.push(horaireGroup);
  }
  

  removeHoraire(index: number): void {
    const horaireGroup = this.horaires.at(index) as FormGroup;
    const horaireValue = horaireGroup.value;
  
    let message = this.translationService.translate('abonnement.deleteScheduleConfirm');
    if (horaireValue.jourSemaine && horaireValue.heureDebut) {
      const jourFormate = this.formatJour(horaireValue.jourSemaine);
      message = `${this.translationService.translate('abonnement.deleteScheduleConfirmWithDetails')} ${jourFormate} ${this.translationService.translate('abonnement.at')} ${horaireValue.heureDebut} ?`;
    }
  
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { message }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // 🔹 Ne pas toucher originalHoraires ici
        this.horaires.removeAt(index);  // juste supprimer du FormArray
        this.cdr.detectChanges();
        this.notificationService.showInfo(this.translationService.translate('abonnement.scheduleRemovedFromForm'));
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
    
    // Détecter les changements dans l'abonnement (clientTelephone, dateDebut, dateFin, status)
    const originalClientTel = this.originalAbonnement.clientTelephone?.toString() || '';
    const newClientTel = formValue.clientTelephone?.toString() || '';
    
    const abonnementChanged = 
      newClientTel !== originalClientTel ||
      formValue.dateDebut !== this.originalAbonnement.dateDebut ||
      (formValue.dateFin && formValue.dateFin !== this.originalAbonnement.dateFin) ||
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
    // Identifier les horaires supprimés
    this.originalHoraires.forEach((_, id) => {
      const stillExists = formValue.horaires.some((h: any) => h.id === id);
      if (!stillExists) {
        horairesToDelete.push(id); // là, ça marchera car originalHoraires est intact
      }
    });

    // Vérifier les doublons dans les horaires (même jourSemaine + heureDebut + prixHeure)
    const horairesMap = new Map<string, number[]>();
    formValue.horaires.forEach((h: any, index: number) => {
      const cle = `${h.jourSemaine}_${h.heureDebut}_${h.prixHeure}`;
      if (!horairesMap.has(cle)) {
        horairesMap.set(cle, []);
      }
      horairesMap.get(cle)!.push(index);
    });

    // Détecter les doublons (exclure le cas où c'est le même horaire modifié)
    const doublons: Array<{ index1: number; index2: number; cle: string }> = [];
    horairesMap.forEach((indices, cle) => {
      if (indices.length > 1) {
        // Vérifier si ce sont des horaires différents (pas le même ID)
        for (let i = 0; i < indices.length; i++) {
          for (let j = i + 1; j < indices.length; j++) {
            const h1 = formValue.horaires[indices[i]];
            const h2 = formValue.horaires[indices[j]];
            // Si les IDs sont différents (ou si l'un n'a pas d'ID), c'est un doublon
            if (!h1.id || !h2.id || h1.id !== h2.id) {
              doublons.push({ index1: indices[i], index2: indices[j], cle });
            }
          }
        }
      }
    });

    if (doublons.length > 0) {
      this.isLoading = false;
      const jourFormate = this.formatJour(formValue.horaires[doublons[0].index1].jourSemaine);
      const message = this.translationService.translate('abonnement.duplicateScheduleError');
      this.notificationService.showError(message);
      this.errorMessage = message;
      return;
    }

    // Préparer les appels API
    const updateCalls: Array<any> = [];

    // 1. Mettre à jour l'abonnement avec les nouveaux horaires inclus dans le PUT
    // Les nouveaux horaires doivent être envoyés dans le PUT /api/abonnement/{id}
    const hasNewHoraires = horairesToCreate.length > 0;
    const needsUpdate = abonnementChanged || hasNewHoraires;

    if (needsUpdate) {
      // Préparer les nouveaux horaires pour le PUT (format: {jourSemaine, heureDebut, prixHeure})
      const nouveauxHoraires = horairesToCreate.map(h => ({
        jourSemaine: h.jourSemaine,
        heureDebut: h.heureDebut,
        prixHeure: h.prixHeure
      }));

      const updateData: AbonnementUpdateDTO = {
        clientTelephone: formValue.clientTelephone ? Number(formValue.clientTelephone) : undefined,
        dateDebut: formValue.dateDebut,
        // dateFin n'est envoyé que s'il est fourni - sinon le backend calcule automatiquement dateDebut + 30 jours
        ...(formValue.dateFin ? { dateFin: formValue.dateFin } : {}),
        status: formValue.status as StatutAbonnement,
        // Inclure les nouveaux horaires dans le PUT
        horaires: hasNewHoraires ? nouveauxHoraires : undefined
      };
      updateCalls.push(
        this.abonnementService.updateAbonnement(this._abonnement.id, updateData).pipe(
          switchMap(() => of(true)),
          catchError(error => { 
            console.error('Erreur mise à jour abonnement:', error); 
            return of(false); 
          })
        )
      );
      
    }

    // 2. Mettre à jour les horaires modifiés (utiliser les endpoints séparés)
    horairesToUpdate.forEach(({ id, data }) => {
      updateCalls.push(
        this.horaireService.updateHoraire(id, data).pipe(
          switchMap(() => of(true)),
          catchError((error) => {
            console.error(`Erreur mise à jour horaire ${id}:`, error);
            // Vérifier si c'est une erreur de doublon/conflit
            if (error.status === 409 || error.status === 422 || error.status === 400) {
              const errorMessage = error.error?.message || error.error?.error || '';
              if (errorMessage.toLowerCase().includes('existe') || 
                  errorMessage.toLowerCase().includes('doublon') ||
                  errorMessage.toLowerCase().includes('déjà') ||
                  errorMessage.toLowerCase().includes('duplicate')) {
                this.errorMessage = errorMessage || this.translationService.translate('abonnement.scheduleAlreadyExists');
              }
            }
            return of(false); // Retourner false pour indiquer une erreur
          })
        )
      );
    });

    // 4. Supprimer les horaires
    horairesToDelete.forEach((id) => {
      updateCalls.push(
        this.horaireService.deleteHoraire(id).pipe(
          switchMap(() => of(true)),
          catchError(err => { 
            console.error(`Erreur delete horaire ${id}`, err); 
            return of(false); 
          })
        )
      );
    });
    

    // Exécuter tous les appels en parallèle
    if (updateCalls.length === 0) {
      this.isLoading = false;
      this.notificationService.showInfo(this.translationService.translate('abonnement.noModificationDetected'));
      return;
    }

    forkJoin(updateCalls).subscribe({
      next: (results) => {
        this.isLoading = false;
        const hasErrors = results.some(r => r === false || r === null); // Détecter les erreurs (false ou null)
        if (hasErrors) {
          // Si on a un message d'erreur spécifique, l'utiliser, sinon message générique
          const errorMsg = this.errorMessage || this.translationService.translate('abonnement.someModificationsFailed');
          this.notificationService.showError(errorMsg);
        } else {
          this.notificationService.showSuccess(this.translationService.translate('abonnement.modifiedSuccess'));
    
          // Synchroniser le terrain
          if (this._abonnement?.terrainId) {
            setTimeout(() => {
              this.indisponibleService.synchroniserTerrain(this._abonnement!.terrainId).subscribe({
                next: () => {
                  console.log('Terrain synchronisé avec succès');
                  this.notificationService.showInfo(this.translationService.translate('abonnement.planningUpdated'));
                },
                error: (error) => {
                  console.error('Erreur synchronisation terrain:', error);
                }
              });
            }, 500);
          }
          this.saved.emit();
          this.closeModal();
        }
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
          return `${this.translationService.translate('abonnement.modificationError')} (${this.translationService.translate('common.code')}: ${error.status}). ${backendMessage}`;
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
      if (fieldName === 'clientTelephone') {
        return this.translationService.translate('abonnement.phonePatternError');
      }
      return this.translationService.translate('abonnement.fieldInvalidFormat');
    }
    // Validation dateFin supprimée car elle est maintenant optionnelle et calculée automatiquement
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

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  trackByHoraire(index: number, control: any): any {
    return control.get('id')?.value ?? index;
  }
  
}
