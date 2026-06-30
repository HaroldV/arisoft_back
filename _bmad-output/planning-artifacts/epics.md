---
project_name: erp-ari-hv
inputDocuments:
  - _bmad-output/planning-artifacts/ESPECIFICACION_MAESTRA_PRODUCTO_ARI.md
  - _bmad-output/planning-artifacts/RECOMENDACION_ARQUITECTURA_MVP.md
  - _bmad-output/planning-artifacts/DISENO_SISTEMA_Y_EXPERIENCIA_ARI.md
stepsCompleted:
  - step-01-validate-prerequisites
---

# Requerimientos de Épicas e Historias: ARI

## Requerimientos Funcionales (FRs)
- FR-AUTH-1: El sistema debe permitir el inicio de sesión mediante email y password.
- FR-AUTH-2: El sistema debe validar el tenant_id durante el proceso de autenticación para asegurar el aislamiento de datos.
- FR-AUTH-3: El sistema debe emitir un Access Token (JWT) para la autorización de peticiones API.
- FR-AUTH-4: El sistema debe implementar un Refresh Token para mantener la sesión activa sin re-autenticación constante.
- FR-AUTH-5: El sistema debe gestionar Feature Flags para restringir el acceso a módulos según la suscripción del tenant.

## Requerimientos No Funcionales (NFRs)
- NFR-SEC-1: Las contraseñas deben ser hasheadas con bcrypt (mínimo 12 rondas de sal).
- NFR-SEC-2: Implementación de Rate Limiting para prevenir ataques de fuerza bruta en el endpoint de login.
- NFR-SEC-3: Aislamiento total de datos entre Tenants (Multitenancy).
- NFR-SEC-4: Los Refresh Tokens deben ser almacenados en HttpOnly Cookies para mitigar ataques XSS.

## Requerimientos Adicionales (Arquitectura)
- Uso de NestJS con @nestjs/jwt y passport-jwt.
- Persistencia en PostgreSQL para usuarios y metadatos de sesión.
- Implementación de un Interceptor/Guard global para extraer y validar el x-tenant-id.
- Auditoría de acceso (timestamp, IP, dispositivo).

## Requerimientos de Diseño UX
- UX-DR1: Pantalla de Login con feedback visual claro ante errores de credenciales.
- UX-DR2: Banner de estado de suscripción (Trial 90 días) visible tras el inicio de sesión.
- UX-DR3: Sidebar dinámico que oculte o bloquee módulos no suscritos mediante Feature Flags.

## Mapa de Cobertura de Requerimientos
### FR Coverage Map
- FR-AUTH-1: Epic 1 - Inicio de sesión (Email/Password).
- FR-AUTH-2: Epic 1 - Validación de Tenant ID.
- FR-AUTH-3: Epic 1 - Emisión de JWT Access Token.
- FR-AUTH-4: Epic 1 - Gestión de Refresh Tokens (HttpOnly).
- FR-AUTH-5: Epic 2 - Feature Flags (Acceso Modular).
- NFR-SEC-1: Epic 1 - Hash de contraseñas con Bcrypt.
- NFR-SEC-2: Epic 1 - Rate Limiting en Login.
- NFR-SEC-3: Epic 1 - Aislamiento Multitenancy.
- NFR-SEC-4: Epic 1 - Refresh Tokens en Cookies seguras.
- UX-DR-1: Epic 2 - Pantalla de Login UI.
- UX-DR-2: Epic 2 - Banner de Trial 90 días.
- UX-DR-3: Epic 2 - Sidebar Dinámico.

## Épica 1: Infraestructura de Autenticación Multitenant Robusta
**Meta:** Implementar el motor de seguridad "core" de ARI. Al finalizar, el sistema permitirá el inicio de sesión seguro simplificado (email/password), la emisión de tokens duales (Access/Refresh) con resolución automática de tenant y protección contra ataques de fuerza bruta.

### Story 1.1: Validación de Credenciales y Resolución de Tenant
As a sistema de seguridad,
I want validar las credenciales del usuario y derivar su tenant automáticamente,
So that permitir un acceso fluido sin requerir identificadores técnicos externos durante el login.

**Acceptance Criteria:**
- **Given** un email y password válidos.
- **When** el usuario intenta iniciar sesión.
- **Then** el sistema debe buscar al usuario globalmente por email.
- **And** debe validar la contraseña usando bcrypt (AuthService).
- **And** tras el éxito, debe identificar el tenant_id al que pertenece el usuario.
- **And** debe retornar un error 401 si las credenciales son incorrectas o el usuario no existe.

### Story 1.2: Emisión de Tokens JWT Duales (Access & Refresh)
As a desarrollador,
I want que el sistema emita un Access Token de corta duración y un Refresh Token seguro,
So that mantener sesiones seguras y mitigar el robo de identidad.

**Acceptance Criteria:**
- **Given** una validación de credenciales exitosa.
- **When** se solicita el inicio de sesión.
- **Then** el sistema debe retornar un Access Token (JWT) con expiración de 15-30 min.
- **And** debe incluir el tenant_id y user_id en el payload del token.
- **And** debe emitir un Refresh Token persistido en una HttpOnly Cookie.

## Épica 2: Control de Acceso Modular y Experiencia de Usuario
**Meta:** Habilitar la personalización de la experiencia según el plan del cliente (SaaS Enchufable) y entregar la interfaz visual completa para el usuario final.

### Story 2.1: Implementación de Feature Flags y RBAC
As a administrador de ARI,
I want restringir el acceso a los módulos según la suscripción del tenant,
So that incentivar el Upsell y asegurar que cada empresa use solo lo que paga.

**Acceptance Criteria:**
- **Given** un usuario autenticado.
- **When** intenta acceder a una funcionalidad o módulo específico.
- **Then** el sistema debe verificar la configuración de módulos permitidos para el tenant_id.
- **And** debe retornar un error 403 si el módulo no está en la suscripción activa.
- **And** la lista de módulos permitidos debe estar disponible en el contexto de la aplicación (frontend).

### Story 2.2: Interfaz de Usuario para Login y Feedback
As a usuario final,
I want una pantalla de inicio de sesión limpia y segura,
So that acceder a mi panel de control sin fricciones.

**Acceptance Criteria:**
- **Given** la ruta de /login en el frontend.
- **When** se envían las credenciales de acceso.
- **Then** el sistema debe gestionar el estado de carga y las respuestas de error visualmente.
- **And** debe almacenar el Access Token en memoria/state y el Refresh Token vía Cookie.
- **And** debe redirigir al usuario al dashboard tras un éxito.

### Story 2.3: Sidebar Dinámico y Banner de Sandbox (Trial)
As a usuario de prueba,
I want ver cuántos días me quedan de trial y tener un menú que refleje mis módulos activos,
So that entender el valor del sistema y navegar eficientemente.

**Acceptance Criteria:**
- **Given** el componente Sidebar y el estado de suscripción del tenant.
- **When** el usuario navega por el dashboard.
- **Then** el Sidebar debe filtrar los elementos del menú basados en los feature flags del tenant.
- **And** debe mostrar un banner superior con la cuenta regresiva del Trial de 90 días.
- **And** el banner debe ser persistente en todas las vistas del dashboard mientras esté activo el periodo de prueba.

### Story 2.4: Registro Real de Empresa y Propietario (Onboarding)
As a dueño de negocio,
I want registrar mi empresa y mi cuenta de propietario en una transacción atómica,
So that inicializar mi periodo de prueba de 90 días con total seguridad de datos.

**Acceptance Criteria:**
- **Given** los campos de correo, nombre de la empresa, RIF y contraseña en el formulario de registro.
- **When** se envía el formulario.
- **Then** el backend debe validar el formato del RIF usando la expresión regular venezolana (ej: J-12345678-9).
- **And** debe validar que el email y el RIF no existan previamente.
- **And** debe hashear la contraseña del usuario con bcrypt (mínimo 12 rondas).
- **And** debe registrar al Tenant y al Propietario en una única transacción de base de datos para garantizar consistencia.
- **And** el Tenant debe crearse con plan `TRIAL_90` y su expiración establecida a exactamente 90 días en el futuro.

### Story 2.5: Recuperación de Contraseña (Forgot & Reset Password)
As a usuario registrado de ARI,
I want poder recuperar mi contraseña a través de mi correo electrónico de forma segura,
So that no perder el acceso a mi panel operativo.

**Acceptance Criteria:**
- **Given** la vista de solicitar recuperación de contraseña.
- **When** el usuario ingresa su correo registrado.
- **Then** el sistema debe validar la existencia del correo.
- **And** debe generar un token de un solo uso criptográfico y seguro.
- **And** debe persistir el hash del token en la base de datos con un tiempo de expiración de 1 hora.
- **And** debe despachar un email al correo indicado con el enlace de reinicio.
- **Given** el enlace con el token en la URL y la vista de cambiar contraseña.
- **When** el usuario introduce y confirma la nueva contraseña.
- **Then** el sistema debe verificar que el token es válido y no ha expirado.
- **And** debe hashear la nueva contraseña con bcrypt y actualizar el perfil del usuario.
- **And** debe invalidar inmediatamente el token de reinicio utilizado.

### Story 2.6: Gestión Completa de Sesiones (Logout & Refresh Token)
As a desarrollador de seguridad,
I want disponer de endpoints para cerrar sesión y refrescar tokens JWT,
So that mantener sesiones seguras y prevenir ataques de robo de sesión.

**Acceptance Criteria:**
- **Given** un usuario con sesión iniciada.
- **When** el usuario realiza una petición al endpoint de logout (`POST /auth/logout`).
- **Then** el sistema debe invalidar el Refresh Token del usuario y limpiar la cookie segura HttpOnly.
- **Given** un Access Token que está por expirar o ha expirado.
- **When** el frontend envíe el Refresh Token guardado en la cookie HttpOnly al endpoint de refresco (`POST /auth/refresh`).
- **Then** el sistema debe verificar el Refresh Token contra la base de datos y la firma JWT.
- **And** si es válido, emitir un nuevo Access Token con expiración de 15 minutos y un Refresh Token renovado.

## Épica 3: Inventario de Doble Entrada
**Meta:** Implementar el motor de inventario inmutable bajo el rigor contable de doble entrada (journaling), integrando el registro documentado de compras (ingresos) y la deducción automática de ventas en el Punto de Venta (egresos) con autoría y control de existencias.

### Story 3.1: Creación de Productos y Stock Inicial
As a administrador de inventario,
I want registrar nuevos productos e inicializar su stock mediante un diario de movimientos,
So that garantizar que el inventario sea inmutable, auditable y preciso desde el primer día.

**Acceptance Criteria:**
- **Given** un producto y su stock inicial.
- **When** se crea en el sistema.
- **Then** se debe guardar en la tabla PRODUCTS respetando el aislamiento multitenant.
- **And** se debe registrar un asiento inicial tipo `INITIAL_LOAD` en la tabla STOCKS.

### Story 3.2: Registro de Compras y Facturas de Proveedores
As a administrador de compras,
I want registrar facturas de compra asociando productos, cantidades, costos y comprobantes físicos,
So that respaldar legalmente las entradas y registrar el costo histórico de adquisición.

**Acceptance Criteria:**
- **Given** los datos de una factura y sus ítems de compra.
- **When** se guarda la factura con su comprobante de respaldo (proof_file_path).
- **Then** se crean los registros en PURCHASE_INVOICES y PURCHASE_ITEMS.
- **And** se inserta un asiento `PURCHASE` en STOCKS con la cantidad positiva y costo unitario.
- **And** se asocia el `created_by_user_id` del usuario ejecutor en todas las tablas.

### Story 3.3: Descuento Automático y Ventas en Negativo en POS
As a cajero del POS,
I want descontar de manera automática el stock al realizar ventas y poder justificar las ventas en negativo autorizadas,
So that evitar vender mercancía inexistente y registrar incidencias justificadas.

**Acceptance Criteria:**
- **Given** una venta realizada en el POS.
- **When** se procesa la venta en el sistema.
- **Then** se genera un asiento `SALE` en STOCKS con cantidad negativa y costo actual.
- **And** si el stock neto cae por debajo de cero, se valida el flag `allow_negative_stock` en la configuración del tenant.
- **And** si está activado, se exige y almacena una justificación asociada al `created_by_user_id` del cajero.

### Story 3.4: Reglas de Ciclo de Vida y Bloqueo de Modificación de Productos
As a administrador de inventario,
I want impedir la modificación de SKU/nombre o la eliminación de productos con historial de ventas,
So that proteger la integridad histórica y contable de los reportes.

**Acceptance Criteria:**
- **Given** un producto con asientos de tipo `SALE` en STOCKS.
- **When** se intenta eliminar el producto o modificar su SKU o nombre.
- **Then** la operación debe ser rechazada con un error 409 Conflict.
- **Given** un producto sin historial de ventas.
- **When** se edita o elimina.
- **Then** la operación debe permitirse normalmente.

### Story 3.5: Consulta del Catálogo de Productos con Stock Dinámico
As a operador de tienda,
I want listar los productos con sus precios y sus existencias en tiempo real,
So that conocer la disponibilidad de mercancía de forma inmediata.

**Acceptance Criteria:**
- **Given** un usuario autenticado de un tenant.
- **When** realiza una petición `GET /inventory/products`.
- **Then** el sistema debe listar los productos del tenant.
- **And** debe calcular y adjuntar el atributo dinámico `current_stock` sumando los movimientos en la tabla `STOCKS` de cada producto.

### Story 3.6: Historial de Compras y Detalles de Facturas
As a auditor de inventario,
I want consultar las facturas de compras registradas y descargar su comprobante,
So that realizar conciliaciones de auditoría frente al inventario físico.

**Acceptance Criteria:**
- **Given** un usuario autenticado de un tenant.
- **When** realiza una petición `GET /inventory/purchases`.
- **Then** el sistema debe retornar el historial de facturas de compra del tenant.
- **Given** una factura de compra existente.
- **When** realiza una petición `GET /inventory/purchases/:id`.
- **Then** el sistema debe retornar el detalle de los productos comprados, costo unitario y ruta del comprobante adjunto.

### Story 3.7: Historial de Ventas y Justificaciones del POS
As a supervisor de tienda,
I want auditar el registro de ventas históricas,
So that validar egresos financieros y revisar los motivos de las ventas autorizadas en negativo.

**Acceptance Criteria:**
- **Given** un usuario autenticado de un tenant.
- **When** realiza una petición `GET /sales`.
- **Then** el sistema debe retornar el historial de ventas del tenant.
- **Given** una venta existente.
- **When** realiza una petición `GET /sales/:id`.
- **Then** el sistema debe retornar el desglose de productos vendidos y la justificación obligatoria si existió stock negativo.




