import { state, archivosDriveBase, baseRecibos } from './app-state.js';
import { db, auth } from './firebase-config.js';
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    deleteField,
    arrayUnion,
    getDocs,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { parsearMontoNumerico, formatearMonedaAR } from './components/saldos.js';
import {
    cerrarModalCobro,
    cerrarModalGestion,
    cerrarModalEditarDoc,
    cerrarModalSugerencia,
    cerrarModalClave,
    cambiarVista,
    abrirModalGestion,
    cerrarModalGuardia
} from './ui.js';

const documentosRef = collection(db, "documentos_dpp_proc");
const sugerenciasRef = collection(db, "sugerencias");
const saldosRef = collection(db, "saldos");
const permisosRef = collection(db, "permisos");
const guardiasRef = collection(db, "guardias");

function normalizarEmailPermiso(email) {
    return email.trim().toLowerCase();
}

function activarBotonCarga(btn, texto) {
    if (!btn) return null;

    const htmlOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current inline-block mr-1.5"></span> ${texto}`;
    return htmlOriginal;
}

function restaurarBotonCarga(btn, htmlOriginal) {
    if (!btn || !htmlOriginal) return;

    btn.disabled = false;
    btn.innerHTML = htmlOriginal;
}

function normalizarUrlGoogleDrive(url) {
    if (!url) return '';
    let limpia = url.trim();

    if (limpia.includes('drive.google.com') || limpia.includes('docs.google.com')) {
        if (limpia.endsWith('/preview')) return limpia;

        let base = limpia.split('?')[0];

        if (base.endsWith('/view')) base = base.slice(0, -5);
        if (base.endsWith('/edit')) base = base.slice(0, -5);
        if (base.endsWith('/sharing')) base = base.slice(0, -8);

        if (!base.endsWith('/preview')) {
            if (base.endsWith('/')) base = base.slice(0, -1);
            base = base + '/preview';
        }

        return base;
    }

    return limpia;
}

// CARGA SEMILLA AUTOMATICA
export async function inicializarDocumentosBase() {
    try {
        const snapshot = await getDocs(documentosRef);

        if (snapshot.empty) {
            for (let dpp of archivosDriveBase.dpp) {
                await addDoc(documentosRef, {
                    tipo: 'dpp',
                    nombre: dpp.nombre,
                    area: dpp.area,
                    url: dpp.url,
                    orden: dpp.orden || 1,
                    fechaAlta: new Date()
                });
            }

            for (let proc of archivosDriveBase.procedimientos) {
                await addDoc(documentosRef, {
                    tipo: 'procedimiento',
                    nombre: proc.nombre,
                    fecha: proc.fecha,
                    url: proc.url,
                    orden: proc.orden || 1,
                    materialesDidacticos: proc.materialesDidacticos || [],
                    fechaAlta: new Date()
                });
            }
        }
    } catch (e) {
        console.error("Error en carga base inicial:", e);
    }
}

// PUBLICAR NUEVO DOCUMENTO
export async function guardarNuevoDocumentoFirebase() {
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede agregar documentos.");

    const tipo = document.getElementById('select-tipo-doc').value;
    const ordenInput = document.getElementById('input-orden-doc').value.trim();
    const nombre = document.getElementById('input-nombre-doc').value.trim();
    const areaOFecha = document.getElementById('input-area-doc').value.trim();
    let urlRaw = document.getElementById('input-url-doc').value.trim();

    if (!nombre || !urlRaw) return alert("Por favor, completa el nombre y el enlace de Google Drive.");

    const btnPublicar = document.getElementById('btn-publicar-doc');
    const htmlOriginal = activarBotonCarga(btnPublicar, "Publicando...");

    let urlPreview = normalizarUrlGoogleDrive(urlRaw);

    let numOrden = parseInt(ordenInput);
    if (isNaN(numOrden) || numOrden < 1) numOrden = 99;

    try {
        const timeoutPromesa = new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado.")), 8000));

        const guardadoPromesa = addDoc(documentosRef, {
            tipo: tipo,
            nombre: nombre,
            area: tipo === 'dpp' ? areaOFecha : '',
            fecha: tipo === 'procedimiento' ? areaOFecha : '',
            url: urlPreview,
            orden: numOrden,
            materialesDidacticos: [],
            fechaAlta: new Date()
        });

        await Promise.race([guardadoPromesa, timeoutPromesa]);

        alert(`Excelente Damian. El documento '${nombre}' se publico correctamente.`);

        document.getElementById('input-orden-doc').value = '';
        document.getElementById('input-nombre-doc').value = '';
        document.getElementById('input-area-doc').value = '';
        document.getElementById('input-url-doc').value = '';

    } catch (error) {
        alert("Atencion: " + error.message);
    } finally {
        restaurarBotonCarga(btnPublicar, htmlOriginal);
    }
}

// PROCESAR EDICION DE DOCUMENTO Y GUARDA ANEXOS/MATERIALES DIDACTICOS EN FIRESTORE
export async function procesarEdicionDocFirebase() {
    if (!state.docActualEditarId || !state.esAdminMaster) return;

    const docFind = state.listaDocumentosFirebase.find(d => d.id === state.docActualEditarId);
    if (!docFind) return;

    const nuevoOrden = parseInt(document.getElementById('input-edit-orden').value) || 99;
    const nuevoNombre = document.getElementById('input-edit-nombre').value.trim();
    const nuevoArea = document.getElementById('input-edit-area').value.trim();
    let nuevaUrlRaw = document.getElementById('input-edit-url').value.trim();

    if (!nuevoNombre || !nuevaUrlRaw) return alert("Por favor, completa los campos.");

    let nuevaUrlPreview = normalizarUrlGoogleDrive(nuevaUrlRaw);

    const btnGuardar = document.getElementById('btn-guardar-edit-doc');
    const htmlOriginal = activarBotonCarga(btnGuardar, "Guardando...");

    try {
        const docRef = doc(db, "documentos_dpp_proc", state.docActualEditarId);
        let updateData = {
            orden: nuevoOrden,
            nombre: nuevoNombre,
            url: nuevaUrlPreview
        };

        if (docFind.tipo === 'dpp') updateData.area = nuevoArea;

        if (docFind.tipo === 'procedimiento') {
            updateData.fecha = nuevoArea;
            updateData.materialesDidacticos = state.anexosEditMemoria;
        }

        await updateDoc(docRef, updateData);

        alert("Documento y anexos actualizados con exito.");
        cerrarModalEditarDoc();
    } catch (e) {
        alert("Error al actualizar: " + e.message);
    } finally {
        restaurarBotonCarga(btnGuardar, htmlOriginal);
    }
}

// ELIMINAR DOCUMENTO
export async function eliminarDocumentoFirebase(event, docId) {
    if (event) event.stopPropagation();

    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede eliminar documentos.");

    if (confirm("Estas seguro de que queres eliminar este documento? Esta accion no se puede deshacer.")) {
        try {
            const docRef = doc(db, "documentos_dpp_proc", docId);
            await deleteDoc(docRef);
            alert("Documento eliminado correctamente.");
        } catch (e) {
            alert("Error al eliminar documento: " + e.message);
        }
    }
}

// EVALUAR PERMISOS
export function evaluarPermisosUsuario(email) {
    let mailClean = normalizarEmailPermiso(email);
    state.esAdminMaster = (mailClean === "damirodriguez81@gmail.com");

    const permisoEncontrado = state.listaPermisosFirebase.find(p => p.email && normalizarEmailPermiso(p.email) === mailClean);

    state.tienePermisoSaldos = state.esAdminMaster ||
        (permisoEncontrado && permisoEncontrado.modulos && permisoEncontrado.modulos.includes('saldos'));
}

// REGISTRAR COBRO
export async function procesarCobroFirebase() {
    if (!state.saldoActualCobroId) return;

    const cuenta = state.listaSaldosFirebase.find(c => c.id === state.saldoActualCobroId);
    if (!cuenta) return;

    const fechaPago = document.getElementById('input-fecha-cobro').value;
    const montoAbonado = parseFloat(document.getElementById('input-monto-cobro').value);

    if (!fechaPago) return alert("Por favor, ingresa la fecha del cobro.");
    if (isNaN(montoAbonado) || montoAbonado <= 0) return alert("Por favor, ingresa un monto abonado valido.");

    let saldoActualNum = parsearMontoNumerico(cuenta.saldo);
    let nuevoSaldoNum = saldoActualNum - montoAbonado;

    const cuentaRef = doc(db, "saldos", state.saldoActualCobroId);
    let fechaFormateada = new Date(fechaPago + 'T00:00:00').toLocaleDateString('es-AR');

    if (nuevoSaldoNum <= 0.01) {
        let notaCobro = {
            fecha: new Date().toLocaleString('es-AR'),
            texto: `PAGO TOTAL CANCELADO ($${formatearMonedaAR(montoAbonado)}) el dia ${fechaFormateada}. Cuenta saldada.`,
            autor: state.usuarioActualEmail
        };

        try {
            await updateDoc(cuentaRef, {
                saldada: true,
                fechaSaldada: fechaFormateada,
                montoFinalCobrado: montoAbonado,
                saldo: "$ 0,00",
                gestiones: arrayUnion(notaCobro)
            });

            cerrarModalCobro();
            alert("La cuenta se registro como totalmente saldada.");
        } catch (e) {
            alert("Error al registrar cobro: " + e.message);
        }

    } else {
        let nuevoSaldoTexto = formatearMonedaAR(nuevoSaldoNum);

        let notaCobro = {
            fecha: new Date().toLocaleString('es-AR'),
            texto: `PAGO PARCIAL RECOBRADO: Se abono $${formatearMonedaAR(montoAbonado)} el dia ${fechaFormateada}. Saldo restante: ${nuevoSaldoTexto}.`,
            autor: state.usuarioActualEmail
        };

        try {
            await updateDoc(cuentaRef, {
                saldo: nuevoSaldoTexto,
                gestiones: arrayUnion(notaCobro)
            });

            cerrarModalCobro();
            alert(`Pago parcial registrado. Se desconto $${formatearMonedaAR(montoAbonado)}.`);
        } catch (e) {
            alert("Error al registrar cobro parcial: " + e.message);
        }
    }
}

// TOGGLE PAGARE
export async function togglePagareFirebase(docId, nuevoEstado) {
    const cuentaRef = doc(db, "saldos", docId);

    try {
        await updateDoc(cuentaRef, { tienePagare: nuevoEstado });
    } catch (e) {
        console.error(e);
    }
}

// TOGGLE ACUERDO ESPECIAL
export async function toggleAcuerdoEspecialFirebase(docId, nuevoEstado) {
    const cuentaRef = doc(db, "saldos", docId);

    try {
        await updateDoc(cuentaRef, { acuerdoEspecial: nuevoEstado });
    } catch (e) {
        console.error(e);
    }
}

// EDITAR NOTA DE GESTION
export async function editarGestionFirebase(docId, indexGestion) {
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede editar notas de gestion.");

    const cuenta = state.listaSaldosFirebase.find(c => c.id === docId);
    if (!cuenta || !cuenta.gestiones || !cuenta.gestiones[indexGestion]) return;

    let textoActual = cuenta.gestiones[indexGestion].texto;
    let nuevoTexto = prompt("Modificar mensaje de gestion:", textoActual);

    if (nuevoTexto !== null && nuevoTexto.trim() !== "") {
        let gestionesCopia = [...cuenta.gestiones];
        gestionesCopia[indexGestion].texto = nuevoTexto.trim();

        const cuentaRef = doc(db, "saldos", docId);

        try {
            await updateDoc(cuentaRef, { gestiones: gestionesCopia });
            abrirModalGestion(docId);
        } catch (e) {
            alert("Error al editar gestion: " + e.message);
        }
    }
}

// OTORGAR PERMISO
export async function otorgarPermisoFirebase() {
    const emailInput = normalizarEmailPermiso(document.getElementById('input-email-permiso').value);
    const moduloSelected = document.getElementById('select-modulo-permiso').value;

    if (!emailInput) return alert("Por favor, ingresa el correo del colaborador.");
    if (emailInput.includes('/')) return alert("El correo ingresado no puede contener barras (/).");

    const btnOtorgar = document.getElementById('btn-otorgar-permiso');
    const htmlOriginal = activarBotonCarga(btnOtorgar, "Guardando...");

    const permisoExistente = state.listaPermisosFirebase.find(p => p.email && normalizarEmailPermiso(p.email) === emailInput);
    const modulosActuales = permisoExistente && Array.isArray(permisoExistente.modulos) ? [...permisoExistente.modulos] : [];
    const yaTeniaModulo = modulosActuales.includes(moduloSelected);

    if (!yaTeniaModulo) {
        modulosActuales.push(moduloSelected);
    }

    try {
        const permisoCanonicoRef = doc(db, "permisos", emailInput);

        await setDoc(permisoCanonicoRef, {
            email: emailInput,
            modulos: modulosActuales,
            fechaAlta: permisoExistente && permisoExistente.fechaAlta ? permisoExistente.fechaAlta : new Date(),
            fechaActualizacion: new Date()
        }, { merge: true });

        if (permisoExistente && permisoExistente.id !== emailInput) {
            await deleteDoc(doc(db, "permisos", permisoExistente.id));
        }

        if (yaTeniaModulo) {
            alert(`El usuario ${emailInput} ya cuenta con acceso a este modulo. Se verifico el formato del permiso.`);
        } else {
            alert(`Acceso al modulo '${moduloSelected}' agregado a ${emailInput}.`);
        }

        document.getElementById('input-email-permiso').value = '';
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        restaurarBotonCarga(btnOtorgar, htmlOriginal);
    }
}

// REVOCAR PERMISO
export async function revocarPermisoFirebase(docId) {
    if (confirm("Estas seguro de que queres revocar los accesos de este usuario?")) {
        try {
            await deleteDoc(doc(db, "permisos", docId));
            alert("Permisos revocados con exito.");
        } catch (e) {
            alert("Error al revocar permisos: " + e.message);
        }
    }
}

// ACTUALIZAR CAMPO DE SALDOS EN LINEA
export async function actualizarCampoFirebase(docId, campo, valor) {
    const cuentaRef = doc(db, "saldos", docId);

    try {
        await updateDoc(cuentaRef, { [campo]: valor.trim() });
    } catch (e) {
        console.error(e);
    }
}

// ELIMINAR SALDOS SELECCIONADOS
export async function eliminarSaldosSeleccionados() {
    if (!state.esAdminMaster) return alert("No tenes permisos para eliminar registros.");

    const checks = document.querySelectorAll('.check-saldo-fbre:checked');

    if (checks.length === 0) return alert("Por favor, selecciona al menos un paciente para eliminar.");

    if (confirm(`Estas seguro de que queres eliminar ${checks.length} cuentas de la base de datos? Esta accion no se puede deshacer.`)) {
        try {
            for (let check of checks) {
                let docId = check.getAttribute('data-id');
                await deleteDoc(doc(db, "saldos", docId));
            }

            alert("Cuentas eliminadas correctamente.");
            cambiarVista('saldos');
        } catch (e) {
            alert("Error al eliminar saldos: " + e.message);
        }
    }
}

// GUARDAR SALDOS IMPORTADOS DESDE CSV
export async function guardarSaldosSeleccionados() {
    const checks = document.querySelectorAll('.check-saldo:checked');
    let cuentasAGuardar = [];

    checks.forEach(check => {
        let index = check.getAttribute('data-index');
        cuentasAGuardar.push(state.datosCSVPrecargados[index]);
    });

    if (cuentasAGuardar.length === 0) return alert("Debes seleccionar al menos una cuenta para guardar.");

    const btnGuardar = document.getElementById('btn-guardar-saldos');
    const htmlOriginal = activarBotonCarga(btnGuardar, "Guardando...");

    try {
        for (let cuenta of cuentasAGuardar) {
            await addDoc(saldosRef, {
                paciente: cuenta.paciente,
                obraSocial: "",
                practica: "",
                acuerdoEspecial: false,
                tienePagare: false,
                saldada: false,
                ultimoPago: cuenta.ultimoPago,
                periodo: cuenta.periodo,
                fecha: cuenta.fecha,
                comprobante: cuenta.comprobante,
                importeOrig: cuenta.importeOrig,
                saldo: cuenta.saldo,
                gestiones: [],
                fechaAlta: new Date()
            });
        }

        state.datosCSVPrecargados = [];

        const inputCsv = document.getElementById('input-csv');
        if (inputCsv) inputCsv.value = '';

        alert(`${cuentasAGuardar.length} cuentas unificadas se guardaron exitosamente en Firebase.`);
        cambiarVista('saldos');
    } catch (e) {
        alert("Error al guardar saldos: " + e.message);
    } finally {
        restaurarBotonCarga(btnGuardar, htmlOriginal);
    }
}

// GUARDAR NUEVA NOTA DE GESTION
export async function guardarNuevaGestion() {
    const texto = document.getElementById('texto-nueva-gestion').value.trim();

    if (!texto) return alert("Por favor, escribi un detalle de la gestion.");

    const cuentaRef = doc(db, "saldos", state.saldoActualGestionId);

    const nuevaGestion = {
        fecha: new Date().toLocaleString('es-AR'),
        texto: texto,
        autor: state.usuarioActualEmail
    };

    try {
        await updateDoc(cuentaRef, { gestiones: arrayUnion(nuevaGestion) });
        document.getElementById('texto-nueva-gestion').value = '';
        cerrarModalGestion();
    } catch (e) {
        alert("Hubo un error al guardar: " + e.message);
    }
}

// GUARDAR SUGERENCIA / IDEA
export async function guardarSugerenciaFirebase() {
    const texto = document.getElementById('texto-sugerencia').value.trim();
    const esAnonimo = document.getElementById('check-anonimo').checked;
    const btnPublicar = document.querySelector('#modal-sugerencia button[onclick="window.guardarSugerenciaFirebase()"]');
    const htmlOriginal = activarBotonCarga(btnPublicar, "Publicando...");

    if (!texto) {
        restaurarBotonCarga(btnPublicar, htmlOriginal);
        return alert("Por favor, escribi un texto para tu idea.");
    }

    let nombreAutor = "Anonimo";

    if (!esAnonimo) {
        const empleadoEncontrado = baseRecibos.find(emp => emp.email.toLowerCase().trim() === state.usuarioActualEmail.toLowerCase().trim());

        if (empleadoEncontrado) {
            let partesDelNombre = empleadoEncontrado.nombre.trim().split(/\s+/);
            nombreAutor = partesDelNombre.pop();
        }
    }

    const nuevaIdea = {
        texto: texto,
        color: state.colorPostitSeleccionado,
        autor: nombreAutor,
        emailAutor: state.usuarioActualEmail.toLowerCase(),
        archivada: false,
        fecha: new Date().toLocaleDateString('es-AR'),
        fechaCreacion: new Date(),
        votosMap: {}
    };

    try {
        const docCreado = await addDoc(sugerenciasRef, nuevaIdea);
        state.listaSugerencias.unshift({ id: docCreado.id, ...nuevaIdea });
        cerrarModalSugerencia();

        if (state.seccionActual === 'sugerencias') {
            cambiarVista('sugerencias');
        }
    } catch (error) {
        alert("Error al guardar: " + error.message);
    } finally {
        restaurarBotonCarga(btnPublicar, htmlOriginal);
    }
}

// REACCIONAR A SUGERENCIA
export async function reaccionarFirebase(docId, tipoReaccion) {
    if (!state.usuarioActualEmail) return;

    const sugerenciaDocRef = doc(db, "sugerencias", docId);
    const sug = state.listaSugerencias.find(s => s.id === docId);

    if (!sug) return;

    let userKey = state.usuarioActualEmail.toLowerCase().replace(/\./g, '_');
    let votosMap = sug.votosMap || {};
    let votoAnterior = votosMap[userKey];
    let cambios = {};

    if (votoAnterior === tipoReaccion) {
        cambios[`votosMap.${userKey}`] = deleteField();
    } else {
        cambios[`votosMap.${userKey}`] = tipoReaccion;
    }

    try {
        await updateDoc(sugerenciaDocRef, cambios);
    } catch (error) {
        console.error(error);
    }
}

// ELIMINAR SUGERENCIA
export async function eliminarSugerenciaFirebase(docId, event) {
    if (event) event.stopPropagation();

    if (confirm("Estas seguro de que queres eliminar esta sugerencia?")) {
        const btnEliminar = event ? event.currentTarget : null;
        const htmlOriginal = activarBotonCarga(btnEliminar, "Eliminando...");

        try {
            await deleteDoc(doc(db, "sugerencias", docId));
            state.listaSugerencias = state.listaSugerencias.filter(s => s.id !== docId);

            if (state.seccionActual === 'sugerencias') {
                cambiarVista('sugerencias');
            }
        } catch (e) {
            alert("Error al eliminar sugerencia: " + e.message);
            restaurarBotonCarga(btnEliminar, htmlOriginal);
        }
    }
}

// ARCHIVAR SUGERENCIA
export async function archivarSugerenciaFirebase(docId, nuevoEstadoArchivado, event) {
    if (event) event.stopPropagation();
    if (!state.esAdminMaster) return;

    const btnArchivar = event ? event.currentTarget : null;
    const htmlOriginal = activarBotonCarga(btnArchivar, nuevoEstadoArchivado ? "Archivando..." : "Restaurando...");

    try {
        await updateDoc(doc(db, "sugerencias", docId), { archivada: nuevoEstadoArchivado });

        const sugerencia = state.listaSugerencias.find(s => s.id === docId);
        if (sugerencia) sugerencia.archivada = nuevoEstadoArchivado;

        if (state.seccionActual === 'sugerencias') {
            cambiarVista('sugerencias');
        }
    } catch (e) {
        alert("Error al actualizar sugerencia: " + e.message);
        restaurarBotonCarga(btnArchivar, htmlOriginal);
    }
}

// INICIAR SESION
export async function iniciarSesionFirebase() {
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;

    if (!email || !password) return alert("Por favor, completa todos los datos.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        alert("Error al iniciar sesion. Verifica tus credenciales.");
    }
}

// RECUPERAR CLAVE
export async function recuperarClaveFirebase() {
    const email = document.getElementById('input-email').value;

    if (!email) return alert("Ingresa tu correo arriba.");

    try {
        await sendPasswordResetEmail(auth, email);
        alert("Correo de recuperacion enviado.");
    } catch (e) {
        alert("Error al procesar recuperacion.");
    }
}

// CERRAR SESION
export async function cerrarSesion() {
    try {
        await signOut(auth);
        document.getElementById('input-password').value = '';
        document.getElementById('input-email').value = '';
    } catch (e) {
        console.error(e);
    }
}

// CAMBIAR CLAVE
export async function cambiarClaveFirebase() {
    const user = auth.currentUser;
    const nuevaClave = document.getElementById('input-nueva-clave').value;

    if (!nuevaClave || nuevaClave.length < 6) return alert("Minimo 6 caracteres.");

    if (user) {
        try {
            await updatePassword(user, nuevaClave);
            alert("Clave actualizada.");
            cerrarModalClave();
        } catch (e) {
            alert("Por seguridad, cerra sesion y volve a ingresar.");
        }
    }
}

// GUARDAR GUARDIA PASIVA
export async function guardarGuardiaFirebase() {
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede gestionar guardias.");
    if (!state.guardiaDiaSeleccionado) return;

    const emailColab = document.getElementById('select-colaborador-guardia').value;
    const esFeriado = document.getElementById('check-feriado-guardia').checked;
    const notas = document.getElementById('texto-notes-guardia').value.trim();

    if (!emailColab && !esFeriado && !notas) {
        return eliminarGuardiaFirebase();
    }

    let nombreColab = "";

    if (emailColab) {
        const emp = baseRecibos.find(e => e.email.toLowerCase().trim() === emailColab.toLowerCase().trim());
        if (emp) nombreColab = emp.nombre;
    }

    try {
        const docRef = doc(db, "guardias", state.guardiaDiaSeleccionado);

        await setDoc(docRef, {
            fecha: state.guardiaDiaSeleccionado,
            colaboradorEmail: emailColab,
            colaboradorNombre: nombreColab,
            feriado: esFeriado,
            notas: notas,
            fechaAlta: new Date()
        });

        cerrarModalGuardia();
    } catch (e) {
        alert("Error al guardar guardia: " + e.message);
    }
}

// ELIMINAR GUARDIA PASIVA
export async function eliminarGuardiaFirebase() {
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede gestionar guardias.");
    if (!state.guardiaDiaSeleccionado) return;

    if (confirm("Estas seguro de que queres eliminar la asignacion de este dia?")) {
        try {
            const docRef = doc(db, "guardias", state.guardiaDiaSeleccionado);
            await deleteDoc(docRef);
            cerrarModalGuardia();
        } catch (e) {
            alert("Error al eliminar la guardia: " + e.message);
        }
    }
}