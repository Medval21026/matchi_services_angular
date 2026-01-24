import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, ProprietaireDTO } from '../models/proprietaire.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl + '/proprietaires';
  private currentUserSubject = new BehaviorSubject<ProprietaireDTO | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCurrentUser();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('AuthService.login - Envoi de la requête:', credentials);
    
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      credentials,
      {
        observe: 'response', // pour lire le header Authorization (Samsung Android/PWA)
        withCredentials: true // OBLIGATOIRE pour mobile iOS/Android PWA
      }
    ).pipe(
      tap(response => {
        console.log('AuthService.login - Réponse reçue:', {
          status: response.status,
          headers: response.headers.keys(),
          body: response.body
        });

        // 1. Essayer de lire le token depuis le header Authorization (Samsung Android/PWA compatible)
        let token: string | null = response.headers.get('Authorization');
        
        // 2. Si pas dans le header, essayer dans le body
        const body = response.body;
        if (!token && body?.token) {
          // Construire le token avec le tokenType si présent
          const tokenType = body.tokenType || 'Bearer';
          token = `${tokenType} ${body.token}`;
          console.log('Token trouvé dans le body, formaté:', token);
        }
        
        // 3. Stocker le token
        if (token) {
          // Nettoyer le token (enlever les espaces en début/fin)
          token = token.trim();
          // S'assurer que le token contient "Bearer " si nécessaire
          if (!token.startsWith('Bearer ')) {
            token = `Bearer ${token}`;
          }
          this.setToken(token);
          console.log('Token stocké dans localStorage');
        } else {
          console.warn('Aucun token trouvé dans la réponse (ni header ni body)');
        }
        
        // 4. Construire et stocker l'utilisateur
        if (body) {
          const user: ProprietaireDTO = {
            id: body.id,
            nom: body.nom,
            prenom: body.prenom,
            telephone: body.telephone,
            isActive: body.isActive,
            terrainIds: body.terrainIds
          };
          this.setCurrentUser(user);
          console.log('Utilisateur stocké:', user);
        } else {
          console.warn('Body de la réponse est null ou vide');
        }
      }),
      map(response => {
        // Créer un LoginResponse compatible avec le code existant
        const body = response.body;
        if (body) {
          return body;
        }
        // Si le body est null, essayer de construire une réponse minimale depuis les headers
        console.error('Réponse de login invalide: body est null');
        throw new Error('Réponse de login invalide: aucune donnée reçue du serveur');
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): ProprietaireDTO | null {
    return this.currentUserSubject.value;
  }

  private setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  private setCurrentUser(user: ProprietaireDTO): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private loadCurrentUser(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }
}
