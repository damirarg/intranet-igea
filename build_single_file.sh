#!/bin/bash

# Obtener los datos Base64
LOGO=$(cat assets/logo_b64_single.txt)
CONSULTORIO=$(cat assets/consultorio_b64.txt)
HELIX=$(cat assets/helix_b64.txt)

# Crear nuevo archivo HTML con datos embebidos
sed "s|./assets/Logo.jpg|data:image/jpeg;base64,$LOGO|g" igea_intranet_con_drive.html | \
sed "s|./assets/consultorio.jpg|data:image/jpeg;base64,$CONSULTORIO|g" | \
sed "s|./assets/Hélice ADN.mp4|data:video/mp4;base64,$HELIX|g" > igea_intranet_standalone.html

echo "Archivo consolidado creado: igea_intranet_standalone.html"
ls -lh igea_intranet_standalone.html
