import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientAbonneDTO } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class StatistiqueService {
  private apiUrl = environment.apiUrl + '/statistiques';

  constructor(private http: HttpClient) {}

  /**
   * Retourne le nombre d'abonnements actifs pour un terrain donné
   */
  getNombreAbonnementsActifs(terrainId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terrains/${terrainId}/abonnements-actifs`);
  }

  /**
   * Retourne le nombre de réservations ponctuelles d'aujourd'hui pour un terrain donné
   */
  getNombreReservationsAujourdhui(terrainId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terrains/${terrainId}/reservations-aujourdhui`);
  }

  /**
   * Retourne le revenu total des abonnements actifs pour un terrain donné
   */
  getRevenuAbonnementsActifs(terrainId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terrains/${terrainId}/revenu-abonnements-actifs`);
  }

  /**
   * Retourne le revenu des réservations ponctuelles d'aujourd'hui pour un terrain donné
   */
  getRevenuReservationsAujourdhui(terrainId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terrains/${terrainId}/revenu-reservations-aujourdhui`);
  }

  /**
   * Retourne la liste des clients pour un terrain donné
   */
  getClientsParTerrain(terrainId: number): Observable<ClientAbonneDTO[]> {
    return this.http.get<ClientAbonneDTO[]>(`${this.apiUrl}/terrains/${terrainId}/clients`);
  }

  getNombreReservationsHier(terrainId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terrains/${terrainId}/reservations-hier`);
  }

  getRevenuReservationsHier(terrainId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terrains/${terrainId}/revenu-reservations-hier`);
  }
}
