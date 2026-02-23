import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProprietaireService } from '../../../core/services/proprietaire.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ProprietaireDTO, UpdatePasswordRequestDTO } from '../../../core/models/proprietaire.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profil-proprietaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './profil-proprietaire.component.html',
  styleUrls: ['./profil-proprietaire.component.css']
})
export class ProfilProprietaireComponent implements OnInit {
  passwordForm!: FormGroup;
  currentUser: ProprietaireDTO | null = null;
  isLoading = false;
  isLoadingPassword = false;
  errorMessage = '';
  passwordErrorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private proprietaireService: ProprietaireService,
    private notificationService: NotificationService,
    private translationService: TranslationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadProfil();
  }

  private initForms(): void {
    this.passwordForm = this.fb.group({
      motDePasse: ['', Validators.required],
      newMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmMotDePasse: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const newPassword = group.get('newMotDePasse')?.value;
    const confirmPassword = group.get('confirmMotDePasse')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private loadProfil(): void {
    const user = this.authService.getCurrentUser();
    
    if (user?.id) {
      // Utiliser directement les données de l'utilisateur connecté pour un chargement instantané
      this.currentUser = {
        id: user.id,
        nom: user.nom || '',
        prenom: user.prenom || '',
        telephone: user.telephone,
        isActive: user.isActive,
        terrainIds: user.terrainIds
      };
      this.isLoading = false;
      
      // Optionnel : Charger les données complètes en arrière-plan pour mettre à jour si nécessaire
      this.proprietaireService.getProfile(user.id).subscribe({
        next: (profil) => {
          // Mettre à jour avec les données complètes du serveur
          this.currentUser = profil;
        },
        error: (error) => {
          // En cas d'erreur, on garde les données de l'utilisateur connecté
          console.warn('Impossible de charger le profil complet:', error);
        }
      });
    } else {
      console.error('Aucun ID utilisateur trouvé');
      this.errorMessage = this.translationService.translate('profil.loadError');
      this.notificationService.showError(this.errorMessage);
      this.isLoading = false;
    }
  }

  onUpdatePassword(): void {
    if (this.passwordForm.invalid || !this.currentUser?.id) {
      this.markFormGroupTouched(this.passwordForm);
      if (this.passwordForm.hasError('passwordMismatch')) {
        this.passwordErrorMessage = this.translationService.translate('profil.passwordMismatch');
      }
      return;
    }

    this.isLoadingPassword = true;
    this.passwordErrorMessage = '';

    const formValue = this.passwordForm.value;
    const request: UpdatePasswordRequestDTO = {
      motDePasse: formValue.motDePasse,
      newMotDePasse: formValue.newMotDePasse
    };

    this.proprietaireService.updateMotPasseProprietaire(this.currentUser.id, request).subscribe({
      next: () => {
        this.isLoadingPassword = false;
        this.passwordForm.reset();
        this.notificationService.showSuccess(this.translationService.translate('profil.passwordUpdatedSuccess'));
        
        // Déconnexion automatique après modification du mot de passe
        setTimeout(() => {
          this.authService.logout();
          this.router.navigate(['/login']);
        }, 1500); // Attendre 1.5 secondes pour que l'utilisateur voie le message de succès
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingPassword = false;
        this.passwordErrorMessage = this.extractPasswordErrorMessage(error);
        this.notificationService.showError(this.passwordErrorMessage);
      }
    });
  }

  private extractPasswordErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 400 || error.status === 401) {
      return this.translationService.translate('profil.invalidCurrentPassword');
    }
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error) {
      return error.error.error;
    }
    return this.translationService.translate('profil.passwordUpdateError');
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return this.translationService.translate('profil.fieldRequired');
    }
    if (field?.hasError('pattern') && field.touched) {
      return this.translationService.translate('profil.fieldInvalidFormat');
    }
    if (field?.hasError('minlength') && field.touched) {
      return this.translationService.translate('profil.passwordMinLength');
    }
    return '';
  }

  getPasswordMatchError(): string {
    if (this.passwordForm.hasError('passwordMismatch') && this.passwordForm.get('confirmMotDePasse')?.touched) {
      return this.translationService.translate('profil.passwordMismatch');
    }
    return '';
  }
}
