import { state, baseRecibos } from './app-state.js';
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    doc,
    getDoc,
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Importamos controles de modales y enrutador
import { 
    abrirModalClave,
    cerrarModalClave,
    abrirModalEditarDoc,
    cerrarModalEditarDoc,
    agregarAnexoALista,
    eliminarAnexoDeLista,
    abrirModalSugerencia,
    cerrarModalSugerencia,
    abrirModalGestion,
    cerrarModalGestion,
    abrirModalCobro,
    cerrarModalCobro,
    cambiarVista,
    abrirDocumento,
    volverAtras,
    abrirModalGuardia,
    cerrarModalGuardia
} from './ui.js';

// Importamos controles específicos de componentes
import { alternarVistaArchivadas, seleccionarColorPostit } from './components/sugerencias.js';
import { alternarFiltroSaldadas, procesarArchivoCSV, cancelarCargaCSV, seleccionarTodosSaldos, ordenarSaldos, aplicarOrdenamientoSaldos } from './components/saldos.js';
import { seleccionarMaterialDidactico } from './components/procedimientos.js';
import { guardiasMesSiguiente, guardiasMesAnterior } from './components/guardias.js';

// Importamos manejadores asincrónicos de base de datos
import {
    inicializarDocumentosBase,
    guardarNuevoDocumentoFirebase,
    procesarEdicionDocFirebase,
    eliminarDocumentoFirebase,
    evaluarPermisosUsuario,
    procesarCobroFirebase,
    togglePagareFirebase,
    toggleAcuerdoEspecialFirebase,
    editarGestionFirebase,
    otorgarPermisoFirebase,
    revocarPermisoFirebase,
    actualizarCampoFirebase,
    eliminarSaldosSeleccionados,
    guardarSaldosSeleccionados,
    guardarNuevaGestion,
    guardarSugerenciaFirebase,
    reaccionarFirebase,
    eliminarSugerenciaFirebase,
    archivarSugerenciaFirebase,
    iniciarSesionFirebase,
    recuperarClaveFirebase,
    cerrarSesion,
    cambiarClaveFirebase,
    guardarGuardiaFirebase,
    eliminarGuardiaFirebase
} from './firebase-handlers.js';

// Exponemos las funciones a 'window' para que el HTML pueda llamarlas directamente
window.abrirModalClave = abrirModalClave;
window.cerrarModalClave = cerrarModalClave;
window.abrirModalEditarDoc = abrirModalEditarDoc;
window.cerrarModalEditarDoc = cerrarModalEditarDoc;
window.agregarAnexoALista = agregarAnexoALista;
window.eliminarAnexoDeLista = eliminarAnexoDeLista;
window.abrirModalSugerencia = abrirModalSugerencia;
window.cerrarModalSugerencia = cerrarModalSugerencia;
window.abrirModalGestion = abrirModalGestion;
window.cerrarModalGestion = cerrarModalGestion;
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;
window.cambiarVista = cambiarVista;
window.abrirDocumento = abrirDocumento;
window.volverAtras = volverAtras;
window.abrirModalGuardia = abrirModalGuardia;
window.cerrarModalGuardia = cerrarModalGuardia;

window.alternarVistaArchivadas = alternarVistaArchivadas;
window.seleccionarColorPostit = seleccionarColorPostit;

window.alternarFiltroSaldadas = alternarFiltroSaldadas;
window.procesarArchivoCSV = procesarArchivoCSV;
window.cancelarCargaCSV = cancelarCargaCSV;
window.seleccionarTodosSaldos = seleccionarTodosSaldos;
window.ordenarSaldos = ordenarSaldos;

window.seleccionarMaterialDidactico = seleccionarMaterialDidactico;
window.guardiasMesSiguiente = guardiasMesSiguiente;
window.guardiasMesAnterior = guardiasMesAnterior;

window.guardarNuevoDocumentoFirebase = guardarNuevoDocumentoFirebase;
window.procesarEdicionDocFirebase = procesarEdicionDocFirebase;
window.eliminarDocumentoFirebase = eliminarDocumentoFirebase;
window.procesarCobroFirebase = procesarCobroFirebase;
window.togglePagareFirebase = togglePagareFirebase;
window.toggleAcuerdoEspecialFirebase = toggleAcuerdoEspecialFirebase;
window.editarGestionFirebase = editarGestionFirebase;
window.otorgarPermisoFirebase = otorgarPermisoFirebase;
window.revocarPermisoFirebase = revocarPermisoFirebase;
window.actualizarCampoFirebase = actualizarCampoFirebase;
window.eliminarSaldosSeleccionados = eliminarSaldosSeleccionados;
window.guardarSaldosSeleccionados = guardarSaldosSeleccionados;
window.guardarNuevaGestion = guardarNuevaGestion;
window.guardarSugerenciaFirebase = guardarSugerenciaFirebase;
window.reaccionarFirebase = reaccionarFirebase;
window.eliminarSugerenciaFirebase = eliminarSugerenciaFirebase;
window.archivarSugerenciaFirebase = archivarSugerenciaFirebase;
window.iniciarSesionFirebase = iniciarSesionFirebase;
window.recuperarClaveFirebase = recuperarClaveFirebase;
window.cerrarSesion = cerrarSesion;
window.cambiarClaveFirebase = cambiarClaveFirebase;
window.guardarGuardiaFirebase = guardarGuardiaFirebase;
window.eliminarGuardiaFirebase = eliminarGuardiaFirebase;


// ESCUCHADORES EN TIEMPO REAL A FIRESTORE Y AUTH STATE CHANGED
const documentosRef = collection(db, "documentos_dpp_proc");
const sugerenciasRef = collection(db, "sugerencias");
const saldosRef = collection(db, "saldos");
const permisosRef = collection(db, "permisos");
const guardiasRef = collection(db, "guardias");

let unsubscribePermisos = null;
let unsubscribeSaldos = null;

function normalizarEmail(email) {
    return (email || '').toLowerCase().trim();
}

function esAdminEmail(email) {
    return normalizarEmail(email) === "damirodriguez81@gmail.com";
}

function actualizarEstadoLogin(texto) {
    const estadoLogin = document.getElementById('estado-login');
    if (!estadoLogin) return;

    estadoLogin.textContent = texto;
    estadoLogin.classList.remove('hidden');
}

async function cargarPermisoInicial(email) {
    const mailLogueado = normalizarEmail(email);

    if (esAdminEmail(mailLogueado)) {
        state.listaPermisosFirebase = [];
        evaluarPermisosUsuario(mailLogueado);
        return;
    }

    const permisoSnap = await getDoc(doc(db, "permisos", mailLogueado));
    state.listaPermisosFirebase = permisoSnap.exists()
        ? [{ id: permisoSnap.id, ...permisoSnap.data() }]
        : [];

    evaluarPermisosUsuario(mailLogueado);
}

function refrescarVistasPorPermisos() {
    if (state.usuarioActualEmail) {
        evaluarPermisosUsuario(state.usuarioActualEmail);
    }

    escucharSaldosSiCorresponde();

    if (state.seccionActual === 'permisos') cambiarVista('permisos');
    if (state.seccionActual === 'inicio') cambiarVista('inicio');
    if (state.seccionActual === 'saldos' && !state.tienePermisoSaldos && !state.esAdminMaster) cambiarVista('inicio');
}

function escucharSaldosSiCorresponde() {
    const puedeVerSaldos = state.esAdminMaster || state.tienePermisoSaldos;

    if (!puedeVerSaldos) {
        if (unsubscribeSaldos) {
            unsubscribeSaldos();
            unsubscribeSaldos = null;
        }
        state.listaSaldosFirebase = [];
        return;
    }

    if (unsubscribeSaldos) return;

    unsubscribeSaldos = onSnapshot(query(saldosRef), (snapshot) => {
        state.listaSaldosFirebase = [];
        snapshot.forEach((docSnap) => {
            state.listaSaldosFirebase.push({ id: docSnap.id, ...docSnap.data() });
        });

        aplicarOrdenamientoSaldos();

        if (state.seccionActual === 'saldos' && !state.viendoDocumento && state.datosCSVPrecargados.length === 0) {
            cambiarVista('saldos');
        }
    }, (error) => {
        console.error("Error al escuchar saldos:", error);
    });
}

function escucharPermisosUsuario(email) {
    if (unsubscribePermisos) {
        unsubscribePermisos();
        unsubscribePermisos = null;
    }

    const mailLogueado = normalizarEmail(email);

    if (esAdminEmail(mailLogueado)) {
        unsubscribePermisos = onSnapshot(permisosRef, (snapshot) => {
            state.listaPermisosFirebase = [];
            snapshot.forEach((docSnap) => {
                state.listaPermisosFirebase.push({ id: docSnap.id, ...docSnap.data() });
            });

            refrescarVistasPorPermisos();
        }, (error) => {
            console.error("Error al escuchar permisos:", error);
        });
        return;
    }

    unsubscribePermisos = onSnapshot(doc(db, "permisos", mailLogueado), (docSnap) => {
        state.listaPermisosFirebase = docSnap.exists()
            ? [{ id: docSnap.id, ...docSnap.data() }]
            : [];

        refrescarVistasPorPermisos();
    }, (error) => {
        console.error("Error al escuchar permiso del usuario:", error);
        state.listaPermisosFirebase = [];
        refrescarVistasPorPermisos();
    });
}

// Escuchar documentos
onSnapshot(query(documentosRef, orderBy("fechaAlta", "desc")), (snapshot) => {
    state.listaDocumentosFirebase = [];
    snapshot.forEach((docSnap) => {
        state.listaDocumentosFirebase.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (state.listaDocumentosFirebase.length === 0) {
        inicializarDocumentosBase();
    }

    if ((state.seccionActual === 'dpp' || state.seccionActual === 'procedimientos' || state.seccionActual === 'permisos') && !state.viendoDocumento) {
        cambiarVista(state.seccionActual);
    }
});

// Escuchar sugerencias
onSnapshot(query(sugerenciasRef, orderBy("fechaCreacion", "desc")), (snapshot) => {
    state.listaSugerencias = [];
    snapshot.forEach((docSnap) => {
        state.listaSugerencias.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (state.seccionActual === 'sugerencias' && !state.viendoDocumento) {
        cambiarVista('sugerencias');
    }
});

// Escuchar guardias
onSnapshot(guardiasRef, (snapshot) => {
    state.listaGuardiasFirebase = [];
    snapshot.forEach((docSnap) => {
        state.listaGuardiasFirebase.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (state.seccionActual === 'guardias' && !state.viendoDocumento) {
        cambiarVista('guardias');
    }
});

// Escuchar cambios de estado de sesión
onAuthStateChanged(auth, async (user) => {
    const pantallaLogin = document.getElementById('pantalla-login');
    const appPrincipal = document.getElementById('aplicacion-principal');
    const btnLogin = document.getElementById('btn-login');
    const estadoLogin = document.getElementById('estado-login');

    if (user) {
        state.usuarioActualEmail = user.email;
        actualizarEstadoLogin("Verificando permisos...");

        try {
            await cargarPermisoInicial(state.usuarioActualEmail);
            escucharPermisosUsuario(state.usuarioActualEmail);
            escucharSaldosSiCorresponde();
        } catch (error) {
            console.error("Error al verificar permisos:", error);
            actualizarEstadoLogin("No se pudieron verificar los permisos. Cerrá sesión y volvé a intentar.");
            return;
        }

        const mailLogueado = normalizarEmail(user.email);
        const empleadoEncontrado = baseRecibos.find(emp => emp.email.toLowerCase().trim() === mailLogueado);
        
        if (empleadoEncontrado && empleadoEncontrado.nombre) {
            document.getElementById('nombre-usuario-header').textContent = empleadoEncontrado.nombre;
        } else {
            document.getElementById('nombre-usuario-header').textContent = user.email;
        }

        pantallaLogin.classList.add('hidden');
        appPrincipal.classList.remove('hidden');
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.innerHTML = 'Ingresar';
        }
        if (estadoLogin) estadoLogin.classList.add('hidden');
        cambiarVista('inicio');
    } else {
        state.usuarioActualEmail = "";
        state.esAdminMaster = false;
        state.tienePermisoSaldos = false;
        state.listaPermisosFirebase = [];
        state.listaSaldosFirebase = [];
        if (unsubscribePermisos) {
            unsubscribePermisos();
            unsubscribePermisos = null;
        }
        if (unsubscribeSaldos) {
            unsubscribeSaldos();
            unsubscribeSaldos = null;
        }
        pantallaLogin.classList.remove('hidden');
        appPrincipal.classList.add('hidden');
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.innerHTML = 'Ingresar';
        }
        if (estadoLogin) estadoLogin.classList.add('hidden');
    }
});
