import { TypeReservation } from './common.models';

export interface HoraireOccupeDTO {
  date: string;
  heureDebut: string;
  heureFin: string;
  telephoneProprietaire: number;
  terrainId: number;
}

export interface DisponibiliteResponseDTO {
  horairesOccupes: HoraireOccupeDTO[];
}

export interface IndisponibleHoraireDTO {
  id: number;
  terrainId: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  typeReservation: TypeReservation;
  sourceId: number;
  description: string;
}
