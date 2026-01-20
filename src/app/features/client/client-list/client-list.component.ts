import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClientAbonneService } from '../../../core/services/client-abonne.service';
import { StatistiqueService } from '../../../core/services/statistique.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ClientAbonneDTO } from '../../../core/models/client.model';
import { AjouterClientModalComponent } from '../ajouter-client-modal/ajouter-client-modal.component';
import { ModifierClientModalComponent } from '../modifier-client-modal/modifier-client-modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AjouterClientModalComponent, ModifierClientModalComponent, TranslatePipe],
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.css']
})
export class ClientListComponent implements OnInit {
  clients: ClientAbonneDTO[] = [];
  filteredClients: ClientAbonneDTO[] = [];
  searchTerm = '';
  isLoading = true;

  isAddModalOpen = false;
  isEditModalOpen = false;
  selectedClient?: ClientAbonneDTO;

  constructor(
    private clientService: ClientAbonneService,
    private statistiqueService: StatistiqueService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  get isRTL(): boolean {
    return this.translationService.getCurrentLanguageValue() === 'ar';
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading = true;
    
    const currentUser = this.authService.getCurrentUser();
    const terrainIds = currentUser?.terrainIds || [];
    
    if (terrainIds.length === 0) {
      this.clients = [];
      this.filteredClients = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // Charger les clients pour tous les terrains du propriétaire
    const observables = terrainIds.map((terrainId: number) =>
      this.statistiqueService.getClientsParTerrain(Number(terrainId)).pipe(
        catchError(() => of([]))
      )
    );

    forkJoin<ClientAbonneDTO[][]>(observables).subscribe({
      next: (results) => {
        // Fusionner tous les clients de tous les terrains et supprimer les doublons
        const allClients = results.flat();
        // Supprimer les doublons basés sur l'ID du client
        const uniqueClients = allClients.filter((client, index, self) =>
          index === self.findIndex(c => c.id === client.id)
        );
        
        this.clients = uniqueClients;
        this.filteredClients = uniqueClients;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur de chargement:', error);
        this.notificationService.showError(this.translationService.translate('client.loadError'));
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm) {
      this.filteredClients = this.clients;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredClients = this.clients.filter(client =>
      client.nom.toLowerCase().includes(term) ||
      client.prenom.toLowerCase().includes(term) ||
      client.telephone.toString().includes(term)
    );
    this.cdr.detectChanges();
  }

  createClient(): void {
    this.selectedClient = undefined;
    this.isAddModalOpen = true;
    this.cdr.detectChanges();
  }

  edit(client: ClientAbonneDTO): void {
    this.selectedClient = client;
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  onAddModalClose(): void {
    this.isAddModalOpen = false;
    this.cdr.detectChanges();
  }

  onAddModalSaved(): void {
    this.loadClients();
  }

  onEditModalClose(): void {
    this.isEditModalOpen = false;
    this.selectedClient = undefined;
    this.cdr.detectChanges();
  }

  onEditModalSaved(): void {
    this.loadClients();
  }

  delete(id: number): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        message: this.translationService.translate('client.deleteConfirm')
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.clientService.deleteClient(id).subscribe({
          next: () => {
            this.notificationService.showSuccess(this.translationService.translate('client.deletedSuccess'));
            this.loadClients();
          },
          error: (error) => {
            console.error('Erreur de suppression:', error);
            this.notificationService.showError(this.translationService.translate('client.deleteError'));
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  trackById(index: number, item: ClientAbonneDTO): number {
    return item.id || index;
  }
}
