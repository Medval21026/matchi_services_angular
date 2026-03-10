import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  isSidebarOpen = true;
  currentUser: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService,
    private notificationService: NotificationService
  ) {}

  getDirection(): 'rtl' | 'ltr' {
    return this.translationService.getDirection();
  }

  onLogout(): void {
    this.authService.logout();
    this.notificationService.showInfo('Déconnexion réussie');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    // Sur desktop, sidebar toujours ouvert. Sur mobile, cachée par défaut
    if (window.innerWidth >= 1024) {
      this.isSidebarOpen = true;
    } else {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    // Seulement sur mobile (petits écrans)
    if (window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }

  onContentClick(): void {
    // Fermer la sidebar sur mobile quand on clique sur le contenu
    if (window.innerWidth < 1024 && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }
}
