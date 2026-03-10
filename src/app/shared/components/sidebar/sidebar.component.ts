import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslationService } from '../../../core/services/translation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = true;
  @Output() close = new EventEmitter<void>();

  isRTL = false;
  private langSubscription?: Subscription;

  menuItems = [
    { path: '/dashboard', label: 'sidebar.dashboard', icon: 'dashboard', active: true },
    { path: '/dashboard/terrains', label: 'sidebar.terrains', icon: 'terrain' },
    { path: '/dashboard/reservations', label: 'sidebar.demandes', icon: 'requests' },
    { path: '/dashboard/reservations/calendar', label: 'sidebar.planning', icon: 'calendar' },
    { path: '/dashboard/clients', label: 'sidebar.clients', icon: 'clients' },
    { path: '/dashboard/abonnements', label: 'sidebar.abonnements', icon: 'subscriptions' },
    { path: '/dashboard/profil', label: 'sidebar.profil', icon: 'settings' },
  ];

  constructor(
    public router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.isRTL = this.translationService.isRTL();
    this.langSubscription = this.translationService.getCurrentLanguage().subscribe(() => {
      this.isRTL = this.translationService.isRTL();
    });
  }

  ngOnDestroy(): void {
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onMenuItemClick(): void {
    // Fermer la sidebar sur mobile après avoir cliqué sur un élément du menu
    if (window.innerWidth < 1024) {
      this.onClose();
    }
  }

  getRouterLinkActiveOptions(item: any): any {
    if (item.path === '/dashboard') {
      return { exact: true };
    }
    if (item.path === '/dashboard/reservations/calendar') {
      return { exact: true };
    }
    if (item.path === '/dashboard/reservations') {
      return { exact: true };
    }
    if (item.path === '/dashboard/terrains') {
      return { exact: true };
    }
    if (item.path === '/dashboard/profil') {
      return { exact: true };
    }
    return { exact: false };
  }

  onLogout(): void {
    this.authService.logout();
    this.notificationService.showInfo('Déconnexion réussie');
    this.router.navigate(['/login']);
  }
}
