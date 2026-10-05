# Despliegue automático de Firebase

Cada push a `main` ejecuta el workflow `Deploy Firebase` y publica:

- Firebase Hosting.
- Reglas de Cloud Firestore.

Cloud Functions se mantiene fuera del despliegue automático para evitar publicar cambios de backend de manera accidental.

## Configuración inicial

El repositorio de GitHub debe tener un Environment llamado `production` y el secreto:

`FIREBASE_SERVICE_ACCOUNT`

Su valor debe ser el JSON completo de una cuenta de servicio del proyecto `intranet-igea` con permisos mínimos para desplegar Firebase Hosting y reglas de Firestore.

La credencial nunca debe guardarse como archivo dentro del repositorio.

El workflow también puede ejecutarse manualmente desde **Actions > Deploy Firebase > Run workflow**.
