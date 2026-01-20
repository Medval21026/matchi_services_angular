import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientAbonneService } from '../../../core/services/client-abonne.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ClientAbonneDTO } from '../../../core/models/client.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-ajouter-client-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './ajouter-client-modal.component.html',
  styleUrls: ['./ajouter-client-modal.component.css']
})
export class AjouterClientModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  clientForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private clientService: ClientAbonneService,
    private notificationService: NotificationService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.clientForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
    });
  }

  closeModal(): void {
    this.close.emit();
    this.clientForm.reset();
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.markFormGroupTouched(this.clientForm);
      this.errorMessage = this.translationService.translate('client.fillAllFields');
      this.notificationService.showWarning(this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.clientForm.value;
    const client: ClientAbonneDTO = {
      nom: formValue.nom.trim(),
      prenom: formValue.prenom.trim(),
      telephone: Number(formValue.telephone)
    };

    this.clientService.createClient(client).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.showSuccess(this.translationService.translate('client.createdSuccess'));
        this.saved.emit();
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(error);
        this.notificationService.showError(this.errorMessage);
        console.error('Erreur de création:', error);
      }
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return `Erreur client: ${error.error.message}`;
    } else if (error.status === 0) {
      return 'Erreur de connexion: Le serveur backend est inaccessible.';
    } else {
      let backendMessage = 'Une erreur inattendue est survenue.';
      if (error.error && typeof error.error === 'string') {
        backendMessage = error.error;
      } else if (error.error && error.error.message) {
        backendMessage = error.error.message;
      }

      switch (error.status) {
        case 400:
          return `Données invalides: ${backendMessage}`;
        case 401:
          return 'Non autorisé: Votre session a expiré.';
        case 409:
          return `Conflit: ${backendMessage}. Un client avec ce numéro de téléphone existe peut-être déjà.`;
        case 500:
          return `Erreur serveur: ${backendMessage}`;
        default:
          return `Erreur lors de la création du client (Code: ${error.status}). ${backendMessage}`;
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return this.translationService.translate('client.fieldRequired');
    }
    if (field?.hasError('minlength') && field.touched) {
      return this.translationService.translate('client.fieldMinLength');
    }
    if (field?.hasError('pattern') && field.touched) {
      return this.translationService.translate('client.fieldInvalidFormat');
    }
    return '';
  }
}
