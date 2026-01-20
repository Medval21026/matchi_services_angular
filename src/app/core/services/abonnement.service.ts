import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  AbonnementDTO, 
  AbonnementCreateDTO, 
  AbonnementUpdateDTO,
  AbonnementHoraireDTO 
} from '../models/abonnement.model';

@Injectable({ providedIn: 'root' })
export class AbonnementService {
  private apiUrl = environment.apiUrl + '/abonnements';

  constructor(private http: HttpClient) {}

  getAllAbonnements(): Observable<AbonnementDTO[]> {
    return this.http.get<AbonnementDTO[]>(this.apiUrl);
  }

  getAbonnementById(id: number): Observable<AbonnementDTO> {
    return this.http.get<AbonnementDTO>(`${this.apiUrl}/${id}`);
  }

  getAbonnementsByClient(clientId: number): Observable<AbonnementDTO[]> {
    return this.http.get<AbonnementDTO[]>(`${this.apiUrl}/client/${clientId}`);
  }

  createAbonnement(data: AbonnementCreateDTO): Observable<AbonnementDTO> {
    return this.http.post<AbonnementDTO>(this.apiUrl, data);
  }

  updateAbonnement(id: number, data: AbonnementUpdateDTO): Observable<AbonnementDTO> {
    return this.http.put<AbonnementDTO>(`${this.apiUrl}/${id}`, data);
  }

  deleteAbonnement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getHorairesByAbonnement(abonnementId: number): Observable<AbonnementHoraireDTO[]> {
    return this.http.get<AbonnementHoraireDTO[]>(`${environment.apiUrl}/abonnements-horaires/abonnement/${abonnementId}`);
  }
}
