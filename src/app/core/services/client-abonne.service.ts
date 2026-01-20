import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientAbonneDTO } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientAbonneService {
  private apiUrl = environment.apiUrl + '/clients';

  constructor(private http: HttpClient) {}

  getAllClients(): Observable<ClientAbonneDTO[]> {
    return this.http.get<ClientAbonneDTO[]>(this.apiUrl);
  }

  getClientById(id: number): Observable<ClientAbonneDTO> {
    return this.http.get<ClientAbonneDTO>(`${this.apiUrl}/${id}`);
  }

  createClient(client: ClientAbonneDTO): Observable<ClientAbonneDTO> {
    return this.http.post<ClientAbonneDTO>(this.apiUrl, client);
  }

  updateClient(id: number, client: ClientAbonneDTO): Observable<ClientAbonneDTO> {
    return this.http.put<ClientAbonneDTO>(`${this.apiUrl}/${id}`, client);
  }

  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
