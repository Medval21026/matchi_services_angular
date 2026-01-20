import { StatutAbonnement, JourSemaine } from './common.models';

export interface AbonnementDTO {
  id: number;
  terrainId: number;
  clientId: number;
  clientTelephone?: number;  // Téléphone du client (retourné par le backend)
  dateDebut: string;  // Format: "YYYY-MM-DD"
  dateFin: string;
  prixTotal: number;
  status: StatutAbonnement;
  createdAt: string;
  horaires: AbonnementHoraireDTO[];
}

export interface AbonnementCreateDTO {
  terrainId: number;
  clientTelephone: number;  // ⚠️ Téléphone, pas ID
  dateDebut: string;
  dateFin: string;
  horaires: AbonnementHoraireDTO[];
}

export interface AbonnementUpdateDTO {
  terrainId?: number;
  clientTelephone?: number;
  dateDebut?: string;
  dateFin?: string;
  status?: StatutAbonnement;
  horaires?: AbonnementHoraireDTO[];
}

export interface AbonnementHoraireDTO {
  id?: number;
  abonnementId?: number;
  date?: string;
  jourSemaine: JourSemaine;
  heureDebut: string;  // Format: "HH:mm"
  heureFin?: string;   // Calculé automatiquement si null
  prixHeure: number;
}
