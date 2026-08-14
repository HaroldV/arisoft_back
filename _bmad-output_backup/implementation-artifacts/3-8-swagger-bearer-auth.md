# spec-swagger-bearer-auth: Soporte de Autenticación Bearer en Swagger UI

Status: done

## Intent

* **Problem:** Las peticiones realizadas desde Swagger UI a los endpoints protegidos con `JwtAuthGuard` (como los endpoints de inventario y ventas) fallaban porque Swagger UI no solicitaba el inicio de sesión ni enviaba el token Bearer en las cabeceras.
* **Approach:** Decorar las clases de controladores protegidos (`InventoryController` y `SalesController`) con la etiqueta `@ApiBearerAuth()` de NestJS Swagger, la cual vincula automáticamente los endpoints con el esquema de seguridad Bearer JWT definido globalmente.

## Suggested Review Order

- [inventory.controller.ts](file:///Users/haroldv/Projects/erp-ari-hv/erp-ari-hv/backend/src/presentation/web/controllers/inventory.controller.ts#L16)
  Adición de `@ApiBearerAuth()` a nivel de clase de inventario.
- [sales.controller.ts](file:///Users/haroldv/Projects/erp-ari-hv/erp-ari-hv/backend/src/presentation/web/controllers/sales.controller.ts#L11)
  Adición de `@ApiBearerAuth()` a nivel de clase de ventas.

## Completion Notes List
- [x] Importación de `ApiBearerAuth` y decoración de controladores protegidos.
- [x] Verificación de la compilación y ejecución exitosa de pruebas.
