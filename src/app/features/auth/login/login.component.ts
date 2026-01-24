import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage = '';
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      telephone: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = {
      telephone: Number(this.loginForm.value.telephone),
      password: this.loginForm.value.password
    };

    console.log('Tentative de connexion avec:', { telephone: credentials.telephone });

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('Connexion réussie:', response);
        this.isLoading = false;
        // Vérifier que le token est bien stocké
        const token = this.authService.getToken();
        if (token) {
          console.log('Token stocké avec succès');
          this.router.navigate(['/dashboard']);
        } else {
          console.error('Token non stocké après connexion');
          this.errorMessage = 'Erreur lors de la connexion. Veuillez réessayer.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur de connexion complète:', error);
        
        // Afficher un message d'erreur plus détaillé
        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Téléphone ou mot de passe incorrect';
        } else if (error.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Erreur lors de la connexion. Veuillez réessayer.';
        }
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
