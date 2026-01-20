import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DisponibiliteResponseDTO } from '../models/disponibilite.model';

@Injectable({ providedIn: 'root' })
export class DisponibiliteService {
  private apiUrl = environment.apiUrl + '/disponibilites';

  constructor(private http: HttpClient) {}

  getTousLesHorairesOccupes(): Observable<DisponibiliteResponseDTO> {
    return this.http.get<DisponibiliteResponseDTO>(`${this.apiUrl}/horaires-occupes`);
  }
}
