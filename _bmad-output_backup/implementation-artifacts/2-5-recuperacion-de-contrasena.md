# Story 2.5: Recuperación de Contraseña (Forgot & Reset Password)

Status: done

## Story

**Como** usuario registrado de ARI,
**quiero** poder recuperar mi contraseña a través de mi correo electrónico de forma segura,
**para** no perder el acceso a mi panel operativo ante un olvido.

## Acceptance Criteria

1. **Solicitud de Recuperación (AC: #1):** El usuario puede ingresar su correo electrónico. Si el correo existe en el sistema, se debe generar un token criptográfico de un solo uso.
2. **Expiración y Almacenamiento Seguro (AC: #2):** El token debe ser hasheado antes de guardarse en la base de datos (ej. en una tabla `PASSWORD_RESET_TOKENS`) con un tiempo de expiración estricto de 1 hora.
3. **Envío de Correo Electrónico (AC: #3):** Se debe despachar un correo electrónico al usuario con un enlace que contenga el token en la URL (ej: `http://localhost:3005/reset-password?token=XYZ`).
4. **Validación de Token (AC: #4):** Al acceder al formulario de cambio de contraseña, el sistema debe validar la existencia, firma y vigencia del token.
5. **Reinicio de Contraseña (AC: #5):** Tras validar el token, el usuario puede introducir su nueva contraseña, la cual se hasheará con bcrypt e invalidará el token inmediatamente en base de datos.
6. **API Endpoints y UI (AC: #6):** Exponer endpoints `POST /auth/forgot-password` y `POST /auth/reset-password` en el backend, y las vistas `/forgot-password` y `/reset-password` en el frontend.

## Tasks / Subtasks

- [x] **Persistencia y Entidades (AC: #2)**
  - [x] Crear la entidad `PasswordResetToken` en el backend.
  - [x] Generar la migración SQL para la tabla `PASSWORD_RESET_TOKENS`.
- [x] **Lógica de Casos de Uso (AC: #1, #2, #4, #5)**
  - [x] Crear `ForgotPasswordUseCase` para validar correo, crear token seguro y guardarlo hasheado.
  - [x] Crear `ResetPasswordUseCase` para validar token, actualizar contraseña de usuario e invalidar el token.
- [x] **Servicio de Envío de Email (AC: #3)**
  - [x] Implementar un `EmailService` mockeado (en desarrollo) o integrado con nodemailer que imprima o despache el correo.
- [x] **Endpoints del Controlador (AC: #6)**
  - [x] Añadir los endpoints en `AuthController`.
- [x] **Vistas del Frontend (AC: #6)**
  - [x] Crear la página `/forgot-password` en Next.js.
  - [x] Crear la página `/reset-password` en Next.js.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Domain:** Crear la entidad `PasswordResetToken` en `backend/src/domain/entities/`.
- **Infrastructure:** Configurar el transporte de nodemailer o un mock en `backend/src/infrastructure/`.

### Componentes a Tocar
- `backend/src/presentation/web/controllers/auth.controller.ts`
- `frontend/src/app/forgot-password/page.tsx`
- `frontend/src/app/reset-password/page.tsx`
