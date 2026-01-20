export interface TerrainServiceDTO {
  id?: number;
  nom: string;
  adresse: string;
  proprietaireId: number;
  heureOuverture: string;  // Format: "HH:mm"
  heureFermeture: string;  // Format: "HH:mm"
  createdAt?: string;
}
