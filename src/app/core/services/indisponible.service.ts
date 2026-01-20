import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IndisponibleHoraireDTO } from '../models/disponibilite.model';

@Injectable({ providedIn: 'root' })
export class IndisponibleService {
  private apiUrl = environment.apiUrl + '/indisponibles';

  constructor(private http: HttpClient) {}

  getAllIndisponibles(): Observable<IndisponibleHoraireDTO[]> {
    return this.http.get<IndisponibleHoraireDTO[]>(this.apiUrl);
  }

  getIndisponiblesByTerrain(terrainId: number): Observable<IndisponibleHoraireDTO[]> {
    return this.http.get<IndisponibleHoraireDTO[]>(`${this.apiUrl}/terrain/${terrainId}`);
  }

  getIndisponiblesByTerrainAndDate(terrainId: number, date: string): Observable<IndisponibleHoraireDTO[]> {
    return this.http.get<IndisponibleHoraireDTO[]>(`${this.apiUrl}/terrain/${terrainId}/date/${date}`);
  }

  synchroniserTerrain(terrainId: number): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/terrain/${terrainId}/synchroniser`, {});
  }

  synchroniserTous(): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/synchroniser-tous`, {});
  }
}
