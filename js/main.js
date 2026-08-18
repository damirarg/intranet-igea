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
import { alternarArchivadosRRHH, actualizarSubareasRRHH, filtrarEmpleadosRRHH } from './components/rrhh.js';
import { cambiarAnioAusencias, cancelarEdicionReglaVacaciones, editarReglaVacaciones, filtrarAusencias, irAHoyVacaciones, moverRangoVacaciones, prepararAjusteVacacionesEmpleado, prepararVacacionEmpleado, recalcularDiasAusenciaPreview, seleccionarEmpleadoVacaciones, sincronizarDescuentoAusencia } from './components/ausencias.js';
import { cambiarVistaDebitos, seleccionarLoteDebitos } from './components/debitos/debitos.js';
import { actualizarCampoImportacionDebitos, cancelarImportacionDebitos, crearLoteDebitos, procesarArchivoDebitosCSV } from './components/debitos/debitos-importacion.js';

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
    crearUsuarioIntranetFirebase,
    generarResetClaveUsuarioFirebase,
    cambiarEmailUsuarioFirebase,
    actualizarNombreUsuarioFirebase,
    cambiarEstadoUsuarioFirebase,
    sincronizarUsuariosDesdePermisosFirebase,
    guardarNivelPermisoModuloFirebase,
    guardarEmpleadoRRHHFirebase,
    prepararUsuarioDesdeEmpleadoRRHH,
    editarEmpleadoRRHH,
    cancelarEdicionEmpleadoRRHH,
    eliminarEmpleadoRRHHFirebase,
    guardarAusenciaFirebase,
    editarAusenciaFirebase,
    cancelarEdicionAusenciaFirebase,
    eliminarAusenciaFirebase,
    guardarAjusteVacacionesFirebase,
    eliminarAjusteVacacionesFirebase,
    guardarReglaVacacionesFirebase,
    eliminarReglaVacacionesFirebase,
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
window.filtrarEmpleadosRRHH = filtrarEmpleadosRRHH;
window.alternarArchivadosRRHH = alternarArchivadosRRHH;
window.actualizarSubareasRRHH = actualizarSubareasRRHH;
window.filtrarAusencias = filtrarAusencias;
window.cambiarAnioAusencias = cambiarAnioAusencias;
window.recalcularDiasAusenciaPreview = recalcularDiasAusenciaPreview;
window.sincronizarDescuentoAusencia = sincronizarDescuentoAusencia;
window.moverRangoVacaciones = moverRangoVacaciones;
window.irAHoyVacaciones = irAHoyVacaciones;
window.prepararVacacionEmpleado = prepararVacacionEmpleado;
window.seleccionarEmpleadoVacaciones = seleccionarEmpleadoVacaciones;
window.editarReglaVacaciones = editarReglaVacaciones;
window.cancelarEdicionReglaVacaciones = cancelarEdicionReglaVacaciones;
window.prepararAjusteVacacionesEmpleado = prepararAjusteVacacionesEmpleado;
window.cambiarVistaDebitos = cambiarVistaDebitos;
window.seleccionarLoteDebitos = seleccionarLoteDebitos;
window.actualizarCampoImportacionDebitos = actualizarCampoImportacionDebitos;
window.procesarArchivoDebitosCSV = procesarArchivoDebitosCSV;
window.cancelarImportacionDebitos = cancelarImportacionDebitos;
window.crearLoteDebitos = crearLoteDebitos;

window.guardarNuevoDocumentoFirebase = guardarNuevoDocumentoFirebase;
window.procesarEdicionDocFirebase = procesarEdicionDocFirebase;
window.eliminarDocumentoFirebase = eliminarDocumentoFirebase;
window.procesarCobroFirebase = procesarCobroFirebase;
window.togglePagareFirebase = togglePagareFirebase;
window.toggleAcuerdoEspecialFirebase = toggleAcuerdoEspecialFirebase;
window.editarGestionFirebase = editarGestionFirebase;
window.crearUsuarioIntranetFirebase = crearUsuarioIntranetFirebase;
window.generarResetClaveUsuarioFirebase = generarResetClaveUsuarioFirebase;
window.cambiarEmailUsuarioFirebase = cambiarEmailUsuarioFirebase;
window.actualizarNombreUsuarioFirebase = actualizarNombreUsuarioFirebase;
window.cambiarEstadoUsuarioFirebase = cambiarEstadoUsuarioFirebase;
window.sincronizarUsuariosDesdePermisosFirebase = sincronizarUsuariosDesdePermisosFirebase;
window.guardarNivelPermisoModuloFirebase = guardarNivelPermisoModuloFirebase;
window.guardarEmpleadoRRHHFirebase = guardarEmpleadoRRHHFirebase;
window.prepararUsuarioDesdeEmpleadoRRHH = prepararUsuarioDesdeEmpleadoRRHH;
window.editarEmpleadoRRHH = editarEmpleadoRRHH;
window.cancelarEdicionEmpleadoRRHH = cancelarEdicionEmpleadoRRHH;
window.eliminarEmpleadoRRHHFirebase = eliminarEmpleadoRRHHFirebase;
window.guardarAusenciaFirebase = guardarAusenciaFirebase;
window.editarAusenciaFirebase = editarAusenciaFirebase;
window.cancelarEdicionAusenciaFirebase = cancelarEdicionAusenciaFirebase;
window.eliminarAusenciaFirebase = eliminarAusenciaFirebase;
window.guardarAjusteVacacionesFirebase = guardarAjusteVacacionesFirebase;
window.eliminarAjusteVacacionesFirebase = eliminarAjusteVacacionesFirebase;
window.guardarReglaVacacionesFirebase = guardarReglaVacacionesFirebase;
window.eliminarReglaVacacionesFirebase = eliminarReglaVacacionesFirebase;
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
const usuariosRef = collection(db, "usuarios");
const guardiasRef = collection(db, "guardias");
const empleadosRRHHRef = collection(db, "empleados_rrhh");
const ausenciasRef = collection(db, "ausencias");
const ajustesVacacionesRef = collection(db, "vacaciones_ajustes");
const reglasVacacionesRef = collection(db, "vacaciones_reglas");
const debitosLotesRef = collection(db, "debitos_lotes");
const debitosPrestacionesRef = collection(db, "debitos_prestaciones");

let unsubscribePermisos = null;
let unsubscribeSaldos = null;
let unsubscribeUsuarios = null;
let unsubscribeEmpleadosRRHH = null;
let unsubscribeAusencias = null;
let unsubscribeAjustesVacaciones = null;
let unsubscribeReglasVacaciones = null;
let unsubscribeDebitosLotes = null;
let unsubscribeDebitosPrestaciones = null;

function normalizarEmail(email) {
    return (email || '').toLowerCase().trim();
}

function esAdminEmail(email) {
    return normalizarEmail(email) === "damirodriguez81@gmail.com";
}

function obtenerNombreUsuario(email) {
    const mail = normalizarEmail(email);
    const empleadoEncontrado = baseRecibos.find(emp => normalizarEmail(emp.email) === mail);
    return empleadoEncontrado && empleadoEncontrado.nombre ? empleadoEncontrado.nombre : email;
}

function actualizarNombreHeader() {
    const nombreHeader = document.getElementById('nombre-usuario-header');
    if (!nombreHeader) return;

    const nombre = obtenerNombreUsuario(state.usuarioActualEmail);
    nombreHeader.textContent = state.verComoEmail ? `Viendo: ${nombre}` : nombre;
    nombreHeader.title = state.verComoEmail
        ? `Sesión real: ${state.usuarioAutenticadoEmail}`
        : state.usuarioActualEmail;
}

function actualizarSelectorVerComo() {
    const contenedor = document.getElementById('admin-ver-como');
    const select = document.getElementById('select-ver-como');
    if (!contenedor || !select) return;

    if (!state.esAdminAutenticado) {
        contenedor.classList.add('hidden');
        contenedor.classList.remove('flex');
        return;
    }

    const usuarios = new Map();
    baseRecibos.forEach(emp => usuarios.set(normalizarEmail(emp.email), emp.nombre || emp.email));
    state.listaUsuariosFirebase.forEach(u => {
        if (u.email) usuarios.set(normalizarEmail(u.email), u.nombre || u.displayName || u.email);
    });
    state.listaPermisosFirebase.forEach(p => {
        if (p.email) usuarios.set(normalizarEmail(p.email), obtenerNombreUsuario(p.email));
    });

    select.innerHTML = `
        <option value="">Vista administrador</option>
        <option value="__comun__">Usuario común sin permisos</option>
        ${Array.from(usuarios.entries())
            .filter(([email]) => email && !esAdminEmail(email))
            .sort((a, b) => a[1].localeCompare(b[1], 'es'))
            .map(([email, nombre]) => `<option value="${email}">Ver como ${nombre}</option>`)
            .join('')}
    `;

    select.value = state.verComoEmail === "usuario.comun@simulado.local" ? "__comun__" : (state.verComoEmail || '');
    contenedor.classList.remove('hidden');
    contenedor.classList.add('flex');
}

function aplicarVistaEfectiva(email) {
    state.usuarioActualEmail = email;
    evaluarPermisosUsuario(email);
    escucharSaldosSiCorresponde();
    escucharEmpleadosRRHHSiCorresponde();
    escucharAusenciasAdmin();
    escucharDebitosSiCorresponde();
    actualizarNombreHeader();
    actualizarSelectorVerComo();

    if (state.seccionActual === 'permisos' && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'saldos' && !state.tienePermisoSaldos && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'guardias' && !state.tienePermisoGuardias && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'rrhh' && !state.tienePermisoRRHH && !state.esAdminMaster) cambiarVista('inicio');
    else if ((state.seccionActual === 'ausencias' || state.seccionActual === 'vacaciones') && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'debitos' && !state.tienePermisoDebitos && !state.esAdminMaster) cambiarVista('inicio');
    else cambiarVista(state.seccionActual || 'inicio');
}

function cambiarVerComoAdmin(valor) {
    if (!state.esAdminAutenticado) return;

    if (!valor) {
        state.verComoEmail = "";
        aplicarVistaEfectiva(state.usuarioAutenticadoEmail);
        return;
    }

    if (valor === "__comun__") {
        state.verComoEmail = "usuario.comun@simulado.local";
        aplicarVistaEfectiva(state.verComoEmail);
        return;
    }

    state.verComoEmail = normalizarEmail(valor);
    aplicarVistaEfectiva(state.verComoEmail);
}

window.cambiarVerComoAdmin = cambiarVerComoAdmin;

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
    escucharEmpleadosRRHHSiCorresponde();
    escucharAusenciasAdmin();
    escucharDebitosSiCorresponde();
    actualizarSelectorVerComo();
    actualizarNombreHeader();

    if (state.seccionActual === 'permisos' && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'permisos') cambiarVista('permisos');
    if (state.seccionActual === 'inicio') cambiarVista('inicio');
    if (state.seccionActual === 'guardias') cambiarVista('guardias');
    if (state.seccionActual === 'guardias' && !state.tienePermisoGuardias && !state.esAdminMaster) cambiarVista('inicio');
    if (state.seccionActual === 'saldos' && !state.tienePermisoSaldos && !state.esAdminMaster) cambiarVista('inicio');
    if (state.seccionActual === 'rrhh' && !state.tienePermisoRRHH && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'rrhh') cambiarVista('rrhh');
    if ((state.seccionActual === 'ausencias' || state.seccionActual === 'vacaciones') && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'ausencias') cambiarVista('ausencias');
    if (state.seccionActual === 'debitos' && !state.tienePermisoDebitos && !state.esAdminMaster) cambiarVista('inicio');
    else if (state.seccionActual === 'debitos') cambiarVista('debitos');
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

function escucharEmpleadosRRHHSiCorresponde() {
    const puedeVerRRHH = state.esAdminMaster || state.tienePermisoRRHH;

    if (!puedeVerRRHH) {
        if (unsubscribeEmpleadosRRHH) {
            unsubscribeEmpleadosRRHH();
            unsubscribeEmpleadosRRHH = null;
        }
        state.listaEmpleadosRRHHFirebase = [];
        return;
    }

    if (unsubscribeEmpleadosRRHH) return;

    unsubscribeEmpleadosRRHH = onSnapshot(query(empleadosRRHHRef), (snapshot) => {
        state.listaEmpleadosRRHHFirebase = [];
        snapshot.forEach((docSnap) => {
            state.listaEmpleadosRRHHFirebase.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (state.seccionActual === 'rrhh' && !state.viendoDocumento) {
            cambiarVista('rrhh');
        }
    }, (error) => {
        console.error("Error al escuchar empleados de RRHH:", error);
    });
}

function escucharAusenciasAdmin() {
    if (!state.esAdminAutenticado) {
        if (unsubscribeAusencias) {
            unsubscribeAusencias();
            unsubscribeAusencias = null;
        }
        if (unsubscribeAjustesVacaciones) {
            unsubscribeAjustesVacaciones();
            unsubscribeAjustesVacaciones = null;
        }
        if (unsubscribeReglasVacaciones) {
            unsubscribeReglasVacaciones();
            unsubscribeReglasVacaciones = null;
        }
        state.listaAusenciasFirebase = [];
        state.listaAjustesVacacionesFirebase = [];
        state.listaReglasVacacionesFirebase = [];
        return;
    }

    if (unsubscribeAusencias) return;

    unsubscribeAusencias = onSnapshot(query(ausenciasRef), (snapshot) => {
        state.listaAusenciasFirebase = [];
        snapshot.forEach((docSnap) => {
            state.listaAusenciasFirebase.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (state.seccionActual === 'ausencias' && !state.viendoDocumento) {
            cambiarVista('ausencias');
        }
    }, (error) => {
        console.error("Error al escuchar ausencias:", error);
    });

    if (!unsubscribeAjustesVacaciones) {
        unsubscribeAjustesVacaciones = onSnapshot(query(ajustesVacacionesRef), (snapshot) => {
            state.listaAjustesVacacionesFirebase = [];
            snapshot.forEach((docSnap) => {
                state.listaAjustesVacacionesFirebase.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (state.seccionActual === 'ausencias' && !state.viendoDocumento) {
                cambiarVista('ausencias');
            }
        }, (error) => {
            console.error("Error al escuchar ajustes de vacaciones:", error);
        });
    }

    if (!unsubscribeReglasVacaciones) {
        unsubscribeReglasVacaciones = onSnapshot(query(reglasVacacionesRef), (snapshot) => {
            state.listaReglasVacacionesFirebase = [];
            snapshot.forEach((docSnap) => {
                state.listaReglasVacacionesFirebase.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (state.seccionActual === 'ausencias' && !state.viendoDocumento) {
                cambiarVista('ausencias');
            }
        }, (error) => {
            console.error("Error al escuchar reglas de vacaciones:", error);
        });
    }
}

function escucharDebitosSiCorresponde() {
    const puedeVerDebitos = state.esAdminMaster || state.tienePermisoDebitos;

    if (!puedeVerDebitos) {
        if (unsubscribeDebitosLotes) {
            unsubscribeDebitosLotes();
            unsubscribeDebitosLotes = null;
        }
        if (unsubscribeDebitosPrestaciones) {
            unsubscribeDebitosPrestaciones();
            unsubscribeDebitosPrestaciones = null;
        }
        state.listaDebitosLotesFirebase = [];
        state.listaDebitosPrestacionesFirebase = [];
        return;
    }

    if (!unsubscribeDebitosLotes) {
        unsubscribeDebitosLotes = onSnapshot(query(debitosLotesRef), (snapshot) => {
            state.listaDebitosLotesFirebase = [];
            snapshot.forEach((docSnap) => {
                state.listaDebitosLotesFirebase.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (state.seccionActual === 'debitos' && !state.viendoDocumento) {
                cambiarVista('debitos');
            }
        }, (error) => {
            console.error("Error al escuchar lotes de debitos:", error);
        });
    }

    if (!unsubscribeDebitosPrestaciones) {
        unsubscribeDebitosPrestaciones = onSnapshot(query(debitosPrestacionesRef), (snapshot) => {
            state.listaDebitosPrestacionesFirebase = [];
            snapshot.forEach((docSnap) => {
                state.listaDebitosPrestacionesFirebase.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (state.seccionActual === 'debitos' && !state.viendoDocumento) {
                cambiarVista('debitos');
            }
        }, (error) => {
            console.error("Error al escuchar prestaciones de debitos:", error);
        });
    }
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

function escucharUsuariosAdmin() {
    if (unsubscribeUsuarios) {
        unsubscribeUsuarios();
        unsubscribeUsuarios = null;
    }

    if (!state.esAdminAutenticado) {
        state.listaUsuariosFirebase = [];
        return;
    }

    unsubscribeUsuarios = onSnapshot(usuariosRef, (snapshot) => {
        state.listaUsuariosFirebase = [];
        snapshot.forEach((docSnap) => {
            state.listaUsuariosFirebase.push({ id: docSnap.id, ...docSnap.data() });
        });

        actualizarSelectorVerComo();

        if (state.seccionActual === 'permisos' && !state.viendoDocumento) {
            cambiarVista('permisos');
        }
    }, (error) => {
        console.error("Error al escuchar usuarios:", error);
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
        state.usuarioAutenticadoEmail = user.email;
        state.usuarioActualEmail = user.email;
        state.esAdminAutenticado = esAdminEmail(user.email);
        state.verComoEmail = "";
        actualizarEstadoLogin("Verificando permisos...");

        try {
            await cargarPermisoInicial(state.usuarioActualEmail);
            escucharPermisosUsuario(state.usuarioActualEmail);
            escucharUsuariosAdmin();
            escucharSaldosSiCorresponde();
            escucharEmpleadosRRHHSiCorresponde();
            escucharAusenciasAdmin();
            escucharDebitosSiCorresponde();
        } catch (error) {
            console.error("Error al verificar permisos:", error);
            actualizarEstadoLogin("No se pudieron verificar los permisos. Cerrá sesión y volvé a intentar.");
            return;
        }

        actualizarNombreHeader();
        actualizarSelectorVerComo();

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
        state.usuarioAutenticadoEmail = "";
        state.esAdminAutenticado = false;
        state.verComoEmail = "";
        state.esAdminMaster = false;
        state.tienePermisoSaldos = false;
        state.tienePermisoGuardias = false;
        state.tienePermisoRRHH = false;
        state.tienePermisoVacaciones = false;
        state.tienePermisoDebitos = false;
        state.puedeEditarSaldos = false;
        state.puedeEditarGuardias = false;
        state.puedeEditarRRHH = false;
        state.puedeEditarVacaciones = false;
        state.puedeEditarDebitos = false;
        state.listaPermisosFirebase = [];
        state.listaUsuariosFirebase = [];
        state.listaSaldosFirebase = [];
        state.listaEmpleadosRRHHFirebase = [];
        state.listaAusenciasFirebase = [];
        state.listaAjustesVacacionesFirebase = [];
        state.listaReglasVacacionesFirebase = [];
        state.listaDebitosLotesFirebase = [];
        state.listaDebitosPrestacionesFirebase = [];
        state.debitosImportacionPreview = null;
        state.debitosImportacionArchivoNombre = '';
        state.debitosImportacionFinanciador = '';
        state.debitosImportacionPeriodo = '';
        state.debitosLoteSeleccionadoId = '';
        state.empleadoRRHHEditandoId = null;
        state.ausenciaEditandoId = null;
        state.ajusteVacacionesEditandoId = null;
        state.reglaVacacionesEditandoId = null;
        state.empleadoVacacionesSeleccionadoId = null;
        if (unsubscribePermisos) {
            unsubscribePermisos();
            unsubscribePermisos = null;
        }
        if (unsubscribeSaldos) {
            unsubscribeSaldos();
            unsubscribeSaldos = null;
        }
        if (unsubscribeUsuarios) {
            unsubscribeUsuarios();
            unsubscribeUsuarios = null;
        }
        if (unsubscribeEmpleadosRRHH) {
            unsubscribeEmpleadosRRHH();
            unsubscribeEmpleadosRRHH = null;
        }
        if (unsubscribeAusencias) {
            unsubscribeAusencias();
            unsubscribeAusencias = null;
        }
        if (unsubscribeAjustesVacaciones) {
            unsubscribeAjustesVacaciones();
            unsubscribeAjustesVacaciones = null;
        }
        if (unsubscribeReglasVacaciones) {
            unsubscribeReglasVacaciones();
            unsubscribeReglasVacaciones = null;
        }
        if (unsubscribeDebitosLotes) {
            unsubscribeDebitosLotes();
            unsubscribeDebitosLotes = null;
        }
        if (unsubscribeDebitosPrestaciones) {
            unsubscribeDebitosPrestaciones();
            unsubscribeDebitosPrestaciones = null;
        }
        pantallaLogin.classList.remove('hidden');
        appPrincipal.classList.add('hidden');
        actualizarSelectorVerComo();
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.innerHTML = 'Ingresar';
        }
        if (estadoLogin) estadoLogin.classList.add('hidden');
    }
});
