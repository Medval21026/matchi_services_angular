import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private snackBar: MatSnackBar
  ) {
    this.checkForUpdates();
    this.handleUpdates();
  }

  /**
   * Vérifie périodiquement les mises à jour du service worker
   */
  private checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker n\'est pas activé');
      return;
    }

    // Vérifier les mises à jour toutes les 6 heures
    setInterval(() => {
      this.swUpdate.checkForUpdate();
    }, 6 * 60 * 60 * 1000);

    // Vérifier immédiatement au démarrage
    this.swUpdate.checkForUpdate();
  }

  /**
   * Gère les événements de mise à jour du service worker
   */
  private handleUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Écouter les mises à jour disponibles
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(() => {
        this.promptUserUpdate();
      });

    // Écouter les erreurs de mise à jour
    this.swUpdate.unrecoverable.subscribe(() => {
      this.snackBar.open(
        'Une erreur est survenue. Veuillez recharger la page.',
        'Recharger',
        {
          duration: 0,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        }
      ).onAction().subscribe(() => {
        window.location.reload();
      });
    });
  }

  /**
   * Affiche une notification pour informer l'utilisateur d'une mise à jour disponible
   */
  private promptUserUpdate(): void {
    const snackBarRef = this.snackBar.open(
      'Une nouvelle version est disponible !',
      'Mettre à jour',
      {
        duration: 0,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['pwa-update-snackbar']
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.activateUpdate();
    });
  }

  /**
   * Active la mise à jour et recharge la page
   */
  private activateUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        window.location.reload();
      });
    }
  }

  /**
   * Force la vérification d'une mise à jour
   */
  public checkUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate();
    }
  }
}
