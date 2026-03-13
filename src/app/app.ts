import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSnackBarModule, MatDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('matchi_service_angular');
  private pwaUpdateService = inject(PwaUpdateService);

  ngOnInit(): void {
    // Le service PWA est initialisé automatiquement via l'injection
    // Cela permet de détecter et gérer les mises à jour du service worker
  }
}
