import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Language = 'fr' | 'ar';

export interface Translations {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguage$ = new BehaviorSubject<Language>('fr');
  private translations: { [lang in Language]: Translations } = {
    fr: {},
    ar: {}
  };

  constructor() {
    this.loadTranslations();
    // Charger la langue depuis le localStorage ou utiliser 'fr' par défaut
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'fr' || savedLang === 'ar')) {
      this.setLanguage(savedLang);
    } else {
      this.setLanguage('fr');
    }
  }

  private loadTranslations(): void {
    // Traductions françaises
    this.translations.fr = {
      // Dashboard
      'dashboard.welcome': 'Bonjour',
      'dashboard.abonnementsActifs': 'Abonnements Actifs',
      'dashboard.reservationsAujourdhui': 'Réservations Aujourd\'hui',
      'dashboard.revenuAbonnements': 'Revenu Abonnements',
      'dashboard.revenuReservationsAujourdhui': 'Revenu Réservations Aujourd\'hui',
      'dashboard.reservationsHier': 'Réservations Hier',
      'dashboard.revenuReservationsHier': 'Revenu Réservations Hier',
      'dashboard.loading': 'Chargement...',
      
      // Planning
      'planning.title': 'Planning hebdomadaire',
      'planning.subtitle': 'Vue d\'ensemble des créneaux réservés',
      'planning.legend.abonnement': 'Abonnement',
      'planning.legend.reservation': 'Réservation',
      'planning.legend.indisponible': 'Indisponible',
      'planning.terrain': 'Terrain',
      'planning.noHours': 'Aucune heure configurée pour ce terrain',
      'planning.time': 'Heure',
      'planning.reservationShort': 'Réserve ponctuelle',
      'planning.abonnementShort': 'Abonnement',
      
      // Sidebar
      'sidebar.dashboard': 'Tableau de bord',
      'sidebar.planning': 'Planning',
      'sidebar.terrains': 'Terrains',
      'sidebar.demandes': 'Demandes',
      'sidebar.clients': 'Clients',
      'sidebar.abonnements': 'Abonnements',
      
      // Common
      'common.add': 'Ajouter',
      'common.edit': 'Modifier',
      'common.delete': 'Supprimer',
      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.confirmDelete': 'Confirmer la suppression',
      'common.deleteConfirmDefault': 'Êtes-vous sûr de vouloir supprimer cet élément ?',
      'common.search': 'Rechercher',
      'common.phone': 'Téléphone',
      'common.date': 'Date',
      'common.time': 'Heure',
      'common.actions': 'Actions',
      'common.confirm': 'Confirmer',
      'common.yes': 'Oui',
      'common.no': 'Non',
      'common.mru': 'MRU',
      'common.logout': 'Déconnexion',
      
      // Abonnements
      'abonnement.title': 'Abonnements',
      'abonnement.new': 'Nouvel Abonnement',
      'abonnement.modifyTitle': 'Modifier l\'Abonnement',
      'abonnement.period': 'Période',
      'abonnement.schedules': 'Horaires',
      'abonnement.phone': 'Numéro de téléphone',
      'abonnement.totalPrice': 'Prix Total',
      'abonnement.status': 'Statut',
      'abonnement.active': 'ACTIF',
      'abonnement.inactive': 'INACTIF',
      'status.ACTIF': 'ACTIF',
      'status.SUSPENDU': 'SUSPENDU',
      'status.TERMINE': 'TERMINE',
      'abonnement.noFound': 'Aucun abonnement trouvé',
      'abonnement.clientPhone': 'Téléphone du client',
      'abonnement.startDate': 'Date de début',
      'abonnement.endDate': 'Date de fin',
      'abonnement.addSchedule': 'Ajouter un horaire',
      'abonnement.schedule': 'Horaire',
      'abonnement.dayOfWeek': 'Jour de la semaine',
      'abonnement.startTime': 'Heure de début',
      'abonnement.pricePerHour': 'Prix / heure',
      'abonnement.select': 'Sélectionner',
      'abonnement.noSchedule': 'Aucun horaire ajouté. Cliquez sur "+ Ajouter un horaire" pour commencer.',
      'abonnement.terrain': 'Terrain',
      'abonnement.selectTerrain': 'Sélectionner un terrain',
      'abonnement.create': 'Créer',
      'abonnement.creating': 'Création...',
      'abonnement.modify': 'Modifier',
      'abonnement.modifying': 'Modification...',
      'abonnement.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer cet abonnement ?',
      'abonnement.deleteScheduleConfirm': 'Êtes-vous sûr de vouloir supprimer cet horaire ?',
      'abonnement.deleteScheduleConfirmWithDetails': 'Êtes-vous sûr de vouloir supprimer l\'horaire',
      'abonnement.at': 'à',
      'abonnement.addAtLeastOneSchedule': 'Veuillez ajouter au moins un horaire',
      
      // Clients
      'client.title': 'Clients',
      'client.new': 'Nouveau Client',
      'client.modify': 'Modifier le Client',
      'client.name': 'Nom',
      'client.firstName': 'Prénom',
      'client.phone': 'Téléphone',
      'client.noFound': 'Aucun client trouvé',
      'client.searchPlaceholder': 'Rechercher par nom, prénom ou téléphone...',
      'client.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer ce client ?',
      'client.search': 'Rechercher',
      'client.actions': 'Actions',
      'client.modifyButton': 'Modifier',
      'client.deleteButton': 'Supprimer',
      'client.create': 'Créer',
      'client.creating': 'Création...',
      'client.modifyButtonText': 'Modifier',
      'client.modifying': 'Modification...',
      'client.cancel': 'Annuler',
      'client.fieldRequired': 'Ce champ est requis',
      'client.fieldMinLength': 'Ce champ doit contenir au moins 2 caractères',
      'client.fieldInvalidFormat': 'Format invalide',
      'client.fillAllFields': 'Veuillez remplir tous les champs requis correctement.',
      'client.createdSuccess': 'Client créé avec succès',
      'client.modifiedSuccess': 'Client modifié avec succès',
      'client.deletedSuccess': 'Client supprimé avec succès',
      'client.loadError': 'Erreur lors du chargement des clients',
      'client.deleteError': 'Erreur lors de la suppression du client',
      'client.phonePlaceholder': 'Ex: 12345678',
      'client.namePlaceholder': 'Ex: Diallo',
      'client.firstNamePlaceholder': 'Ex: Amadou',
      
      // Terrains
      'terrain.title': 'Terrains',
      'terrain.new': 'Nouveau Terrain',
      'terrain.modify': 'Modifier Terrain',
      'terrain.name': 'Nom',
      'terrain.address': 'Adresse',
      'terrain.openingTime': 'Heure Ouverture',
      'terrain.closingTime': 'Heure Fermeture',
      'terrain.noFound': 'Aucun terrain trouvé',
      'terrain.searchPlaceholder': 'Rechercher par nom ou adresse...',
      'terrain.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer ce terrain ?',
      'terrain.schedules': 'Horaires',
      'terrain.search': 'Rechercher',
      'terrain.actions': 'Actions',
      'terrain.modifyButton': 'Modifier',
      'terrain.deleteButton': 'Supprimer',
      'terrain.loadError': 'Erreur lors du chargement des terrains',
      'terrain.deletedSuccess': 'Terrain supprimé avec succès',
      'terrain.deleteError': 'Erreur lors de la suppression du terrain',
      'terrain.create': 'Créer',
      'terrain.creating': 'Création...',
      'terrain.modifyButtonText': 'Modifier',
      'terrain.modifying': 'Modification...',
      'terrain.cancel': 'Annuler',
      'terrain.fieldRequired': 'Ce champ est requis',
      'terrain.nameMinLength': 'Le nom doit contenir au moins 2 caractères',
      'terrain.addressMinLength': 'L\'adresse doit contenir au moins 5 caractères',
      'terrain.fieldInvalidFormat': 'Format invalide (HH:mm)',
      'terrain.fillAllFields': 'Veuillez remplir tous les champs requis correctement.',
      'terrain.createdSuccess': 'Terrain créé avec succès',
      'terrain.modifiedSuccess': 'Terrain modifié avec succès',
      'terrain.closingAfterOpening': 'L\'heure de fermeture doit être après l\'heure d\'ouverture',
      'terrain.userNotAuthenticated': 'Utilisateur non authentifié',
      'terrain.namePlaceholder': 'Ex: Terrain Central',
      'terrain.addressPlaceholder': 'Ex: 123 Rue Example, Ville',
      
      // Réservations
      'reservation.title': 'Réservations Ponctuelles',
      'reservation.new': 'Nouvelle Réservation',
      'reservation.modify': 'Modifier la réservation',
      'reservation.add': 'Ajouter',
      'reservation.searchPlaceholder': 'Rechercher par téléphone client',
      'reservation.searchLabel': 'Rechercher par téléphone client',
      'reservation.phonePlaceholder': 'Votre NumTéléphone',
      'reservation.noFound': 'Aucune réservation trouvée',
      'reservation.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
      'reservation.date': 'Date',
      'reservation.time': 'Horaire',
      'reservation.client': 'Client',
      'reservation.price': 'Prix',
      'reservation.actions': 'Actions',
      'reservation.modifyButton': 'Modifier',
      'reservation.deleteButton': 'Supprimer',
      'reservation.deletedSuccess': 'Réservation supprimée avec succès',
      'reservation.deleteError': 'Erreur lors de la suppression de la réservation',
      'reservation.loadError': 'Erreur lors du chargement des réservations',
      'reservation.terrain': 'Terrain',
      'reservation.selectTerrain': 'Sélectionner un terrain',
      'reservation.startTime': 'Heure de début',
      'reservation.clientPhone': 'Téléphone du client',
      'reservation.phonePlaceholderInput': 'Ex: 12345678',
      'reservation.pricePlaceholder': 'Ex: 100',
      'reservation.addButton': 'Ajouter',
      'reservation.modifyButtonText': 'Modifier',
      'reservation.loading': 'Chargement...',
      'reservation.createdSuccess': 'Réservation créée avec succès',
      'reservation.modifiedSuccess': 'Réservation modifiée avec succès',
      'reservation.fieldRequired': 'Ce champ est requis',
      'reservation.fieldInvalidFormat': 'Format invalide',
      'reservation.minValue': 'La valeur doit être supérieure ou égale à 0',
      'reservation.userNotConnected': 'Utilisateur non connecté',
      'reservation.noTerrainAssociated': 'Aucun terrain associé à votre compte',
      'reservation.noTerrainFound': 'Aucun terrain trouvé pour les IDs associés à votre compte',
      'reservation.terrainLoadError': 'Erreur lors du chargement des terrains',
      
      // Jours de la semaine
      'days.monday': 'Lundi',
      'days.tuesday': 'Mardi',
      'days.wednesday': 'Mercredi',
      'days.thursday': 'Jeudi',
      'days.friday': 'Vendredi',
      'days.saturday': 'Samedi',
      'days.sunday': 'Dimanche',
      'days.LUNDI': 'Lundi',
      'days.MARDI': 'Mardi',
      'days.MERCREDI': 'Mercredi',
      'days.JEUDI': 'Jeudi',
      'days.VENDREDI': 'Vendredi',
      'days.SAMEDI': 'Samedi',
      'days.DIMANCHE': 'Dimanche',
      
      // Mois (abrégés)
      'months.jan': 'janv.',
      'months.feb': 'févr.',
      'months.mar': 'mars',
      'months.apr': 'avr.',
      'months.may': 'mai',
      'months.jun': 'juin',
      'months.jul': 'juil.',
      'months.aug': 'août',
      'months.sep': 'sept.',
      'months.oct': 'oct.',
      'months.nov': 'nov.',
      'months.dec': 'déc.',
      
      // Placeholders
      'placeholder.phoneExample': 'Ex: 12345678',
      'placeholder.dateFormat': 'jj/mm/aaaa',
      'placeholder.searchClientPhone': 'Votre NumTel Client',
      'placeholder.priceExample': 'Ex: 50'
    };

    // Traductions arabes
    this.translations.ar = {
      // Dashboard
      'dashboard.welcome': 'مرحبا',
      'dashboard.abonnementsActifs': 'الاشتراكات النشطة',
      'dashboard.reservationsAujourdhui': 'الحجوزات اليوم',
      'dashboard.revenuAbonnements': 'إيرادات الاشتراكات',
      'dashboard.revenuReservationsAujourdhui': 'إيرادات الحجوزات اليوم',
      'dashboard.reservationsHier': 'الحجوزات أمس',
      'dashboard.revenuReservationsHier': 'إيرادات الحجوزات أمس',
      'dashboard.loading': 'جاري التحميل...',
      
      // Planning
      'planning.title': 'الجدول الأسبوعي',
      'planning.subtitle': 'نظرة عامة على الأوقات المحجوزة',
      'planning.legend.abonnement': 'اشتراك',
      'planning.legend.reservation': 'حجز',
      'planning.legend.indisponible': 'غير متاح',
      'planning.terrain': 'الملعب',
      'planning.noHours': 'لا توجد ساعات محددة لهذا الملعب',
      'planning.time': 'الوقت',
      'planning.reservationShort': 'حجز فردي',
      'planning.abonnementShort': 'اشتراك',
      
      // Sidebar
      'sidebar.dashboard': 'لوحة التحكم',
      'sidebar.planning': 'الجدول',
      'sidebar.terrains': 'الملاعب',
      'sidebar.demandes': 'الطلبات',
      'sidebar.clients': 'العملاء',
      'sidebar.abonnements': 'الاشتراكات',
      
      // Common
      'common.add': 'إضافة',
      'common.edit': 'تعديل',
      'common.delete': 'حذف',
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.confirmDelete': 'تأكيد الحذف',
      'common.deleteConfirmDefault': 'هل أنت متأكد من حذف هذا العنصر؟',
      'common.search': 'بحث',
      'common.phone': 'الهاتف',
      'common.date': 'التاريخ',
      'common.time': 'الوقت',
      'common.actions': 'الإجراءات',
      'common.confirm': 'تأكيد',
      'common.yes': 'نعم',
      'common.no': 'لا',
      'common.mru': 'أوقية',
      'common.logout': 'تسجيل الخروج',
      
      // Abonnements
      'abonnement.title': 'الاشتراكات',
      'abonnement.new': 'اشتراك جديد',
      'abonnement.modifyTitle': 'تعديل الاشتراك',
      'abonnement.period': 'الفترة',
      'abonnement.schedules': 'المواعيد',
      'abonnement.phone': 'رقم الهاتف',
      'abonnement.totalPrice': 'السعر الإجمالي',
      'abonnement.status': 'الحالة',
      'abonnement.active': 'نشط',
      'abonnement.inactive': 'غير نشط',
      'abonnement.noFound': 'لم يتم العثور على اشتراكات',
      'abonnement.clientPhone': 'هاتف العميل',
      'abonnement.startDate': 'تاريخ البداية',
      'abonnement.endDate': 'تاريخ النهاية',
      'abonnement.addSchedule': 'إضافة موعد',
      'abonnement.schedule': 'الموعد',
      'abonnement.dayOfWeek': 'يوم الأسبوع',
      'abonnement.startTime': 'ساعة البداية',
      'abonnement.pricePerHour': 'السعر / ساعة',
      'abonnement.select': 'اختر',
      'abonnement.noSchedule': 'لم تتم إضافة أي موعد. انقر على "+ إضافة موعد" للبدء.',
      'abonnement.terrain': 'الملعب',
      'abonnement.selectTerrain': 'اختر ملعب',
      'abonnement.create': 'إنشاء',
      'abonnement.creating': 'جاري الإنشاء...',
      'abonnement.modify': 'تعديل',
      'abonnement.modifying': 'جاري التعديل...',
      'abonnement.deleteConfirm': 'هل أنت متأكد من حذف هذا الاشتراك؟',
      'abonnement.deleteScheduleConfirm': 'هل أنت متأكد من حذف هذا الموعد؟',
      'abonnement.deleteScheduleConfirmWithDetails': 'هل أنت متأكد من حذف الموعد',
      'abonnement.at': 'في',
      'abonnement.addAtLeastOneSchedule': 'يرجى إضافة موعد واحد على الأقل',
      'abonnement.selectStatus': 'اختر الحالة',
      'status.ACTIF': 'نشط',
      'status.SUSPENDU': 'معلق',
      'status.TERMINE': 'منتهي',
      
      // Clients
      'client.title': 'العملاء',
      'client.new': 'عميل جديد',
      'client.modify': 'تعديل العميل',
      'client.name': 'الاسم',
      'client.firstName': 'الاسم الأول',
      'client.phone': 'الهاتف',
      'client.noFound': 'لم يتم العثور على عملاء',
      'client.searchPlaceholder': 'البحث بالاسم أو الاسم الأول أو الهاتف...',
      'client.deleteConfirm': 'هل أنت متأكد من حذف هذا العميل؟',
      'client.search': 'بحث',
      'client.actions': 'الإجراءات',
      'client.modifyButton': 'تعديل',
      'client.deleteButton': 'حذف',
      'client.create': 'إنشاء',
      'client.creating': 'جاري الإنشاء...',
      'client.modifyButtonText': 'تعديل',
      'client.modifying': 'جاري التعديل...',
      'client.cancel': 'إلغاء',
      'client.fieldRequired': 'هذا الحقل مطلوب',
      'client.fieldMinLength': 'يجب أن يحتوي هذا الحقل على حرفين على الأقل',
      'client.fieldInvalidFormat': 'تنسيق غير صالح',
      'client.fillAllFields': 'يرجى ملء جميع الحقول المطلوبة بشكل صحيح.',
      'client.createdSuccess': 'تم إنشاء العميل بنجاح',
      'client.modifiedSuccess': 'تم تعديل العميل بنجاح',
      'client.deletedSuccess': 'تم حذف العميل بنجاح',
      'client.loadError': 'خطأ في تحميل العملاء',
      'client.deleteError': 'خطأ في حذف العميل',
      'client.phonePlaceholder': 'مثال: 12345678',
      'client.namePlaceholder': 'مثال: ديلو',
      'client.firstNamePlaceholder': 'مثال: أمادو',
      
      // Terrains
      'terrain.title': 'الملاعب',
      'terrain.new': 'ملعب جديد',
      'terrain.modify': 'تعديل الملعب',
      'terrain.name': 'الاسم',
      'terrain.address': 'العنوان',
      'terrain.openingTime': 'ساعة الافتتاح',
      'terrain.closingTime': 'ساعة الإغلاق',
      'terrain.noFound': 'لم يتم العثور على ملاعب',
      'terrain.searchPlaceholder': 'البحث بالاسم أو العنوان...',
      'terrain.deleteConfirm': 'هل أنت متأكد من حذف هذا الملعب؟',
      'terrain.schedules': 'المواعيد',
      'terrain.search': 'بحث',
      'terrain.actions': 'الإجراءات',
      'terrain.modifyButton': 'تعديل',
      'terrain.deleteButton': 'حذف',
      'terrain.loadError': 'خطأ في تحميل الملاعب',
      'terrain.deletedSuccess': 'تم حذف الملعب بنجاح',
      'terrain.deleteError': 'خطأ في حذف الملعب',
      'terrain.create': 'إنشاء',
      'terrain.creating': 'جاري الإنشاء...',
      'terrain.modifyButtonText': 'تعديل',
      'terrain.modifying': 'جاري التعديل...',
      'terrain.cancel': 'إلغاء',
      'terrain.fieldRequired': 'هذا الحقل مطلوب',
      'terrain.nameMinLength': 'يجب أن يحتوي الاسم على حرفين على الأقل',
      'terrain.addressMinLength': 'يجب أن تحتوي العنوان على 5 أحرف على الأقل',
      'terrain.fieldInvalidFormat': 'تنسيق غير صالح (ساعة:دقيقة)',
      'terrain.fillAllFields': 'يرجى ملء جميع الحقول المطلوبة بشكل صحيح.',
      'terrain.createdSuccess': 'تم إنشاء الملعب بنجاح',
      'terrain.modifiedSuccess': 'تم تعديل الملعب بنجاح',
      'terrain.closingAfterOpening': 'يجب أن تكون ساعة الإغلاق بعد ساعة الافتتاح',
      'terrain.userNotAuthenticated': 'المستخدم غير مصادق عليه',
      'terrain.namePlaceholder': 'مثال: الملعب المركزي',
      'terrain.addressPlaceholder': 'مثال: 123 شارع المثال، المدينة',
      
      // Réservations
      'reservation.title': 'الحجوزات الفردية',
      'reservation.new': 'حجز جديد',
      'reservation.modify': 'تعديل الحجز',
      'reservation.add': 'إضافة',
      'reservation.searchPlaceholder': 'البحث برقم هاتف العميل',
      'reservation.searchLabel': 'البحث برقم هاتف العميل',
      'reservation.phonePlaceholder': 'رقم هاتفك',
      'reservation.noFound': 'لم يتم العثور على حجوزات',
      'reservation.deleteConfirm': 'هل أنت متأكد من حذف هذا الحجز؟',
      'reservation.date': 'التاريخ',
      'reservation.time': 'الوقت',
      'reservation.client': 'العميل',
      'reservation.price': 'السعر',
      'reservation.actions': 'الإجراءات',
      'reservation.modifyButton': 'تعديل',
      'reservation.deleteButton': 'حذف',
      'reservation.deletedSuccess': 'تم حذف الحجز بنجاح',
      'reservation.deleteError': 'خطأ في حذف الحجز',
      'reservation.loadError': 'خطأ في تحميل الحجوزات',
      'reservation.terrain': 'الملعب',
      'reservation.selectTerrain': 'اختر ملعب',
      'reservation.startTime': 'ساعة البداية',
      'reservation.clientPhone': 'هاتف العميل',
      'reservation.phonePlaceholderInput': 'مثال: 12345678',
      'reservation.pricePlaceholder': 'مثال: 100',
      'reservation.addButton': 'إضافة',
      'reservation.modifyButtonText': 'تعديل',
      'reservation.loading': 'جاري التحميل...',
      'reservation.createdSuccess': 'تم إنشاء الحجز بنجاح',
      'reservation.modifiedSuccess': 'تم تعديل الحجز بنجاح',
      'reservation.fieldRequired': 'هذا الحقل مطلوب',
      'reservation.fieldInvalidFormat': 'تنسيق غير صالح',
      'reservation.minValue': 'يجب أن تكون القيمة أكبر من أو تساوي 0',
      'reservation.userNotConnected': 'المستخدم غير متصل',
      'reservation.noTerrainAssociated': 'لا يوجد ملعب مرتبط بحسابك',
      'reservation.noTerrainFound': 'لم يتم العثور على ملعب للأرقام المرتبطة بحسابك',
      'reservation.terrainLoadError': 'خطأ في تحميل الملاعب',
      
      // Jours de la semaine
      'days.monday': 'الاثنين',
      'days.tuesday': 'الثلاثاء',
      'days.wednesday': 'الأربعاء',
      'days.thursday': 'الخميس',
      'days.friday': 'الجمعة',
      'days.saturday': 'السبت',
      'days.sunday': 'الأحد',
      'days.LUNDI': 'الاثنين',
      'days.MARDI': 'الثلاثاء',
      'days.MERCREDI': 'الأربعاء',
      'days.JEUDI': 'الخميس',
      'days.VENDREDI': 'الجمعة',
      'days.SAMEDI': 'السبت',
      'days.DIMANCHE': 'الأحد',
      
      // Mois (abrégés)
      'months.jan': 'يناير',
      'months.feb': 'فبراير',
      'months.mar': 'مارس',
      'months.apr': 'أبريل',
      'months.may': 'مايو',
      'months.jun': 'يونيو',
      'months.jul': 'يوليو',
      'months.aug': 'أغسطس',
      'months.sep': 'سبتمبر',
      'months.oct': 'أكتوبر',
      'months.nov': 'نوفمبر',
      'months.dec': 'ديسمبر',
      
      // Placeholders
      'placeholder.phoneExample': 'مثال: 12345678',
      'placeholder.dateFormat': 'يوم/شهر/سنة',
      'placeholder.searchClientPhone': 'رقم هاتف العميل',
      'placeholder.priceExample': 'مثال: 50'
    };
  }

  getCurrentLanguage(): Observable<Language> {
    return this.currentLanguage$.asObservable();
  }

  getCurrentLanguageValue(): Language {
    return this.currentLanguage$.value;
  }

  setLanguage(lang: Language): void {
    this.currentLanguage$.next(lang);
    localStorage.setItem('language', lang);
    // Appliquer la direction RTL pour l'arabe
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  translate(key: string): string {
    const lang = this.currentLanguage$.value;
    return this.translations[lang][key] || key;
  }

  getDirection(): 'rtl' | 'ltr' {
    return this.currentLanguage$.value === 'ar' ? 'rtl' : 'ltr';
  }

  isRTL(): boolean {
    return this.currentLanguage$.value === 'ar';
  }
}
