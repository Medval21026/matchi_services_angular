import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    // Utiliser le token tel quel (il contient déjà "Bearer " si nécessaire)
    const cloned = req.clone({
      setHeaders: {
        Authorization: token
      }
    });
    return next(cloned);
  }

  return next(req);
};
