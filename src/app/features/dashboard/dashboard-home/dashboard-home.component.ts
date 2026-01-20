import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { StatistiqueService } from '../../../core/services/statistique.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface DashboardStats {
  abonnementsActifs: number;
  reservationsAujourdhui: number;
  revenuAbonnements: number;
  revenuReservationsAujourdhui: number;
  reservationsHier: number;
  revenuReservationsHier: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit {
  stats: DashboardStats = {
    abonnementsActifs: 0,
    reservationsAujourdhui: 0,
    revenuAbonnements: 0,
    revenuReservationsAujourdhui: 0,
    reservationsHier: 0,
    revenuReservationsHier: 0
  };
  
  isLoading = true;
  currentUser: any;

  constructor(
    private authService: AuthService,
    private statistiqueService: StatistiqueService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.isLoading = true;
    
    const terrainIds = this.currentUser?.terrainIds || [];
    
    if (terrainIds.length === 0) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // Charger les statistiques pour tous les terrains
    const observables = terrainIds.flatMap((terrainId: number) => [
      this.statistiqueService.getNombreAbonnementsActifs(Number(terrainId)).pipe(
        catchError(() => of(0))
      ),
      this.statistiqueService.getNombreReservationsAujourdhui(Number(terrainId)).pipe(
        catchError(() => of(0))
      ),
      this.statistiqueService.getRevenuAbonnementsActifs(Number(terrainId)).pipe(
        catchError(() => of(0))
      ),
      this.statistiqueService.getRevenuReservationsAujourdhui(Number(terrainId)).pipe(
        catchError(() => of(0))
      ),
      this.statistiqueService.getNombreReservationsHier(Number(terrainId)).pipe(
        catchError(() => of(0))
      ),
      this.statistiqueService.getRevenuReservationsHier(Number(terrainId)).pipe(
        catchError(() => of(0))
      )
    ]);

    forkJoin<number[]>(observables).subscribe({
      next: (results) => {
        // Agréger les résultats pour tous les terrains
        let abonnementsActifs = 0;
        let reservationsAujourdhui = 0;
        let revenuAbonnements = 0;
        let revenuReservationsAujourdhui = 0;
        let reservationsHier = 0;
        let revenuReservationsHier = 0;

        // Les résultats sont dans l'ordre : [abonnements, reservations, revenuAbo, revenuRes, reservationsHier, revenuReservationsHier] pour chaque terrain
        for (let i = 0; i < results.length; i += 6) {
          abonnementsActifs += results[i] || 0;
          reservationsAujourdhui += results[i + 1] || 0;
          revenuAbonnements += results[i + 2] || 0;
          revenuReservationsAujourdhui += results[i + 3] || 0;
          reservationsHier += results[i + 4] || 0;
          revenuReservationsHier += results[i + 5] || 0;
        }

        this.stats = {
          abonnementsActifs,
          reservationsAujourdhui,
          revenuAbonnements,
          revenuReservationsAujourdhui,
          reservationsHier,
          revenuReservationsHier
        };

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
