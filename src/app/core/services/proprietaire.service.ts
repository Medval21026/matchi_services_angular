import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProprietaireDTO } from '../models/proprietaire.model';

@Injectable({ providedIn: 'root' })
export class ProprietaireService {
  private apiUrl = environment.apiUrl + '/proprietaires';

  constructor(private http: HttpClient) {}

  register(proprietaire: ProprietaireDTO): Observable<ProprietaireDTO> {
    return this.http.post<ProprietaireDTO>(this.apiUrl, proprietaire);
  }

  getProfile(id: number): Observable<ProprietaireDTO> {
    return this.http.get<ProprietaireDTO>(`${this.apiUrl}/${id}`);
  }

  updateProfile(id: number, data: ProprietaireDTO): Observable<ProprietaireDTO> {
    return this.http.put<ProprietaireDTO>(`${this.apiUrl}/${id}`, data);
  }

  activateAccount(id: number): Observable<ProprietaireDTO> {
    return this.http.put<ProprietaireDTO>(`${this.apiUrl}/${id}/activate`, {});
  }
}
