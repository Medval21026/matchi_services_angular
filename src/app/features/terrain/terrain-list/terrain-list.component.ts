import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TerrainService } from '../../../core/services/terrain.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { AjouterTerrainModalComponent } from '../ajouter-terrain-modal/ajouter-terrain-modal.component';
import { ModifierTerrainModalComponent } from '../modifier-terrain-modal/modifier-terrain-modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-terrain-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AjouterTerrainModalComponent, ModifierTerrainModalComponent, TranslatePipe],
  templateUrl: './terrain-list.component.html',
  styleUrls: ['./terrain-list.component.css']
})
export class TerrainListComponent implements OnInit {
  terrains: TerrainServiceDTO[] = [];
  filteredTerrains: TerrainServiceDTO[] = [];
  searchTerm = '';
  isLoading = true;

  isAddModalOpen = false;
  isEditModalOpen = false;
  selectedTerrain?: TerrainServiceDTO;

  constructor(
    private terrainService: TerrainService,
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
    this.loadTerrains();
  }

  loadTerrains(): void {
    this.isLoading = true;
    this.terrainService.getAllTerrains().subscribe({
      next: (data) => {
        // Filtrer les terrains par proprietaireId si nécessaire
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.id) {
          this.terrains = data.filter(t => t.proprietaireId === currentUser.id);
        } else {
          this.terrains = data;
        }
        this.filteredTerrains = this.terrains;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur de chargement:', error);
        this.notificationService.showError(this.translationService.translate('terrain.loadError'));
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm) {
      this.filteredTerrains = this.terrains;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredTerrains = this.terrains.filter(terrain =>
      terrain.nom.toLowerCase().includes(term) ||
      terrain.adresse.toLowerCase().includes(term)
    );
    this.cdr.detectChanges();
  }

  createTerrain(): void {
    this.selectedTerrain = undefined;
    this.isAddModalOpen = true;
    this.cdr.detectChanges();
  }

  edit(terrain: TerrainServiceDTO): void {
    this.selectedTerrain = terrain;
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  onAddModalClose(): void {
    this.isAddModalOpen = false;
    this.cdr.detectChanges();
  }

  onAddModalSaved(): void {
    this.loadTerrains();
  }

  onEditModalClose(): void {
    this.isEditModalOpen = false;
    this.selectedTerrain = undefined;
    this.cdr.detectChanges();
  }

  onEditModalSaved(): void {
    this.loadTerrains();
  }

  delete(id: number): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        message: this.translationService.translate('terrain.deleteConfirm')
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.terrainService.deleteTerrain(id).subscribe({
          next: () => {
            this.notificationService.showSuccess(this.translationService.translate('terrain.deletedSuccess'));
            this.loadTerrains();
          },
          error: (error) => {
            console.error('Erreur de suppression:', error);
            this.notificationService.showError(this.translationService.translate('terrain.deleteError'));
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  /**
   * Vérifie si le propriétaire a déjà un terrain associé
   * Le bouton "Ajouter terrain" sera caché si cette propriété retourne true
   */
  get hasTerrain(): boolean {
    return this.terrains.length > 0;
  }

  trackById(index: number, item: TerrainServiceDTO): number {
    return item.id || index;
  }

  formatTime(time: string | undefined): string {
    if (!time) return 'N/A';
    return time.substring(0, 5); // Format HH:mm
  }
}
