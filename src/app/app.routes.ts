import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

// Auth Components
import { LoginComponent } from './features/auth/login/login.component';

// Dashboard Components
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardHomeComponent } from './features/dashboard/dashboard-home/dashboard-home.component';

// Terrain Components
import { TerrainListComponent } from './features/terrain/terrain-list/terrain-list.component';

// Client Components
import { ClientListComponent } from './features/client/client-list/client-list.component';

// Abonnement Components
import { AbonnementListComponent } from './features/abonnement/abonnement-list/abonnement-list.component';

// Reservation Components
import { ReservationListComponent } from './features/reservation/reservation-list/reservation-list.component';
import { ReservationCalendarComponent } from './features/reservation/reservation-calendar/reservation-calendar.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      
      // Terrains Routes
      { path: 'terrains', component: TerrainListComponent },
      
      // Clients Routes
      { path: 'clients', component: ClientListComponent },
      
      // Abonnements Routes
      { path: 'abonnements', component: AbonnementListComponent },
      
      // Reservations Routes
      { path: 'reservations', component: ReservationListComponent },
      { path: 'reservations/calendar', component: ReservationCalendarComponent },
    ]
  },
  { path: '**', redirectTo: '/login' }
];
