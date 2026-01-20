export interface ReservationPonctuelleDTO {
  id?: number;
  date: string;  // Format: "YYYY-MM-DD"
  heureDebut: string;  // Format: "HH:mm"
  heureFin?: string;   // Calculé automatiquement
  prix: number;
  clientTelephone: number;
  terrainId: number;
}
