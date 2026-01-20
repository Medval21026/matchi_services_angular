import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ReservationService } from '../../../core/services/reservation.service';
import { TerrainService } from '../../../core/services/terrain.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ReservationPonctuelleDTO } from '../../../core/models/reservation.model';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { AjouterReservationModalComponent } from '../ajouter-reservation-modal/ajouter-reservation-modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-reservation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AjouterReservationModalComponent, TranslatePipe],
  templateUrl: './reservation-list.component.html',
  styleUrls: ['./reservation-list.component.css']
})
export class ReservationListComponent implements OnInit {

  reservations: ReservationPonctuelleDTO[] = [];
  filteredReservations: ReservationPonctuelleDTO[] = [];
  terrains: TerrainServiceDTO[] = [];

  errorMessage = '';
  
  searchTelephone = '';
  searchDate = '';

  isModalOpen = false;
  selectedReservation?: ReservationPonctuelleDTO;

  constructor(
    private reservationService: ReservationService,
    private terrainService: TerrainService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private translationService: TranslationService,
    private dialog: MatDialog
  ) {}

  get isRTL(): boolean {
    return this.translationService.getCurrentLanguageValue() === 'ar';
  }

  ngOnInit(): void {
    this.loadTerrains();
    this.loadReservations();
  }

  private loadTerrains(): void {
    this.terrainService.getAllTerrains().subscribe({
      next: (data) => {
        this.terrains = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur terrains:', error);
        this.cdr.detectChanges();
      }
    });
  }

  private loadReservations(): void {
    this.reservationService.getAllReservations().subscribe({
      next: (data) => {
        this.reservations = data;
        this.applyFilters(); // Appliquer les filtres après le chargement
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.translationService.translate('reservation.loadError');
        console.error('Erreur:', error);
        this.cdr.detectChanges();
      }
    });
  }

  createReservation(): void {
    this.selectedReservation = undefined;
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  edit(reservation: ReservationPonctuelleDTO): void {
    this.selectedReservation = reservation;
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  onModalClose(): void {
    this.isModalOpen = false;
    this.selectedReservation = undefined;
    this.cdr.detectChanges();
  }

  onModalSaved(): void {
    this.loadReservations();
  }

  delete(id: number): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        message: this.translationService.translate('reservation.deleteConfirm')
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.reservationService.deleteReservation(id).subscribe({
          next: () => {
            this.notificationService.showSuccess(this.translationService.translate('reservation.deletedSuccess'));
            this.loadReservations();
          },
          error: (error) => {
            this.errorMessage = this.translationService.translate('reservation.deleteError');
            this.notificationService.showError(this.translationService.translate('reservation.deleteError'));
            console.error('Erreur:', error);
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getTerrainName(terrainId: number): string {
    const terrain = this.terrains.find(t => t.id === terrainId);
    return terrain ? terrain.nom : `Terrain #${terrainId}`;
  }

  applyFilters(): void {
    this.filteredReservations = this.reservations.filter(resa => {
      const telephoneMatch = !this.searchTelephone || 
        resa.clientTelephone.toString().includes(this.searchTelephone);
      const dateMatch = !this.searchDate || resa.date === this.searchDate;
      return telephoneMatch && dateMatch;
    });
    this.cdr.detectChanges();
  }


  getDayName(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    const dayIndex = date.getDay();
    const dayKeys = ['days.sunday', 'days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday'];
    return this.translationService.translate(dayKeys[dayIndex]);
  }
}
