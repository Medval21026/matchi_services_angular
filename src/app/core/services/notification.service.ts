import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private defaultDuration = 4000; // 4 secondes par défaut

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Affiche un message de succès
   */
  showSuccess(message: string, duration?: number): void {
    this.open(message, 'success', duration);
  }

  /**
   * Affiche un message d'erreur
   */
  showError(message: string, duration?: number): void {
    this.open(message, 'error', duration);
  }

  /**
   * Affiche un message d'information
   */
  showInfo(message: string, duration?: number): void {
    this.open(message, 'info', duration);
  }

  /**
   * Affiche un message d'avertissement
   */
  showWarning(message: string, duration?: number): void {
    this.open(message, 'warning', duration);
  }

  /**
   * Méthode privée pour ouvrir le snackbar avec la configuration appropriée
   */
  private open(message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number): void {
    const config: MatSnackBarConfig = {
      duration: duration || this.defaultDuration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, 'Fermer', config);
  }
}
