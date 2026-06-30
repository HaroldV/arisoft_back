# ARI ERP - Backend

Este repositorio contiene el servicio backend para **ARI: Administración Resiliente e Inteligente**, un sistema ERP multitenant robusto diseñado para automatizar operaciones de inventario de doble entrada, POS (Punto de Venta), facturación de compras, control de acceso (RBAC) y nómina con soberanía económica.

## 🛠️ Stack Tecnológico

*   **Framework:** NestJS (Node.js)
*   **Persistencia:** TypeORM + PostgreSQL (pg)
*   **Contenedores:** Docker & Docker Compose (para base de datos local)
*   **Validación:** class-validator & class-transformer
*   **Seguridad:** Passport (JWT) + bcrypt + Rate Limiting (Throttler)
*   **Documentación:** OpenAPI / Swagger UI
*   **Pruebas:** Jest

---

## 🚀 Instrucciones de Levantamiento y Configuración Local

Sigue estos pasos para configurar y arrancar el backend en tu entorno local:

### 1. Requisitos Previos
Asegúrate de tener instalados:
*   [Node.js](https://nodejs.org/) (versión 18 o superior)
*   [Docker](https://www.docker.com/) y Docker Compose

### 2. Instalación de Dependencias
Instala los paquetes necesarios desde la raíz de este proyecto:
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo de plantilla `.env.example` para crear tu `.env`:
```bash
cp .env.example .env
```
El archivo contiene la siguiente configuración base para desarrollo:
```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5444
DB_USER=ari_admin
DB_PASSWORD=ari_password_2026
DB_NAME=ari_erp_db

# Security
JWT_SECRET=ari-super-secret-key-2026
```

### 4. Iniciar la Base de Datos (Docker)
Levanta el contenedor de PostgreSQL precargado con el esquema de tablas iniciales:
```bash
npm run start:db
```
*Nota: Este comando inicia un contenedor PostgreSQL mapeado en el puerto local **5444** e inyecta los scripts SQL de la carpeta `src/infrastructure/persistence/postgresql/migrations` automáticamente si la base de datos está vacía.*

### 5. Cargar Datos de Prueba (Seeding)
Pobla la base de datos local con datos de prueba (Tenant, usuarios OWNER y CASHIER, catálogo con existencias iniciales, compras, ventas e historiales de stock):
```bash
npx ts-node src/seed.ts
```

### 6. Ejecutar la Aplicación en Desarrollo
Arranca el servidor en modo de escucha automática (watch mode):
```bash
npm run dev
```
El servidor backend correrá en: `http://localhost:4000`

---

## 📚 Documentación Interactiva (Swagger UI)

Una vez levantada la aplicación, accede a la documentación interactiva de la API:
👉 **[http://localhost:4000/api](http://localhost:4000/api)**

### Cómo Autenticar Peticiones en Swagger:
1.  Inicia sesión ejecutando el endpoint `POST /auth/login` con cualquiera de las cuentas de prueba.
2.  Copia el `access_token` devuelto.
3.  Haz clic en el botón verde **Authorize** en la parte superior derecha de Swagger UI.
4.  Pega el token y confirma. Todas las peticiones posteriores a los endpoints protegidos enviarán la cabecera `Authorization: Bearer <token>` de forma automática.

---

## 👥 Cuentas de Prueba (Datos de Semilla)

*   **Tenant ID (Inquilino):** `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` (Utilízalo en la cabecera `x-tenant-id` para llamadas que lo requieran).
*   **Usuario OWNER (Administrador):**
    *   **Email:** `admin@ari.com`
    *   **Contraseña:** `password123`
*   **Usuario CASHIER (Cajero):**
    *   **Email:** `juan@ari.com`
    *   **Contraseña:** `password123`

---

## 🧪 Pruebas Unitarias y de Integración

Ejecuta el conjunto completo de pruebas con Jest:
```bash
npm run test
```

Para generar la compilación de producción del backend:
```bash
npm run build
```

---

## 📁 Estructura del Código Fuente

*   `src/domain/entities`: Definición de los modelos físicos de datos de la base de datos multitenant.
*   `src/application/use-cases`: Lógica de negocio (casos de uso) para autenticación, ciclo de vida del inventario, y ventas.
*   `src/infrastructure`: Adaptadores técnicos para persistencia (repositorios request-scoped con aislamiento estricto por inquilino), estrategias JWT, guardias RBAC y rate limiting.
*   `src/presentation/web/controllers`: Enrutamiento y control de endpoints REST HTTP documentados con Swagger.
*   `_bmad/` y `_bmad-output/`: Repositorio de configuración y artefactos de desarrollo del framework de agentes inteligentes (Bmad).
