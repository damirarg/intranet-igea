const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const ADMIN_EMAIL = "damirodriguez81@gmail.com";
const MODULOS_VALIDOS = ["saldos", "guardias"];

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function limpiarTexto(valor) {
  return String(valor || "").trim();
}

function validarAdmin(request) {
  const email = normalizarEmail(request.auth && request.auth.token && request.auth.token.email);

  if (!email || email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Solo el administrador puede gestionar usuarios.");
  }
}

function normalizarModulos(modulos) {
  if (!Array.isArray(modulos)) return [];

  return [...new Set(modulos.map(limpiarTexto).filter(m => MODULOS_VALIDOS.includes(m)))];
}

function generarClaveTemporal() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let clave = "";

  for (let i = 0; i < 14; i++) {
    clave += letras[Math.floor(Math.random() * letras.length)];
  }

  return `${clave}!7`;
}

async function guardarPerfilPermisos({ email, nombre, uid, modulos }) {
  const permisoRef = admin.firestore().collection("permisos").doc(email);

  await permisoRef.set({
    email,
    nombre,
    uid,
    modulos,
    activo: true,
    fechaAlta: admin.firestore.FieldValue.serverTimestamp(),
    fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

exports.crearUsuarioIntranet = onCall({ region: "us-central1", maxInstances: 1 }, async (request) => {
  validarAdmin(request);

  const email = normalizarEmail(request.data && request.data.email);
  const nombre = limpiarTexto(request.data && request.data.nombre);
  const modulos = normalizarModulos(request.data && request.data.modulos);
  const claveTemporal = limpiarTexto(request.data && request.data.claveTemporal) || generarClaveTemporal();

  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Ingresá un correo válido.");
  }

  if (!nombre) {
    throw new HttpsError("invalid-argument", "Ingresá el nombre del usuario.");
  }

  if (claveTemporal.length < 6) {
    throw new HttpsError("invalid-argument", "La clave temporal debe tener al menos 6 caracteres.");
  }

  try {
    const usuario = await admin.auth().createUser({
      email,
      password: claveTemporal,
      displayName: nombre,
      disabled: false
    });

    await guardarPerfilPermisos({ email, nombre, uid: usuario.uid, modulos });

    logger.info("Usuario de intranet creado", { email, uid: usuario.uid });

    return {
      uid: usuario.uid,
      email,
      nombre,
      modulos,
      claveTemporal
    };
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Ya existe un usuario con ese correo.");
    }

    logger.error("Error al crear usuario", error);
    throw new HttpsError("internal", error.message || "No se pudo crear el usuario.");
  }
});

exports.enviarResetClaveUsuario = onCall({ region: "us-central1", maxInstances: 1 }, async (request) => {
  validarAdmin(request);

  const email = normalizarEmail(request.data && request.data.email);

  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Ingresá un correo válido.");
  }

  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    logger.info("Link de recuperacion generado", { email });
    return { email, link };
  } catch (error) {
    logger.error("Error al generar recuperacion", error);
    throw new HttpsError("internal", error.message || "No se pudo generar el link de recuperación.");
  }
});

exports.cambiarEmailUsuarioIntranet = onCall({ region: "us-central1", maxInstances: 1 }, async (request) => {
  validarAdmin(request);

  const emailActual = normalizarEmail(request.data && request.data.emailActual);
  const emailNuevo = normalizarEmail(request.data && request.data.emailNuevo);

  if (!emailActual || !emailNuevo || !emailActual.includes("@") || !emailNuevo.includes("@")) {
    throw new HttpsError("invalid-argument", "Ingresá correos válidos.");
  }

  if (emailActual === ADMIN_EMAIL) {
    throw new HttpsError("failed-precondition", "No se puede cambiar el correo del administrador principal desde la intranet.");
  }

  try {
    const usuario = await admin.auth().getUserByEmail(emailActual);
    await admin.auth().updateUser(usuario.uid, { email: emailNuevo });

    const permisosRef = admin.firestore().collection("permisos");
    const permisoActualRef = permisosRef.doc(emailActual);
    const permisoActual = await permisoActualRef.get();
    const dataActual = permisoActual.exists ? permisoActual.data() : {};

    await permisosRef.doc(emailNuevo).set({
      ...dataActual,
      email: emailNuevo,
      uid: usuario.uid,
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    if (permisoActual.exists) {
      await permisoActualRef.delete();
    }

    logger.info("Correo de usuario actualizado", { emailActual, emailNuevo, uid: usuario.uid });
    return { emailActual, emailNuevo };
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No existe un usuario con ese correo.");
    }

    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "El nuevo correo ya pertenece a otro usuario.");
    }

    logger.error("Error al cambiar correo", error);
    throw new HttpsError("internal", error.message || "No se pudo cambiar el correo.");
  }
});

exports.cambiarEstadoUsuarioIntranet = onCall({ region: "us-central1", maxInstances: 1 }, async (request) => {
  validarAdmin(request);

  const email = normalizarEmail(request.data && request.data.email);
  const activo = Boolean(request.data && request.data.activo);

  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Ingresá un correo válido.");
  }

  if (email === ADMIN_EMAIL) {
    throw new HttpsError("failed-precondition", "No se puede desactivar el administrador principal.");
  }

  try {
    const usuario = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(usuario.uid, { disabled: !activo });

    await admin.firestore().collection("permisos").doc(email).set({
      email,
      uid: usuario.uid,
      activo,
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    logger.info("Estado de usuario actualizado", { email, uid: usuario.uid, activo });
    return { email, activo };
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No existe un usuario con ese correo.");
    }

    logger.error("Error al cambiar estado de usuario", error);
    throw new HttpsError("internal", error.message || "No se pudo cambiar el estado del usuario.");
  }
});
