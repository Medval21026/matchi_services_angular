import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';
import { IndisponibleService } from '../../../core/services/indisponible.service';
import { TerrainService } from '../../../core/services/terrain.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { AbonnementService } from '../../../core/services/abonnement.service';
import { ClientAbonneService } from '../../../core/services/client-abonne.service';
import { IndisponibleHoraireDTO } from '../../../core/models/disponibilite.model';
import { TerrainServiceDTO } from '../../../core/models/terrain.model';
import { ReservationPonctuelleDTO } from '../../../core/models/reservation.model';
import { AbonnementDTO } from '../../../core/models/abonnement.model';
import { ClientAbonneDTO } from '../../../core/models/client.model';
import { TypeReservation } from '../../../core/models/common.models';

interface PlanningSlot {
  date: Date;
  heure: string;
  indisponible?: IndisponibleHoraireDTO;
  rowSpan?: number; // Pour les créneaux qui s'étendent sur plusieurs heures
}

@Component({
  selector: 'app-reservation-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './reservation-calendar.component.html',
  styleUrls: ['./reservation-calendar.component.css']
})
export class ReservationCalendarComponent implements OnInit {
  currentWeekStart: Date = new Date();
  indisponibles: IndisponibleHoraireDTO[] = [];
  terrains: TerrainServiceDTO[] = [];
  selectedTerrainId?: number;
  isLoading = false;

  // Données pour récupérer les téléphones clients
  reservations: ReservationPonctuelleDTO[] = [];
  abonnements: AbonnementDTO[] = [];
  clients: ClientAbonneDTO[] = [];
  clientPhonesMap: Map<number, number> = new Map(); // sourceId -> telephone
  clientIdToPhoneMap: Map<number, number> = new Map(); // clientId -> telephone

  // Jours de la semaine
  daysOfWeek: Date[] = [];
  
  // Heures (sera rempli dynamiquement selon      les heures d'ouverture/fermeture du terrain)
  hours: string[] = [];
  
  // Grille de planning
  planningGrid: Map<string, PlanningSlot> = new Map();

  constructor(
    private indisponibleService: IndisponibleService,
    private terrainService: TerrainService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private reservationService: ReservationService,
    private abonnementService: AbonnementService,
    private clientService: ClientAbonneService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialiser la semaine courante (lundi de la semaine actuelle)
    this.initializeWeek();
  }

  ngOnInit(): void {
    // Charger les données clients en premier, puis les terrains
    this.loadClientData().then(() => {
      this.loadTerrains();
    }).catch(() => {
      // Même en cas d'erreur, charger les terrains
      this.loadTerrains();
    });
  }

  private loadClientData(): Promise<void> {
    // Charger les réservations, abonnements et clients pour récupérer les numéros de téléphone
    return new Promise((resolve, reject) => {
      forkJoin({
        reservations: this.reservationService.getAllReservations(),
        abonnements: this.abonnementService.getAllAbonnements(),
        clients: this.clientService.getAllClients()
      }).subscribe({
      next: (data) => {
        this.reservations = data.reservations;
        this.abonnements = data.abonnements;
        this.clients = data.clients;
        
        console.log('Réservations chargées:', this.reservations.length);
        console.log('Abonnements chargés:', this.abonnements.length);
        console.log('Clients chargés:', this.clients.length);
        
        // Créer une map clientId -> telephone
        this.clients.forEach(client => {
          if (client.id && client.telephone) {
            this.clientIdToPhoneMap.set(client.id, client.telephone);
          }
        });
        
        // Mapper les téléphones des réservations ponctuelles (toutes, y compris passées)
        this.reservations.forEach(res => {
          if (res.id && res.clientTelephone) {
            // Mapper avec l'ID en tant que nombre pour garantir la correspondance
            const resId = Number(res.id);
            const phone = Number(res.clientTelephone);
            this.clientPhonesMap.set(resId, phone);
            console.log('Téléphone réservation:', resId, '->', phone, '(date:', res.date, ')');
          } else if (res.id) {
            console.warn('Réservation sans téléphone:', res.id, res.date);
          }
        });
        
        // Mapper les téléphones des abonnements
        this.abonnements.forEach(abo => {
          if (abo.id) {
            // Utiliser clientTelephone s'il existe directement
            if (abo.clientTelephone) {
              this.clientPhonesMap.set(abo.id, abo.clientTelephone);
              console.log('Téléphone abonnement (direct):', abo.id, '->', abo.clientTelephone);
            } else if (abo.clientId) {
              // Si pas de clientTelephone direct, chercher via clientId dans la map des clients
              const clientPhone = this.clientIdToPhoneMap.get(abo.clientId);
              if (clientPhone) {
                this.clientPhonesMap.set(abo.id, clientPhone);
                console.log('Téléphone abonnement (via clientId):', abo.id, 'clientId:', abo.clientId, '->', clientPhone);
              } else {
                // Chercher dans les autres abonnements du même client
                const otherAbo = this.abonnements.find(a => a.clientId === abo.clientId && a.clientTelephone);
                if (otherAbo?.clientTelephone) {
                  this.clientPhonesMap.set(abo.id, otherAbo.clientTelephone);
                  console.log('Téléphone abonnement (via autre abonnement):', abo.id, '->', otherAbo.clientTelephone);
                } else {
                  console.warn('Téléphone non trouvé pour abonnement:', abo.id, 'clientId:', abo.clientId);
                }
              }
            }
          }
        });
        
        console.log('Map des téléphones (sourceId -> phone):', Array.from(this.clientPhonesMap.entries()));
        console.log('Map clientId -> phone:', Array.from(this.clientIdToPhoneMap.entries()));
        
        // Toujours reconstruire la grille après le chargement des clients
        // pour s'assurer que les téléphones sont affichés
        if (this.selectedTerrainId && this.indisponibles.length > 0) {
          this.buildPlanningGrid();
          this.cdr.detectChanges();
        }
        
        resolve();
      },
      error: (error) => {
        console.error('Erreur chargement données clients:', error);
        reject(error);
      }
    });
    });
  }

  private initializeWeek(): void {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
    this.currentWeekStart = new Date(today.setDate(diff));
    this.currentWeekStart.setHours(0, 0, 0, 0);
    this.updateDaysOfWeek();
  }

  private updateDaysOfWeek(): void {
    this.daysOfWeek = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      this.daysOfWeek.push(date);
    }
  }

  private loadTerrains(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.terrainIds || currentUser.terrainIds.length === 0) {
      this.notificationService.showWarning('Aucun terrain associé à votre compte');
      return;
    }

    this.terrainService.getAllTerrains().subscribe({
      next: (terrains) => {
        // Filtrer les terrains selon terrainIds de l'utilisateur
        this.terrains = terrains.filter(t => 
          currentUser.terrainIds?.includes(t.id || 0)
        );
        
        if (this.terrains.length > 0) {
          this.selectedTerrainId = this.terrains[0].id;
          // Charger le planning (les données clients sont déjà chargées si disponibles)
          this.loadPlanning();
        }
      },
      error: (error) => {
        console.error('Erreur chargement terrains:', error);
        this.notificationService.showError('Erreur lors du chargement des terrains');
      }
    });
  }

  onTerrainChange(): void {
    this.loadPlanning();
  }

  loadPlanning(): void {
    if (!this.selectedTerrainId) return;

    this.isLoading = true;
    const terrain = this.terrains.find(t => t.id === this.selectedTerrainId);
    if (!terrain) {
      this.isLoading = false;
      return;
    }

    // Générer les heures selon les heures d'ouverture/fermeture du terrain
    const heureOuverture = terrain.heureOuverture;
    const heureFermeture = terrain.heureFermeture;
    
    console.log('Terrain:', terrain.nom, 'Heures:', heureOuverture, '-', heureFermeture);
    this.generateHours(heureOuverture, heureFermeture);
    console.log('Heures générées:', this.hours.length, this.hours);

    // Récupérer les indisponibilités pour la semaine
    const weekStart = this.formatDate(this.currentWeekStart);
    const weekEnd = this.formatDate(new Date(this.daysOfWeek[6]));

    // Charger les indisponibilités ET s'assurer que les données clients sont disponibles
    // Si les données clients ne sont pas encore chargées, les charger maintenant
    const loadIndisponibles = () => {
      if (!this.selectedTerrainId) return;
      
      this.indisponibleService.getIndisponiblesByTerrain(this.selectedTerrainId).subscribe({
        next: (data) => {
          console.log('Indisponibilités reçues:', data.length);
          console.log('Premières indisponibilités:', data.slice(0, 5));
          
          // Filtrer pour la semaine courante
          const startDateStr = this.formatDate(this.currentWeekStart);
          const endDateStr = this.formatDate(this.daysOfWeek[6]);
          
          console.log('Semaine du', startDateStr, 'au', endDateStr);
          
          this.indisponibles = data.filter(ind => {
            // Comparer les dates en format string pour éviter les problèmes de fuseau horaire
            const indDateStr = ind.date;
            const isInWeek = indDateStr >= startDateStr && indDateStr <= endDateStr;
            
            if (isInWeek) {
              console.log('Indisponibilité trouvée:', ind.date, ind.heureDebut, '-', ind.heureFin, ind.description, 'sourceId:', ind.sourceId);
            }
            
            return isInWeek;
          });
          
          console.log('Indisponibilités pour la semaine:', this.indisponibles.length);
          console.log('Détails:', this.indisponibles.map(i => `${i.date} ${i.heureDebut}-${i.heureFin} (sourceId: ${i.sourceId}, type: ${i.typeReservation})`));
          console.log('Heures disponibles:', this.hours.length, this.hours);
          
          // CRUCIAL: Mapper les IDs d'indisponibilités aux téléphones des réservations
          // FAIRE LE MAPPING AVANT de modifier les dates (pour utiliser la date originale)
          // Pour les réservations ponctuelles passées, sourceId peut être l'ID de l'indisponibilité
          // et non l'ID de la réservation
          this.indisponibles.forEach(ind => {
            if (ind.typeReservation === 'RESERVATION_PONCTUELLE' && ind.sourceId) {
              // Chercher la réservation correspondante par date/heure/terrain (date originale)
              const matchingRes = this.reservations.find(res => 
                res.date === ind.date && 
                res.heureDebut === ind.heureDebut &&
                res.terrainId === ind.terrainId
              );
              
              if (matchingRes?.clientTelephone) {
                const phone = Number(matchingRes.clientTelephone);
                const sourceId = Number(ind.sourceId);
                const indId = Number(ind.id);
                
                // Mapper sourceId -> téléphone
                this.clientPhonesMap.set(sourceId, phone);
                // Mapper aussi ind.id -> téléphone (au cas où sourceId = ind.id)
                this.clientPhonesMap.set(indId, phone);
                
                // Fallback: mapper aussi si sourceId n'est pas encore dans la map
                if (!this.clientPhonesMap.has(sourceId)) {
                  this.clientPhonesMap.set(indId, phone);
                }
                
                console.log(`[Mapping indisponibilité] ind.id=${indId}, sourceId=${sourceId} -> téléphone=${phone} (réservation ${matchingRes.id}, date: ${ind.date})`);
              } else if (!matchingRes) {
                // Si pas de réservation trouvée, essayer de trouver par sourceId direct
                const resById = this.reservations.find(res => 
                  res.id === ind.sourceId || 
                  Number(res.id) === Number(ind.sourceId) ||
                  String(res.id) === String(ind.sourceId)
                );
                
                if (resById?.clientTelephone) {
                  const phone = Number(resById.clientTelephone);
                  const sourceId = Number(ind.sourceId);
                  const indId = Number(ind.id);
                  
                  this.clientPhonesMap.set(sourceId, phone);
                  this.clientPhonesMap.set(indId, phone);
                  
                  // Fallback: mapper aussi si sourceId n'est pas encore dans la map
                  if (!this.clientPhonesMap.has(sourceId)) {
                    this.clientPhonesMap.set(indId, phone);
                  }
                  
                  console.log(`[Mapping indisponibilité par ID] ind.id=${indId}, sourceId=${sourceId} -> téléphone=${phone} (réservation ${resById.id}, date: ${ind.date})`);
                } else {
                  // Si toujours pas trouvée, essayer de charger la réservation par ID
                  const sourceIdNum = Number(ind.sourceId);
                  if (sourceIdNum && !isNaN(sourceIdNum)) {
                    console.log(`[Mapping] Tentative de chargement réservation ID=${sourceIdNum} pour indisponibilité ind.id=${ind.id}, date=${ind.date}`);
                    this.reservationService.getReservationById(sourceIdNum).subscribe({
                      next: (res) => {
                        if (res?.clientTelephone) {
                          const phone = Number(res.clientTelephone);
                          const indId = Number(ind.id);
                          
                          // Ajouter à la liste des réservations chargées
                          if (!this.reservations.find(r => r.id === res.id)) {
                            this.reservations.push(res);
                          }
                          
                          // Mapper les IDs
                          this.clientPhonesMap.set(sourceIdNum, phone);
                          this.clientPhonesMap.set(indId, phone);
                          
                          // Mapper aussi l'ID de la réservation
                          if (res.id) {
                            this.clientPhonesMap.set(Number(res.id), phone);
                          }
                          
                          console.log(`[Mapping chargement dynamique] ind.id=${indId}, sourceId=${sourceIdNum} -> téléphone=${phone} (réservation ${res.id}, date: ${ind.date})`);
                          
                          // Reconstruire la grille pour mettre à jour l'affichage
                          this.buildPlanningGrid();
                          this.cdr.detectChanges();
                        }
                      },
                      error: (err) => {
                        console.warn(`[Mapping] Impossible de charger réservation ID=${sourceIdNum}:`, err);
                      }
                    });
                  }
                }
              }
            }
          });
          
          // Le décalage des heures 00:00 se fait dans buildPlanningGrid() uniquement
          // On ne modifie JAMAIS ind.date pour éviter de décaler toute la réservation
          
          this.buildPlanningGrid();
          
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur chargement planning:', error);
          this.notificationService.showError('Erreur lors du chargement du planning');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    };
    
    // Si les données clients ne sont pas encore chargées, les charger d'abord
    if (this.clientPhonesMap.size === 0 && this.clients.length === 0) {
      this.loadClientData().then(() => {
        loadIndisponibles();
      }).catch(() => {
        // Même en cas d'erreur, charger les indisponibilités
        loadIndisponibles();
      });
    } else {
      // Les données clients sont déjà chargées, charger les indisponibilités directement
      loadIndisponibles();
    }
  }

  private generateHours(heureOuverture: string, heureFermeture: string): void {
    this.hours = [];

    if (!heureOuverture || !heureFermeture) {
      heureOuverture = '08:00';
      heureFermeture = '22:00';
    }

    const open = heureOuverture.substring(0, 5);
    const close = heureFermeture.substring(0, 5);

    let [currentHour, currentMin] = open.split(':').map(Number);
    const [endHour, endMin] = close.split(':').map(Number);

    if (isNaN(currentHour) || isNaN(currentMin) || isNaN(endHour) || isNaN(endMin)) {
      console.error('Format d\'heure invalide:', heureOuverture, heureFermeture);
      // Valeurs par défaut
      this.generateHours('08:00', '22:00');
      return;
    }

    let iterations = 0;
    const maxIterations = 24; // sécurité

    while (iterations < maxIterations) {
      // STOP AVANT d'ajouter l'heure de fin (ne pas inclure l'heure de fermeture)
      if (currentHour === endHour && currentMin === endMin) {
        break;
      }

      const hourStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      this.hours.push(hourStr);

      // Avancer d'une heure (gère automatiquement minuit)
      currentHour = (currentHour + 1) % 24;
      currentMin = 0;

      iterations++;
    }

    console.log('Heures générées (final):', this.hours);
  }

  private buildPlanningGrid(): void {
    this.planningGrid.clear();
  
    // 1️⃣ Initialiser la grille vide
    this.daysOfWeek.forEach(day => {
      this.hours.forEach(hour => {
        this.planningGrid.set(this.getSlotKey(day, hour), {
          date: day,
          heure: hour
        });
      });
    });
  
    const terrain = this.terrains.find(t => t.id === this.selectedTerrainId);
    const heureOuverture = terrain?.heureOuverture ?? '08:00';
  
    // 2️⃣ Placement des indisponibilités
    this.indisponibles.forEach(ind => {
      const baseDay = this.daysOfWeek.find(d => this.formatDate(d) === ind.date);
      if (!baseDay) return;

      const [sh, sm] = ind.heureDebut.substring(0, 5).split(':').map(Number);
      const [eh, em] = ind.heureFin.substring(0, 5).split(':').map(Number);
      
      // Convertir en minutes pour gérer le passage de minuit
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const crossesMidnight = endMinutes <= startMinutes;

      this.hours.forEach(hour => {
        const [h, m] = hour.split(':').map(Number);
        let hourMinutes = h * 60 + m;
        
        // Si on traverse minuit, ajuster la comparaison
        let targetStartMinutes = startMinutes;
        let targetEndMinutes = endMinutes;
        
        if (crossesMidnight) {
          // Si l'heure actuelle est après minuit (0-2h), ajouter 24h
          if (h < sh || (h === sh && m < sm)) {
            hourMinutes += 24 * 60;
          }
          targetEndMinutes += 24 * 60;
        }

        // Exclure heure de fin (h < startMinutes OU h >= endMinutes)
        if (hourMinutes < targetStartMinutes || hourMinutes >= targetEndMinutes) {
          return;
        }
  
        let displayDay = baseDay;
  
        // 🔥 SEULE RÈGLE DE DÉCALAGE
        // Comparer en minutes pour éviter les problèmes de comparaison de strings
        // Limiter à 360 minutes (06:00) pour ne décaler que les vraies heures nocturnes
        if (
          ind.typeReservation === 'RESERVATION_PONCTUELLE' &&
          this.toMinutes(hour) < this.toMinutes(heureOuverture) &&
          this.toMinutes(hour) < 360
        ) {
          const prevDay = new Date(baseDay);
          prevDay.setDate(prevDay.getDate() - 1);
  
          const prevDayInWeek = this.daysOfWeek.find(
            d => this.formatDate(d) === this.formatDate(prevDay)
          );
  
          if (prevDayInWeek) {
            displayDay = prevDayInWeek;
          }
        }
  
        const key = this.getSlotKey(displayDay, hour);
        const slot = this.planningGrid.get(key);
        if (slot) {
          slot.indisponible = ind;
          slot.rowSpan = 1;
        }
      });
    });
  
    this.cdr.detectChanges();
  }
  

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private getSlotKey(date: Date, hour: string): string {
    const dateStr = this.formatDate(date);
    return `${dateStr}_${hour}`;
  }

  getSlot(day: Date, hour: string): PlanningSlot | undefined {
    const key = this.getSlotKey(day, hour);
    return this.planningGrid.get(key);
  }

  isSlotOccupied(day: Date, hour: string): boolean {
    const slot = this.getSlot(day, hour);
    return !!slot?.indisponible;
  }

  getSlotType(day: Date, hour: string): TypeReservation | null {
    const slot = this.getSlot(day, hour);
    return slot?.indisponible?.typeReservation || null;
  }

  getSlotDescription(day: Date, hour: string): string {
    const slot = this.getSlot(day, hour);
    return slot?.indisponible?.description || '';
  }

  getFormattedDescription(day: Date, hour: string): string {
    const description = this.getSlotDescription(day, hour);
    if (!description) return '';
    
    // Formater selon le type
    const slot = this.getSlot(day, hour);
    const type = slot?.indisponible?.typeReservation;
    
    if (type === 'ABONNEMENT') {
      // Format: "Abo." ou "اشتراك" sans le jour
      return this.translationService.translate('planning.abonnementShort');
    } else if (type === 'RESERVATION_PONCTUELLE') {
      // Format: "Rés. ponctuelle"
      return this.translationService.translate('planning.reservationShort');
    }
    
    return description;
  }

  getSlotTimeRange(day: Date, hour: string): string {
    const slot = this.getSlot(day, hour);
    if (!slot?.indisponible) return '';
    const start = slot.indisponible.heureDebut.substring(0, 5);
    const end = slot.indisponible.heureFin.substring(0, 5);
    return `${start} - ${end}`;
  }

  getClientPhone(day: Date, hour: string): string {
    const slot = this.getSlot(day, hour);
    if (!slot?.indisponible) return '';
    
    const sourceId = slot.indisponible.sourceId;
    const type = slot.indisponible.typeReservation;
    const indDate = slot.indisponible.date;
    
    // Chercher d'abord dans la map directe (essayer avec sourceId comme number et comme string)
    let phone = this.clientPhonesMap.get(Number(sourceId));
    if (!phone && typeof sourceId === 'string') {
      phone = this.clientPhonesMap.get(Number(sourceId));
    }
    
    if (phone) {
      return phone.toString();
    }
    
    // Si pas trouvé et c'est un abonnement
    if (type === 'ABONNEMENT') {
      // Le sourceId peut être soit l'ID de l'abonnement, soit l'ID de l'horaire
      // Chercher d'abord directement par ID d'abonnement
      let abo = this.abonnements.find(a => a.id === sourceId || Number(a.id) === Number(sourceId));
      
      // Si pas trouvé, chercher via les horaires (sourceId pourrait être l'ID de l'horaire)
      if (!abo) {
        // Chercher dans tous les abonnements pour trouver celui qui contient un horaire avec ce sourceId
        for (const abonnement of this.abonnements) {
          if (abonnement.horaires && abonnement.horaires.some(h => h.id === sourceId || Number(h.id) === Number(sourceId))) {
            abo = abonnement;
            break;
          }
        }
      }
      
      if (abo) {
        // Essayer clientTelephone direct d'abord
        if (abo.clientTelephone) {
          phone = abo.clientTelephone;
          // Mettre en cache pour ce sourceId ET pour l'ID de l'abonnement
          this.clientPhonesMap.set(Number(sourceId), phone);
          if (abo.id && Number(abo.id) !== Number(sourceId)) {
            this.clientPhonesMap.set(Number(abo.id), phone);
          }
          return phone.toString();
        }
        
        // Si pas de clientTelephone direct, chercher via clientId
        if (abo.clientId) {
          phone = this.clientIdToPhoneMap.get(abo.clientId);
          if (phone) {
            // Mettre en cache pour ce sourceId ET pour l'ID de l'abonnement
            this.clientPhonesMap.set(Number(sourceId), phone);
            if (abo.id && Number(abo.id) !== Number(sourceId)) {
              this.clientPhonesMap.set(Number(abo.id), phone);
            }
            return phone.toString();
          }
        }
      }
    }
    
    // Pour les réservations ponctuelles (toutes, y compris passées)
    if (type === 'RESERVATION_PONCTUELLE') {
      // Chercher la réservation par sourceId (essayer différentes conversions)
      let res = this.reservations.find(r => 
        r.id === sourceId || 
        Number(r.id) === Number(sourceId) ||
        String(r.id) === String(sourceId)
      );
      
      if (res) {
        // Prioriser clientTelephone direct
        if (res.clientTelephone) {
          phone = res.clientTelephone;
          // Mapper avec sourceId en tant que number pour garantir la correspondance
          this.clientPhonesMap.set(Number(sourceId), phone);
          console.log(`[getClientPhone] Réservation ponctuelle ${sourceId} (date: ${indDate}) -> Téléphone:`, phone);
          return phone.toString();
        } else {
          console.warn(`[getClientPhone] Réservation ${sourceId} trouvée mais sans clientTelephone (date: ${indDate})`);
        }
      } else {
        // Si pas trouvée, logger pour déboguer
        const sourceIdNum = Number(sourceId);
        if (sourceIdNum && !isNaN(sourceIdNum) && sourceIdNum > 0) {
          console.log(`[getClientPhone] Tentative chargement réservation ID=${sourceIdNum} (date: ${indDate})`);
          console.warn(`[getClientPhone] Réservation ponctuelle sourceId=${sourceId} (date: ${indDate}) non trouvée dans ${this.reservations.length} réservations chargées. IDs chargés:`, this.reservations.map(r => r.id));
        } else {
          console.warn(`[getClientPhone] sourceId invalide: ${sourceId} (type: ${typeof sourceId})`);
        }
      }
    }
    
    // Fallback ultime pour réservations passées: chercher par ind.id
    if (slot?.indisponible?.id) {
      const byIndId = this.clientPhonesMap.get(Number(slot.indisponible.id));
      if (byIndId) {
        console.log(`[getClientPhone] Fallback: trouvé par ind.id=${slot.indisponible.id} -> téléphone=${byIndId}`);
        return byIndId.toString();
      }
    }
    
    return '';
  }

  isFirstHourOfSlot(day: Date, hour: string): boolean {
    const slot = this.getSlot(day, hour);
    if (!slot?.indisponible) return false;
    
    // Vérifier si c'est la première heure du créneau
    const [h, m] = hour.split(':').map(Number);
    const [startH, startM] = slot.indisponible.heureDebut.substring(0, 5).split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const currentTotalMinutes = h * 60 + m;
    
    return currentTotalMinutes === startTotalMinutes;
  }

  shouldShowSlot(day: Date, hour: string): boolean {
    const slot = this.getSlot(day, hour);
    if (!slot?.indisponible) {
      return false;
    }
    // Toujours afficher la première heure, même passée
    return this.isFirstHourOfSlot(day, hour);
  }

  getSlotRowSpan(day: Date, hour: string): number {
    const slot = this.getSlot(day, hour);
    return slot?.rowSpan || 1;
  }

  getTypeClass(type: TypeReservation | null, day: Date, hour: string): string {
    // Vérifier si le créneau est dans le passé
    const isPast = this.isSlotInPast(day, hour);
    
    if (isPast) {
      // Tous les créneaux passés en gris (sans opacity pour meilleure lisibilité)
      return 'bg-gray-200 border-gray-400 text-gray-800';
    }
    
    // Couleurs normales pour les créneaux futurs
    switch (type) {
      case 'ABONNEMENT':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'RESERVATION_PONCTUELLE':
        return 'bg-cyan-100 border-cyan-300 text-cyan-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  }

  isSlotInPast(day: Date, hour: string): boolean {
    const slot = this.getSlot(day, hour);
    
    // Utiliser la date originale de l'indisponible (ind.date) pour déterminer si c'est passé
    // Pas la date d'affichage (day) qui peut être décalée pour les heures 00:00
    const dateAComparer = slot?.indisponible?.date 
      ? new Date(slot.indisponible.date)
      : new Date(day);
    
    const now = new Date();
    
    // Extraire l'heure du créneau (ex: "10:00")
    const [hourStr, minStr] = hour.split(':');
    const slotHour = parseInt(hourStr, 10);
    const slotMin = parseInt(minStr, 10);
    
    // Créer la date/heure du début du slot avec la date originale de la base de données
    dateAComparer.setHours(slotHour, slotMin, 0, 0);
    
    // Créer la date/heure de fin du slot (ex: 10:59:59)
    // Une heure est passée si l'heure suivante complète est atteinte
    // Par exemple, 10h est passée seulement à partir de 11h00
    const heureSuivante = new Date(dateAComparer);
    heureSuivante.setHours(slotHour + 1, 0, 0, 0);
    
    // Si l'heure suivante est passée, alors le slot actuel est passé
    return heureSuivante <= now;
  }

  previousWeek(): void {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.updateDaysOfWeek();
    this.loadPlanning();
  }

  nextWeek(): void {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.updateDaysOfWeek();
    this.loadPlanning();
  }

  goToCurrentWeek(): void {
    this.initializeWeek();
    this.loadPlanning();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const monthKeys = ['months.jan', 'months.feb', 'months.mar', 'months.apr', 'months.may', 'months.jun',
                       'months.jul', 'months.aug', 'months.sep', 'months.oct', 'months.nov', 'months.dec'];
    const month = this.translationService.translate(monthKeys[date.getMonth()]);
    return `${day} ${month}`;
  }

  getWeekRange(): string {
    const start = this.formatDateDisplay(this.daysOfWeek[0]);
    const end = this.formatDateDisplay(this.daysOfWeek[6]);
    const year = this.daysOfWeek[0].getFullYear();
    return `${start} - ${end} ${year}`;
  }

  getDayName(date: Date): string {
    const dayIndex = date.getDay();
    // JavaScript: 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    // Mais le planning commence par Lundi, donc on ajuste
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    const dayKeys = ['days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday', 'days.sunday'];
    return this.translationService.translate(dayKeys[adjustedIndex]);
  }
}
