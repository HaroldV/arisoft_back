# Story 2.6: Gestión Completa de Sesiones (Logout & Refresh Token)

Status: done

## Story

**Como** desarrollador de seguridad,
**quiero** disponer de endpoints para cerrar sesión y refrescar tokens JWT,
**para** mantener sesiones seguras y prevenir ataques de robo de sesión.

## Acceptance Criteria

1. **Cierre de Sesión Seguro (AC: #1):** El endpoint `POST /auth/logout` debe invalidar la sesión del usuario limpiando/borrando la cookie HttpOnly que contiene el `Refresh Token`.
2. **Refresco de Tokens (AC: #2):** El endpoint `POST /auth/refresh` debe extraer el Refresh Token de la cookie HttpOnly, validar su firma y vigencia, y retornar un nuevo par de tokens (Access Token y Refresh Token).
3. **Rotación de Refresh Tokens (AC: #3):** Al refrescar la sesión, el Refresh Token anterior debe ser invalidado y reemplazado por uno nuevo, previniendo ataques de replay.
4. **Middleware y Seguridad (AC: #4):** Configurar correctamente las cookies con directivas `HttpOnly`, `Secure` (en producción), y `SameSite: strict` para mitigar ataques XSS y CSRF.
5. **Integración Frontend (AC: #5):** El frontend de Next.js debe implementar un interceptor de peticiones (ej. Axios interceptor) que detecte expiración de tokens (401) y llame automáticamente a `/auth/refresh` para evitar desconexiones del usuario.

## Tasks / Subtasks

- [x] **Lógica de Casos de Uso (AC: #1, #2, #3)**
  - [x] Implementar `RefreshTokenUseCase` en el backend para realizar la rotación y validación del Refresh Token.
  - [x] Implementar `LogoutUseCase` si se requiere alguna lógica de revocación adicional.
- [x] **Endpoints en el Controlador (AC: #1, #2, #4)**
  - [x] Agregar `POST /auth/logout` en `AuthController`.
  - [x] Agregar `POST /auth/refresh` en `AuthController`.
  - [x] Configurar el guardado y borrado de cookies seguras `HttpOnly` en las cabeceras de respuesta.
- [x] **Frontend Axios Interceptors (AC: #5)**
  - [x] Implementar el cliente Axios en `frontend/src/context/` o `frontend/src/infrastructure/api/` con soporte para interceptar errores de autorización y refrescar sesión.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Use Cases:** Crear `RefreshTokenUseCase` y `LogoutUseCase`.
- **Infrastructure:** Inyectar `JwtService` y configurar las firmas.

### Componentes a Tocar
- `backend/src/presentation/web/controllers/auth.controller.ts`
- `frontend/src/context/AuthContext.tsx` o archivo API cliente de Next.js.
