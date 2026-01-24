import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { AbonnementService } from '../../../core/services/abonnement.service';
import { ClientAbonneService } from '../../../core/services/client-abonne.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AbonnementDTO } from '../../../core/models/abonnement.model';
import { ClientAbonneDTO } from '../../../core/models/client.model';
import { AjouterAbonnementModalComponent } from '../ajouter-abonnement-modal/ajouter-abonnement-modal.component';
import { ModifierAbonnementModalComponent } from '../modifier-abonnement-modal/modifier-abonnement-modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-abonnement-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AjouterAbonnementModalComponent, ModifierAbonnementModalComponent, TranslatePipe],
  templateUrl: './abonnement-list.component.html',
  styleUrls: ['./abonnement-list.component.css']
})
export class AbonnementListComponent implements OnInit {
  abonnements: AbonnementDTO[] = [];
  filteredAbonnements: AbonnementDTO[] = [];
  clients: ClientAbonneDTO[] = [];
  searchTerm = '';
  isLoading = true;

  isAddModalOpen = false;
  isEditModalOpen = false;
  selectedAbonnement?: AbonnementDTO;

  constructor(
    private abonnementService: AbonnementService,
    private clientService: ClientAbonneService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;
    forkJoin({
      abonnements: this.abonnementService.getAllAbonnements().pipe(
        catchError(() => of([])),
        take(1)
      ),
      clients: this.clientService.getAllClients().pipe(
        catchError(() => of([])),
        take(1)
      )
    }).subscribe({
      next: (data) => {
        this.abonnements = data.abonnements as AbonnementDTO[];
        this.clients = data.clients as ClientAbonneDTO[];
        this.filteredAbonnements = this.abonnements;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur de chargement:', error);
        this.notificationService.showError(this.translationService.translate('abonnement.loadError'));
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAbonnements(): void {
    this.loadAllData();
  }

  onSearch(): void {
    if (!this.searchTerm) {
      this.filteredAbonnements = this.abonnements;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredAbonnements = this.abonnements.filter(abo => {
      // Rechercher dans le téléphone client (direct ou via getClientTelephone)
      const telephone = abo.clientTelephone?.toString() || this.getClientTelephone(abo.clientId);
      const telephoneMatch = telephone.toLowerCase().includes(term);
      
      // Rechercher dans le statut
      const statutMatch = abo.status.toLowerCase().includes(term);
      
      // Rechercher dans l'ID du client
      const clientIdMatch = abo.clientId.toString().includes(term);
      
      // Rechercher dans l'ID du terrain
      const terrainIdMatch = abo.terrainId.toString().includes(term);
      
      // Rechercher dans l'ID de l'abonnement
      const abonnementIdMatch = abo.id.toString().includes(term);
      
      return telephoneMatch || statutMatch || clientIdMatch || terrainIdMatch || abonnementIdMatch;
    });
    this.cdr.detectChanges();
  }

  createAbonnement(): void {
    this.selectedAbonnement = undefined;
    this.isAddModalOpen = true;
    this.cdr.detectChanges();
  }

  edit(abonnement: AbonnementDTO): void {
    this.selectedAbonnement = abonnement;
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  onAddModalClose(): void {
    this.isAddModalOpen = false;
    this.cdr.detectChanges();
  }

  onAddModalSaved(): void {
    this.loadAbonnements();
  }

  onEditModalClose(): void {
    this.isEditModalOpen = false;
    this.selectedAbonnement = undefined;
    this.cdr.detectChanges();
  }

  onEditModalSaved(): void {
    this.loadAbonnements();
  }

  delete(id: number): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        message: this.translationService.translate('abonnement.deleteConfirm')
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.abonnementService.deleteAbonnement(id).subscribe({
          next: () => {
            this.notificationService.showSuccess(this.translationService.translate('abonnement.deletedSuccess'));
            this.loadAbonnements();
          },
          error: (error) => {
            console.error('Erreur de suppression:', error);
            this.notificationService.showError(this.translationService.translate('abonnement.deleteError'));
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // Formater le statut selon la langue (français ou arabe)
  formatStatus(status: string): string {
    if (!status) return status;
    const translationKey = `status.${status}`;
    const translated = this.translationService.translate(translationKey);
    // Si la traduction existe, l'utiliser, sinon retourner le statut original
    return translated !== translationKey ? translated : status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIF':
        return 'bg-green-100 text-green-800';
      case 'SUSPENDU':
        return 'bg-yellow-100 text-yellow-800';
      case 'TERMINE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  trackById(index: number, item: AbonnementDTO): number {
    return item.id;
  }

  formatHoraires(horaires: any[]): string {
    if (!horaires || horaires.length === 0) {
      return this.translationService.translate('abonnement.noSchedule') || 'Aucun horaire';
    }

    // Grouper les horaires par jourSemaine (garder seulement les jours uniques avec leur heure)
    const horairesMap = new Map<string, string>();
    horaires.forEach(h => {
      if (h.jourSemaine && h.heureDebut) {
        const heure = h.heureDebut.split(':')[0] + 'h';
        // Utiliser le service de traduction pour traduire les jours
        const translationKey = `days.${h.jourSemaine}`;
        const jour = this.translationService.translate(translationKey);
        // Si la traduction n'existe pas, formater en français
        const jourFormate = jour !== translationKey ? jour : h.jourSemaine.charAt(0) + h.jourSemaine.slice(1).toLowerCase();
        horairesMap.set(jourFormate, heure);
      }
    });

    // Convertir en tableau et formater
    const horairesArray = Array.from(horairesMap.entries()).map(([jour, heure]) => `${jour} ${heure}`);
    return horairesArray.join(', ');
  }

  getClientTelephone(clientId: number): string {
    if (!this.clients || this.clients.length === 0) {
      return `Client #${clientId}`;
    }
    
    const client = this.clients.find(c => c.id === clientId);
    if (client && client.telephone) {
      return client.telephone.toString();
    }
    
    return `Client #${clientId}`;
  }
}
