import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReservationPonctuelleDTO } from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private apiUrl = environment.apiUrl + '/reservations';

  constructor(private http: HttpClient) {}

  getAllReservations(): Observable<ReservationPonctuelleDTO[]> {
    return this.http.get<ReservationPonctuelleDTO[]>(this.apiUrl);
  }

  getReservationById(id: number): Observable<ReservationPonctuelleDTO> {
    return this.http.get<ReservationPonctuelleDTO>(`${this.apiUrl}/${id}`);
  }

  getReservationsByTerrain(terrainId: number): Observable<ReservationPonctuelleDTO[]> {
    return this.http.get<ReservationPonctuelleDTO[]>(`${this.apiUrl}/terrain/${terrainId}`);
  }

  createReservation(data: ReservationPonctuelleDTO): Observable<ReservationPonctuelleDTO> {
    return this.http.post<ReservationPonctuelleDTO>(this.apiUrl, data);
  }

  updateReservation(id: number, data: ReservationPonctuelleDTO): Observable<ReservationPonctuelleDTO> {
    return this.http.put<ReservationPonctuelleDTO>(`${this.apiUrl}/${id}`, data);
  }

  deleteReservation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
