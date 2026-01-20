export interface ProprietaireDTO {
  id?: number;
  nom: string;
  prenom: string;
  telephone: number;
  password?: string;
  isActive?: boolean;
  createdAt?: string;
  terrainIds?: number[];
}

export interface LoginRequest {
  telephone: number;
  password: string;
}

export interface LoginResponse {
  id: number;
  isActive: boolean;
  nom: string;
  prenom: string;
  telephone: number;
  terrainIds: number[];
  token: string;
  tokenType: string;
}
