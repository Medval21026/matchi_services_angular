import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TerrainServiceDTO } from '../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class TerrainService {
  private apiUrl = environment.apiUrl + '/terrains';

  constructor(private http: HttpClient) {}

  getAllTerrains(): Observable<TerrainServiceDTO[]> {
    return this.http.get<TerrainServiceDTO[]>(this.apiUrl);
  }

  getTerrainById(id: number): Observable<TerrainServiceDTO> {
    return this.http.get<TerrainServiceDTO>(`${this.apiUrl}/${id}`);
  }

  createTerrain(terrain: TerrainServiceDTO): Observable<TerrainServiceDTO> {
    return this.http.post<TerrainServiceDTO>(this.apiUrl, terrain);
  }

  updateTerrain(id: number, terrain: TerrainServiceDTO): Observable<TerrainServiceDTO> {
    return this.http.put<TerrainServiceDTO>(`${this.apiUrl}/${id}`, terrain);
  }

  deleteTerrain(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
