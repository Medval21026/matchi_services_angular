import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AbonnementHoraireDTO } from '../models/abonnement.model';

@Injectable({ providedIn: 'root' })
export class AbonnementHoraireService {
  private apiUrl = environment.apiUrl + '/horaires';

  constructor(private http: HttpClient) {}

  getHoraireById(id: number): Observable<AbonnementHoraireDTO> {
    return this.http.get<AbonnementHoraireDTO>(`${this.apiUrl}/${id}`);
  }

  updateHoraire(id: number, data: Partial<AbonnementHoraireDTO>): Observable<AbonnementHoraireDTO> {
    return this.http.put<AbonnementHoraireDTO>(`${this.apiUrl}/${id}`, data);
  }

  createHoraire(data: AbonnementHoraireDTO): Observable<AbonnementHoraireDTO> {
    return this.http.post<AbonnementHoraireDTO>(this.apiUrl, data);
  }

  deleteHoraire(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getHorairesByAbonnement(abonnementId: number): Observable<AbonnementHoraireDTO[]> {
    return this.http.get<AbonnementHoraireDTO[]>(`${this.apiUrl}/abonnement/${abonnementId}`);
  }
}
