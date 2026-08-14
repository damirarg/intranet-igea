# Despliegue Firebase - Intranet IGEA

La intranet queda configurada para publicarse en el proyecto Firebase:

```text
intranet-igea
```

## Publicar cambios

Desde Visual Studio Code, abrir una terminal en esta carpeta y ejecutar:

```bash
npm run deploy
```

Ese comando publica:

- Firebase Hosting
- reglas de Firestore desde `firestore.rules`
- Cloud Functions administrativas

## Requisito para gestion de usuarios

Las funciones administrativas para crear usuarios, generar links de recuperacion y cambiar correos usan Firebase Cloud Functions.

Firebase exige que el proyecto `intranet-igea` este en plan Blaze para desplegar esas funciones:

```text
https://console.firebase.google.com/project/intranet-igea/usage/details
```

Despues de activar Blaze, ejecutar:

```bash
npm run deploy
```

## Publicar solo la web

```bash
npm run deploy:hosting
```

## Publicar solo reglas de Firestore

```bash
npm run deploy:rules
```

## Primera vez o sesion vencida

Si Firebase informa que la sesion esta vencida, ejecutar:

```bash
firebase login --reauth
```

Despues volver a ejecutar:

```bash
npm run deploy
```

## URL esperada

Firebase Hosting normalmente publica en:

```text
https://intranet-igea.web.app
https://intranet-igea.firebaseapp.com
```
