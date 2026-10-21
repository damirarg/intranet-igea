import { state, archivosDriveBase, baseRecibos } from './app-state.js';
import { db, auth, functions } from './firebase-config.js';
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
import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { parsearMontoNumerico, formatearMonedaAR } from './components/saldos.js';
import {
    cerrarModalCobro,
    cerrarModalGestion,
    cerrarModalEditarDoc,
    cerrarModalSugerencia,
    cerrarModalClave,
    cambiarVista,
    abrirModalGestion,
    cerrarModalGuardia,
    cerrarModalGuardiasPeriodo,
    cerrarModalNovedadInicio,
    renderizarGestionNovedadesInicio
} from './ui.js?v=20261021-areas-rrhh';

const documentosRef = collection(db, "documentos_dpp_proc");
const sugerenciasRef = collection(db, "sugerencias");
const saldosRef = collection(db, "saldos");
const permisosRef = collection(db, "permisos");
const empleadosRRHHRef = collection(db, "empleados_rrhh");
const areasRRHHRef = collection(db, "rrhh_areas");
const guardiasRef = collection(db, "guardias");
const novedadesRef = collection(db, "novedades");
const ausenciasRef = collection(db, "ausencias");
const ajustesVacacionesRef = collection(db, "vacaciones_ajustes");
const reglasVacacionesRef = collection(db, "vacaciones_reglas");
const crearUsuarioIntranetFn = httpsCallable(functions, "crearUsuarioIntranet");
const enviarResetClaveUsuarioFn = httpsCallable(functions, "enviarResetClaveUsuario");
const cambiarEmailUsuarioIntranetFn = httpsCallable(functions, "cambiarEmailUsuarioIntranet");
const actualizarNombreUsuarioIntranetFn = httpsCallable(functions, "actualizarNombreUsuarioIntranet");
const cambiarEstadoUsuarioIntranetFn = httpsCallable(functions, "cambiarEstadoUsuarioIntranet");
const sincronizarUsuariosDesdePermisosFn = httpsCallable(functions, "sincronizarUsuariosDesdePermisos");
const MODULOS_GESTIONABLES = ["saldos", "guardias", "rrhh", "vacaciones", "capacitaciones"];

function slugRRHH(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export async function inicializarAreasRRHHFirebase() {
    if (!state.esAdminAutenticado) return;
    const iniciales = [
        { id: 'administracion', nombre: 'Administración', orden: 1, activa: true, subareas: [
            { valor: 'admision', texto: 'Admisión', activa: true }, { valor: 'coordinacion', texto: 'Coordinación', activa: true }, { valor: 'atencion_telefonica', texto: 'Atención Telefónica', activa: true }, { valor: 'tesoreria', texto: 'Tesorería', activa: true }, { valor: 'facturacion', texto: 'Facturación', activa: true }
        ]},
        { id: 'asistencial', nombre: 'Asistencial', orden: 2, activa: true, subareas: [
            { valor: 'coordinacion', texto: 'Coordinación', activa: true }, { valor: 'coordinacion_asistentes_endoscopia', texto: 'Coordinación de Asistentes de Endoscopía', activa: true }, { valor: 'asistentes_endoscopia', texto: 'Asistentes de Endoscopía', activa: true }
        ]}
    ];
    await Promise.all(iniciales.map(({ id, ...datos }) => setDoc(doc(areasRRHHRef, id), datos)));
}

export async function guardarNuevaAreaRRHHFirebase() {
    if (bloquearCambiosEnModoVerComo() || !state.esAdminMaster) return;
    const input = document.getElementById('nueva-area-rrhh');
    const nombre = input.value.trim();
    const id = slugRRHH(nombre);
    if (!nombre || !id) return alert('Ingresá un nombre de área válido.');
    if ((state.listaAreasRRHHFirebase || []).some(area => area.id === id)) return alert('Ya existe un área con ese nombre.');
    await setDoc(doc(areasRRHHRef, id), { nombre, activa: true, orden: (state.listaAreasRRHHFirebase || []).length + 1, subareas: [] });
    input.value = '';
}

export async function actualizarAreaRRHHFirebase(id) {
    if (bloquearCambiosEnModoVerComo() || !state.esAdminMaster) return;
    const nombre = document.getElementById(`nombre-area-rrhh-${id}`).value.trim();
    if (!nombre) return alert('El área debe tener un nombre.');
    await updateDoc(doc(areasRRHHRef, id), { nombre });
}

export async function alternarAreaRRHHFirebase(id, activa) {
    if (bloquearCambiosEnModoVerComo() || !state.esAdminMaster) return;
    await updateDoc(doc(areasRRHHRef, id), { activa });
}

export async function agregarSubareaRRHHFirebase(areaId) {
    if (bloquearCambiosEnModoVerComo() || !state.esAdminMaster) return;
    const input = document.getElementById(`nueva-subarea-rrhh-${areaId}`);
    const texto = input.value.trim();
    const valor = slugRRHH(texto);
    const area = (state.listaAreasRRHHFirebase || []).find(item => item.id === areaId);
    if (!texto || !valor || !area) return alert('Ingresá un nombre de subárea válido.');
    if ((area.subareas || []).some(item => item.valor === valor)) return alert('La subárea ya existe.');
    await updateDoc(doc(areasRRHHRef, areaId), { subareas: [...(area.subareas || []), { valor, texto, activa: true }] });
    input.value = '';
}

export async function actualizarSubareaRRHHFirebase(areaId, subareaId) {
    if (bloquearCambiosEnModoVerComo() || !state.esAdminMaster) return;
    const area = (state.listaAreasRRHHFirebase || []).find(item => item.id === areaId);
    const texto = document.getElementById(`nombre-subarea-rrhh-${areaId}-${subareaId}`).value.trim();
    if (!area || !texto) return;
    await updateDoc(doc(areasRRHHRef, areaId), { subareas: (area.subareas || []).map(item => item.valor === subareaId ? { ...item, texto } : item) });
}

export async function alternarSubareaRRHHFirebase(areaId, subareaId, activa) {
    if (bloquearCambiosEnModoVerComo() || !state.esAdminMaster) return;
    const area = (state.listaAreasRRHHFirebase || []).find(item => item.id === areaId);
    if (!area) return;
    await updateDoc(doc(areasRRHHRef, areaId), { subareas: (area.subareas || []).map(item => item.valor === subareaId ? { ...item, activa } : item) });
}

function normalizarEmailPermiso(email) {
    return email.trim().toLowerCase();
}

function obtenerNivelPermiso(permiso, modulo) {
    if (!permiso) return 'none';

    const permisosPorModulo = permiso.permisosPorModulo || {};
    const nivel = permisosPorModulo[modulo];

    if (nivel === 'ver' || nivel === 'editar') return nivel;

    return Array.isArray(permiso.modulos) && permiso.modulos.includes(modulo) ? 'editar' : 'none';
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

function bloquearCambiosEnModoVerComo() {
    if (!state.verComoEmail) return false;

    alert("Estás usando 'Ver como'. Es una vista de prueba: volvé a Vista administrador para guardar cambios.");
    return true;
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

function sanitizarHTMLNovedad(html) {
    const documento = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const permitidos = new Set(['DIV', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U']);
    const limpiar = nodo => {
        [...nodo.childNodes].forEach(hijo => {
            if (hijo.nodeType === Node.ELEMENT_NODE) {
                limpiar(hijo);
                if (!permitidos.has(hijo.tagName)) {
                    hijo.replaceWith(...hijo.childNodes);
                } else {
                    [...hijo.attributes].forEach(atributo => hijo.removeAttribute(atributo.name));
                }
            }
        });
    };
    const raiz = documento.body.firstElementChild;
    limpiar(raiz);
    return raiz.innerHTML;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    const nivelSaldos = state.esAdminMaster ? 'editar' : obtenerNivelPermiso(permisoEncontrado, 'saldos');
    const nivelGuardias = state.esAdminMaster ? 'editar' : obtenerNivelPermiso(permisoEncontrado, 'guardias');
    const nivelRRHH = state.esAdminMaster ? 'editar' : obtenerNivelPermiso(permisoEncontrado, 'rrhh');
    const nivelVacaciones = state.esAdminMaster ? 'editar' : obtenerNivelPermiso(permisoEncontrado, 'vacaciones');
    const nivelCapacitaciones = state.esAdminMaster ? 'editar' : obtenerNivelPermiso(permisoEncontrado, 'capacitaciones');

    state.tienePermisoSaldos = nivelSaldos !== 'none';
    state.tienePermisoGuardias = nivelGuardias !== 'none';
    state.tienePermisoRRHH = nivelRRHH !== 'none';
    state.tienePermisoVacaciones = nivelVacaciones !== 'none';

    state.puedeEditarSaldos = nivelSaldos === 'editar';
    state.puedeEditarGuardias = nivelGuardias === 'editar';
    state.puedeEditarRRHH = nivelRRHH === 'editar';
    state.puedeEditarVacaciones = nivelVacaciones === 'editar';
    state.puedeEditarCapacitaciones = nivelCapacitaciones === 'editar';
}

function valorInput(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : '';
}

function parsearListaFeriados(texto = '') {
    return String(texto)
        .split(/\s+/)
        .map(fecha => fecha.trim())
        .filter(fecha => /^\d{4}-\d{2}-\d{2}$/.test(fecha));
}

function aniosEnRango(fechaDesde = '', fechaHasta = '') {
    const desde = parsearFechaLocal(fechaDesde);
    const hasta = parsearFechaLocal(fechaHasta);
    if (!desde || !hasta || hasta < desde) return [];

    const anios = [];
    for (let anio = desde.getFullYear(); anio <= hasta.getFullYear(); anio++) {
        anios.push(anio);
    }
    return anios;
}

function feriadosArgentinaRango(fechaDesde = '', fechaHasta = '') {
    return aniosEnRango(fechaDesde, fechaHasta)
        .flatMap(anio => combinarFeriadosIGEA(anio, state.feriadosArgentinaPorAnio[anio] || []))
        .map(f => f.date)
        .filter(Boolean);
}

function feriadosLocalesIGEA(anio) {
    return [
        { date: `${anio}-04-11`, name: 'Aniversario de Bahía Blanca', nationalHoliday: false, localHoliday: true },
        { date: `${anio}-09-21`, name: 'Día de la Sanidad', nationalHoliday: false, localHoliday: true }
    ];
}

function combinarFeriadosIGEA(anio, feriados = []) {
    const mapa = new Map();

    [...(feriados || []), ...feriadosLocalesIGEA(anio)].forEach(feriado => {
        if (feriado?.date) mapa.set(feriado.date, feriado);
    });

    return Array.from(mapa.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function asegurarFeriadosArgentinaRango(fechaDesde = '', fechaHasta = '') {
    const aniosPendientes = aniosEnRango(fechaDesde, fechaHasta)
        .filter(anio => !state.feriadosArgentinaPorAnio[anio]);

    await Promise.all(aniosPendientes.map(async (anio) => {
        try {
            const respuesta = await fetch(`https://date.nager.at/api/v4/Holidays/AR/${anio}`);
            if (!respuesta.ok) throw new Error("No se pudieron cargar feriados.");
            const datos = await respuesta.json();
            state.feriadosArgentinaPorAnio[anio] = combinarFeriadosIGEA(anio, datos
                .filter(f => f.date)
                .map(f => ({
                    date: f.date,
                    name: f.localName || f.name || 'Feriado',
                    nationalHoliday: f.nationalHoliday !== false
                })));
        } catch (error) {
            console.warn("No se pudieron cargar feriados de Argentina:", error);
            state.feriadosArgentinaPorAnio[anio] = feriadosLocalesIGEA(anio);
        }
    }));
}

function parsearFechaLocal(fechaISO = '') {
    if (!fechaISO) return null;
    const [anio, mes, dia] = String(fechaISO).split('-').map(Number);
    if (!anio || !mes || !dia) return null;
    return new Date(anio, mes - 1, dia);
}

function fechaAISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function calcularDiasAusenciaCCT108(fechaDesde = '', fechaHasta = '', feriados = []) {
    const desde = parsearFechaLocal(fechaDesde);
    const hasta = parsearFechaLocal(fechaHasta);
    if (!desde || !hasta || hasta < desde) return 0;

    const feriadosSet = new Set((feriados || []).map(f => String(f).trim()).filter(Boolean));
    let total = 0;
    const cursor = new Date(desde);

    while (cursor <= hasta) {
        const iso = fechaAISO(cursor);
        const esDomingo = cursor.getDay() === 0;
        if (!esDomingo && !feriadosSet.has(iso)) total++;
        cursor.setDate(cursor.getDate() + 1);
    }

    return total;
}

function contarDiasCalendario(fechaDesde = '', fechaHasta = '') {
    const desde = parsearFechaLocal(fechaDesde);
    const hasta = parsearFechaLocal(fechaHasta);
    if (!desde || !hasta || hasta < desde) return 0;
    const msPorDia = 24 * 60 * 60 * 1000;
    return Math.round((hasta - desde) / msPorDia) + 1;
}

function nombreEmpleadoRRHH(empleado = {}) {
    const apellidos = String(empleado.apellidos || '').trim();
    const nombres = String(empleado.nombres || '').trim();
    if (apellidos && nombres) return `${apellidos}, ${nombres}`;
    return empleado.nombreCompleto || apellidos || nombres || '';
}

// GUARDAR AUSENCIA
export async function guardarAusenciaFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Por ahora el módulo de Ausencias sólo puede editarlo el Administrador Principal.");

    const ausenciaId = valorInput('input-id-ausencia');
    const empleadoId = valorInput('input-empleado-ausencia');
    const tipo = valorInput('input-tipo-ausencia');
    const estado = valorInput('input-estado-ausencia') || 'aprobado';
    const fechaDesde = valorInput('input-fecha-desde-ausencia');
    const fechaHasta = valorInput('input-fecha-hasta-ausencia');
    const feriadosManuales = parsearListaFeriados(valorInput('input-feriados-ausencia'));
    const notas = valorInput('input-notas-ausencia');
    const descuentaVacaciones = document.getElementById('input-descuenta-vacaciones-ausencia')?.checked === true;

    if (!empleadoId) return alert("Seleccioná un empleado.");
    if (!tipo) return alert("Seleccioná el tipo de ausencia.");
    if (!fechaDesde || !fechaHasta) return alert("Completá fecha desde y fecha hasta.");
    if (fechaHasta < fechaDesde) return alert("La fecha hasta no puede ser anterior a la fecha desde.");

    const empleado = state.listaEmpleadosRRHHFirebase.find(e => e.id === empleadoId);
    if (!empleado) return alert("No se encontró la ficha del empleado.");

    await asegurarFeriadosArgentinaRango(fechaDesde, fechaHasta);

    const feriados = [...new Set([...feriadosManuales, ...feriadosArgentinaRango(fechaDesde, fechaHasta)])];
    const diasComputables = calcularDiasAusenciaCCT108(fechaDesde, fechaHasta, feriados);
    const diasCalendario = contarDiasCalendario(fechaDesde, fechaHasta);
    const diasADescontar = descuentaVacaciones ? diasComputables : 0;
    const btnGuardar = document.getElementById('btn-guardar-ausencia');
    const htmlOriginal = activarBotonCarga(btnGuardar, "Guardando...");

    const data = {
        empleadoId,
        empleadoNombre: nombreEmpleadoRRHH(empleado),
        empleadoEmail: empleado.emailIntranet || '',
        empleadoArea: empleado.area || '',
        empleadoSubarea: empleado.subarea || '',
        tipo,
        estado,
        fechaDesde,
        fechaHasta,
        feriados,
        feriadosManuales,
        descuentaVacaciones,
        diasComputables,
        diasCalendario,
        diasADescontar,
        notas,
        fechaActualizacion: new Date(),
        actualizadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
    };

    try {
        if (ausenciaId) {
            await updateDoc(doc(db, "ausencias", ausenciaId), data);
            state.ausenciaEditandoId = null;
            alert("Ausencia actualizada correctamente.");
        } else {
            await addDoc(ausenciasRef, {
                ...data,
                fechaAlta: new Date(),
                creadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
            });
            alert("Ausencia cargada correctamente.");
        }

        const anioCarga = parseInt(String(fechaDesde).slice(0, 4), 10);
        if (!Number.isNaN(anioCarga)) state.filtroAnioAusencias = anioCarga;
        state.vacacionesFechaInicio = fechaDesde;
        state.empleadoVacacionesSeleccionadoId = empleadoId;

        cambiarVista('ausencias');
    } catch (error) {
        alert("Error al guardar ausencia: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btnGuardar, htmlOriginal);
    }
}

export function editarAusenciaFirebase(id) {
    state.ausenciaEditandoId = id;
    cambiarVista('ausencias');
}

export function cancelarEdicionAusenciaFirebase() {
    state.ausenciaEditandoId = null;
    cambiarVista('ausencias');
}

export async function eliminarAusenciaFirebase(id) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Por ahora el módulo de Ausencias sólo puede editarlo el Administrador Principal.");
    if (!confirm("¿Confirmás eliminar esta ausencia?")) return;

    try {
        await deleteDoc(doc(db, "ausencias", id));
        if (state.ausenciaEditandoId === id) state.ausenciaEditandoId = null;
        alert("Ausencia eliminada correctamente.");
    } catch (error) {
        alert("Error al eliminar ausencia: " + (error.message || "No se pudo completar la operación."));
    }
}

// GUARDAR AJUSTE DE VACACIONES
export async function guardarAjusteVacacionesFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Por ahora los saldos de vacaciones sólo puede editarlos el Administrador Principal.");

    const ajusteId = valorInput('input-id-ajuste-vacaciones');
    const empleadoId = valorInput('input-empleado-ajuste-vacaciones');
    const dias = Number(valorInput('input-dias-ajuste-vacaciones'));
    const anio = Number(valorInput('input-anio-ajuste-vacaciones'));
    const tipo = valorInput('input-tipo-ajuste-vacaciones') || 'carga_manual';
    const fecha = valorInput('input-fecha-ajuste-vacaciones');
    const notas = valorInput('input-notas-ajuste-vacaciones');

    if (!empleadoId) return alert("Seleccioná un empleado.");
    if (!Number.isFinite(dias) || dias === 0) return alert("Ingresá la cantidad de días. Puede ser positiva o negativa.");
    if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) return alert("Ingresá un año válido.");
    if (!fecha) return alert("Ingresá la fecha del ajuste.");

    const empleado = state.listaEmpleadosRRHHFirebase.find(e => e.id === empleadoId);
    if (!empleado) return alert("No se encontró la ficha del empleado.");

    const btnGuardar = document.getElementById('btn-guardar-ajuste-vacaciones');
    const htmlOriginal = activarBotonCarga(btnGuardar, "Guardando...");
    const data = {
        empleadoId,
        empleadoNombre: nombreEmpleadoRRHH(empleado),
        empleadoEmail: empleado.emailIntranet || '',
        empleadoArea: empleado.area || '',
        empleadoSubarea: empleado.subarea || '',
        dias,
        anio,
        tipo,
        fecha,
        notas,
        fechaActualizacion: new Date(),
        actualizadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
    };

    try {
        if (ajusteId) {
            await updateDoc(doc(db, "vacaciones_ajustes", ajusteId), data);
            state.ajusteVacacionesEditandoId = null;
            alert("Ajuste actualizado correctamente.");
        } else {
            await addDoc(ajustesVacacionesRef, {
                ...data,
                fechaAlta: new Date(),
                creadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
            });
            alert("Ajuste cargado correctamente.");
        }

        cambiarVista('ausencias');
    } catch (error) {
        alert("Error al guardar ajuste: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btnGuardar, htmlOriginal);
    }
}

export async function eliminarAjusteVacacionesFirebase(id) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Por ahora los saldos de vacaciones sólo puede editarlos el Administrador Principal.");
    if (!confirm("¿Confirmás eliminar este ajuste de vacaciones?")) return;

    try {
        await deleteDoc(doc(db, "vacaciones_ajustes", id));
        if (state.ajusteVacacionesEditandoId === id) state.ajusteVacacionesEditandoId = null;
        alert("Ajuste eliminado correctamente.");
    } catch (error) {
        alert("Error al eliminar ajuste: " + (error.message || "No se pudo completar la operación."));
    }
}

// GUARDAR REGLA ESPECIAL DE VACACIONES
export async function guardarReglaVacacionesFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Por ahora las reglas de vacaciones sólo puede editarlas el Administrador Principal.");

    const reglaId = valorInput('input-id-regla-vacaciones');
    const nombre = valorInput('input-nombre-regla-vacaciones');
    const dias = Number(valorInput('input-dias-regla-vacaciones'));
    const anioDesde = Number(valorInput('input-anio-desde-regla-vacaciones'));
    const anioHastaValor = valorInput('input-anio-hasta-regla-vacaciones');
    const anioHasta = anioHastaValor ? Number(anioHastaValor) : null;
    const tipo = valorInput('input-tipo-regla-vacaciones') || 'acuerdo_especial';
    const notas = valorInput('input-notas-regla-vacaciones');
    const empleadosSelect = document.getElementById('input-empleados-regla-vacaciones');
    const empleadosIds = empleadosSelect
        ? Array.from(empleadosSelect.selectedOptions).map(op => op.value).filter(Boolean)
        : [];

    if (!nombre) return alert("Ingresá un nombre para la regla.");
    if (!Number.isFinite(dias) || dias === 0) return alert("Ingresá la cantidad de días anuales. Puede ser positiva o negativa.");
    if (!Number.isInteger(anioDesde) || anioDesde < 2020 || anioDesde > 2100) return alert("Ingresá un año de inicio válido.");
    if (anioHasta !== null && (!Number.isInteger(anioHasta) || anioHasta < anioDesde || anioHasta > 2100)) return alert("El año hasta debe ser válido y no puede ser anterior al año desde.");
    if (empleadosIds.length === 0) return alert("Seleccioná al menos un empleado para aplicar esta regla.");

    const empleadosAsignados = empleadosIds.map(id => {
        const empleado = state.listaEmpleadosRRHHFirebase.find(e => e.id === id);
        return {
            id,
            nombre: nombreEmpleadoRRHH(empleado || {}),
            email: empleado?.emailIntranet || ''
        };
    });

    const btnGuardar = document.getElementById('btn-guardar-regla-vacaciones');
    const htmlOriginal = activarBotonCarga(btnGuardar, "Guardando...");
    const data = {
        nombre,
        dias,
        anioDesde,
        anioHasta,
        tipo,
        notas,
        empleadosIds,
        empleadosAsignados,
        activa: true,
        fechaActualizacion: new Date(),
        actualizadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
    };

    try {
        if (reglaId) {
            await updateDoc(doc(db, "vacaciones_reglas", reglaId), data);
            state.reglaVacacionesEditandoId = null;
            alert("Regla actualizada correctamente.");
        } else {
            await addDoc(reglasVacacionesRef, {
                ...data,
                fechaAlta: new Date(),
                creadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
            });
            alert("Regla cargada correctamente.");
        }

        cambiarVista('ausencias');
    } catch (error) {
        alert("Error al guardar regla: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btnGuardar, htmlOriginal);
    }
}

export async function eliminarReglaVacacionesFirebase(id) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Por ahora las reglas de vacaciones sólo puede editarlas el Administrador Principal.");
    if (!confirm("¿Confirmás eliminar esta regla de vacaciones?")) return;

    try {
        await deleteDoc(doc(db, "vacaciones_reglas", id));
        if (state.reglaVacacionesEditandoId === id) state.reglaVacacionesEditandoId = null;
        alert("Regla eliminada correctamente.");
    } catch (error) {
        alert("Error al eliminar regla: " + (error.message || "No se pudo completar la operación."));
    }
}

// GUARDAR FICHA DE RRHH
export async function guardarEmpleadoRRHHFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.puedeEditarRRHH) return alert("No tenes permisos para editar RRHH.");

    const empleadoId = valorInput('input-id-empleado-rrhh');
    const apellidos = valorInput('input-apellidos-empleado-rrhh');
    const nombres = valorInput('input-nombres-empleado-rrhh');
    const nombreCompleto = [apellidos, nombres].filter(Boolean).join(', ');
    const fechaSalida = valorInput('input-fecha-salida-empleado-rrhh');
    const motivoSalida = valorInput('input-motivo-salida-empleado-rrhh');

    if (!apellidos || !nombres) return alert("Ingresá apellido/s y nombre/s del empleado.");

    const data = {
        apellidos,
        nombres,
        nombreCompleto,
        fechaIngreso: valorInput('input-fecha-ingreso-empleado-rrhh'),
        area: valorInput('input-area-empleado-rrhh'),
        subarea: valorInput('input-subarea-empleado-rrhh'),
        dni: valorInput('input-dni-empleado-rrhh'),
        cuil: valorInput('input-cuil-empleado-rrhh'),
        fechaNacimiento: valorInput('input-fecha-nacimiento-empleado-rrhh'),
        obraSocial: valorInput('input-obra-social-empleado-rrhh'),
        domicilio: valorInput('input-domicilio-empleado-rrhh'),
        telefono: valorInput('input-telefono-empleado-rrhh'),
        emailIntranet: normalizarEmailPermiso(valorInput('input-email-intranet-empleado-rrhh')),
        fechaSalida,
        motivoSalida,
        archivado: Boolean(fechaSalida || motivoSalida),
        contactoEmergenciaNombre: valorInput('input-contacto-emergencia-empleado-rrhh'),
        contactoEmergenciaTelefono: valorInput('input-telefono-emergencia-empleado-rrhh'),
        notas: valorInput('input-notas-empleado-rrhh'),
        fechaActualizacion: new Date(),
        actualizadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
    };

    try {
        if (empleadoId) {
            await updateDoc(doc(db, "empleados_rrhh", empleadoId), data);
            state.empleadoRRHHEditandoId = null;
            alert("Ficha actualizada correctamente.");
        } else {
            await addDoc(empleadosRRHHRef, {
                ...data,
                fechaAlta: new Date(),
                creadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
            });
            alert("Ficha creada correctamente.");
        }

        cambiarVista('rrhh');
    } catch (error) {
        alert("Error al guardar ficha de RRHH: " + (error.message || "No se pudo completar la operación."));
    }
}

export async function prepararUsuarioDesdeEmpleadoRRHH(id) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede crear usuarios de intranet.");

    const empleado = state.listaEmpleadosRRHHFirebase.find(e => e.id === id);
    if (!empleado) return alert("No se pudo encontrar la ficha del empleado.");

    const emailActual = normalizarEmailPermiso(empleado.emailIntranet || '');
    const email = normalizarEmailPermiso(prompt(`Correo de login para ${empleado.nombreCompleto || 'este empleado'}:`, emailActual) || '');

    if (!email) return;

    const crearAhora = confirm(`¿Querés crear ahora el usuario de intranet?\n\nEmpleado: ${empleado.nombreCompleto || '-'}\nCorreo: ${email}`);

    try {
        await updateDoc(doc(db, "empleados_rrhh", id), {
            emailIntranet: email,
            fechaActualizacion: new Date(),
            actualizadoPor: state.usuarioAutenticadoEmail || state.usuarioActualEmail
        });

        if (!crearAhora) {
            alert("Correo asociado a la ficha de RRHH.");
            return;
        }

        const resultado = await crearUsuarioIntranetFn({
            nombre: empleado.nombreCompleto || email,
            email,
            modulos: []
        });

        const data = resultado.data || {};
        const clave = data.claveTemporal ? `\n\nClave temporal: ${data.claveTemporal}` : '';
        alert(`Usuario de intranet creado y asociado a RRHH.\n\nCorreo: ${email}${clave}\n\nSugerencia: pedile que cambie la clave al ingresar.`);
    } catch (error) {
        alert("Error al preparar usuario desde RRHH: " + (error.message || "No se pudo completar la operación."));
    }
}

export function editarEmpleadoRRHH(id) {
    state.empleadoRRHHEditandoId = id;
    cambiarVista('rrhh');
}

export function cancelarEdicionEmpleadoRRHH() {
    state.empleadoRRHHEditandoId = null;
    cambiarVista('rrhh');
}

export async function eliminarEmpleadoRRHHFirebase(id) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.puedeEditarRRHH) return alert("No tenes permisos para editar RRHH.");
    if (!confirm("¿Confirmás eliminar esta ficha de RRHH?")) return;

    try {
        await deleteDoc(doc(db, "empleados_rrhh", id));
        if (state.empleadoRRHHEditandoId === id) state.empleadoRRHHEditandoId = null;
        alert("Ficha eliminada correctamente.");
    } catch (error) {
        alert("Error al eliminar ficha de RRHH: " + (error.message || "No se pudo completar la operación."));
    }
}

// REGISTRAR COBRO
export async function procesarCobroFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede modificar pagarés.");

    const cuentaRef = doc(db, "saldos", docId);

    try {
        await updateDoc(cuentaRef, { tienePagare: nuevoEstado });
    } catch (e) {
        console.error(e);
    }
}

// TOGGLE ACUERDO ESPECIAL
export async function toggleAcuerdoEspecialFirebase(docId, nuevoEstado) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede modificar acuerdos especiales.");

    const cuentaRef = doc(db, "saldos", docId);

    try {
        await updateDoc(cuentaRef, { acuerdoEspecial: nuevoEstado });
    } catch (e) {
        console.error(e);
    }
}

// EDITAR NOTA DE GESTION
export async function editarGestionFirebase(docId, indexGestion) {
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
    const emailInput = normalizarEmailPermiso(document.getElementById('input-email-permiso').value);
    const moduloSelected = document.getElementById('select-modulo-permiso').value;

    if (!emailInput) return alert("Por favor, ingresa el correo del colaborador.");
    if (emailInput.includes('/')) return alert("El correo ingresado no puede contener barras (/).");

    const btnOtorgar = document.getElementById('btn-otorgar-permiso');
    const htmlOriginal = activarBotonCarga(btnOtorgar, "Guardando...");

    const permisoExistente = state.listaPermisosFirebase.find(p => p.email && normalizarEmailPermiso(p.email) === emailInput);
    const modulosActuales = permisoExistente && Array.isArray(permisoExistente.modulos) ? [...permisoExistente.modulos] : [];
    const permisosPorModulo = { ...((permisoExistente && permisoExistente.permisosPorModulo) || {}) };
    const yaTeniaModulo = modulosActuales.includes(moduloSelected);

    if (!yaTeniaModulo) {
        modulosActuales.push(moduloSelected);
    }

    permisosPorModulo[moduloSelected] = 'editar';

    try {
        const permisoCanonicoRef = doc(db, "permisos", emailInput);

        await setDoc(permisoCanonicoRef, {
            email: emailInput,
            modulos: modulosActuales,
            permisosPorModulo,
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

// CAMBIAR NIVEL DE ACCESO POR MODULO
export async function guardarNivelPermisoModuloFirebase(email, modulo, nivel) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede modificar permisos.");

    const emailInput = normalizarEmailPermiso(email || '');
    const moduloInput = String(modulo || '').trim();
    const nivelInput = String(nivel || 'none').trim();

    if (!emailInput || !MODULOS_GESTIONABLES.includes(moduloInput)) return alert("No se pudo identificar el permiso.");
    if (!['none', 'ver', 'editar'].includes(nivelInput)) return alert("Nivel de permiso inválido.");

    const permisoExistente = state.listaPermisosFirebase.find(p => p.email && normalizarEmailPermiso(p.email) === emailInput) || {};
    const permisosPorModulo = { ...(permisoExistente.permisosPorModulo || {}) };

    if (nivelInput === 'none') delete permisosPorModulo[moduloInput];
    else permisosPorModulo[moduloInput] = nivelInput;

    const modulos = MODULOS_GESTIONABLES.filter(m => permisosPorModulo[m] === 'ver' || permisosPorModulo[m] === 'editar');

    try {
        await setDoc(doc(db, "permisos", emailInput), {
            email: emailInput,
            modulos,
            permisosPorModulo,
            fechaAlta: permisoExistente.fechaAlta || new Date(),
            fechaActualizacion: new Date()
        }, { merge: true });
    } catch (error) {
        alert("Error al actualizar permiso: " + (error.message || "No se pudo completar la operación."));
    }
}

function obtenerModulosSeleccionadosUsuario() {
    return Array.from(document.querySelectorAll('.check-modulo-usuario:checked')).map(check => check.value);
}

// CREAR USUARIO DE AUTH Y PERMISOS
export async function crearUsuarioIntranetFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede crear usuarios.");

    const nombre = document.getElementById('input-nombre-usuario-admin').value.trim();
    const email = normalizarEmailPermiso(document.getElementById('input-email-usuario-admin').value);
    const claveTemporal = document.getElementById('input-clave-usuario-admin').value.trim();
    const modulos = obtenerModulosSeleccionadosUsuario();

    if (!nombre || !email) return alert("Completá nombre y correo del usuario.");

    const btnCrear = document.getElementById('btn-crear-usuario-admin');
    const htmlOriginal = activarBotonCarga(btnCrear, "Creando...");

    try {
        const resultado = await crearUsuarioIntranetFn({
            nombre,
            email,
            claveTemporal,
            modulos
        });

        const data = resultado.data || {};
        const clave = data.claveTemporal ? `\n\nClave temporal: ${data.claveTemporal}` : '';
        alert(`Usuario creado correctamente.\n\nCorreo: ${data.email}${clave}\n\nSugerencia: pedile que cambie la clave al ingresar.`);

        document.getElementById('input-nombre-usuario-admin').value = '';
        document.getElementById('input-email-usuario-admin').value = '';
        document.getElementById('input-clave-usuario-admin').value = '';
        document.querySelectorAll('.check-modulo-usuario').forEach(check => check.checked = false);
    } catch (error) {
        alert("Error al crear usuario: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btnCrear, htmlOriginal);
    }
}

// GENERAR LINK DE RESETEO DE CLAVE
export async function generarResetClaveUsuarioFirebase(emailPreseleccionado = '') {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede resetear claves.");

    const email = normalizarEmailPermiso(emailPreseleccionado || document.getElementById('input-email-reset-admin').value);
    if (!email) return alert("Ingresá el correo del usuario.");

    const btnReset = document.getElementById('btn-reset-usuario-admin');
    const htmlOriginal = activarBotonCarga(btnReset, "Generando...");

    try {
        const resultado = await enviarResetClaveUsuarioFn({ email });
        const link = resultado.data && resultado.data.link ? resultado.data.link : '';

        if (link) {
            await navigator.clipboard.writeText(link);
            alert(`Link de recuperación generado y copiado al portapapeles.\n\nUsuario: ${email}`);
        } else {
            alert("Link generado correctamente.");
        }

        const inputReset = document.getElementById('input-email-reset-admin');
        if (inputReset) inputReset.value = '';
    } catch (error) {
        alert("Error al generar recuperación: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btnReset, htmlOriginal);
    }
}

// CAMBIAR EMAIL DE LOGIN
export async function cambiarEmailUsuarioFirebase(emailActualPreseleccionado = '') {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede cambiar correos.");

    const emailActual = normalizarEmailPermiso(emailActualPreseleccionado || document.getElementById('input-email-actual-admin').value);
    const emailNuevo = normalizarEmailPermiso(document.getElementById('input-email-nuevo-admin').value);

    if (!emailActual || !emailNuevo) return alert("Completá el correo actual y el correo nuevo.");
    if (!confirm(`¿Confirmás cambiar el correo de login?\n\nActual: ${emailActual}\nNuevo: ${emailNuevo}`)) return;

    const btnCambiar = document.getElementById('btn-cambiar-email-admin');
    const htmlOriginal = activarBotonCarga(btnCambiar, "Cambiando...");

    try {
        await cambiarEmailUsuarioIntranetFn({ emailActual, emailNuevo });
        alert("Correo actualizado correctamente.");

        const inputActual = document.getElementById('input-email-actual-admin');
        const inputNuevo = document.getElementById('input-email-nuevo-admin');
        if (inputActual) inputActual.value = '';
        if (inputNuevo) inputNuevo.value = '';
    } catch (error) {
        alert("Error al cambiar correo: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btnCambiar, htmlOriginal);
    }
}

// ACTUALIZAR NOMBRE VISIBLE DEL USUARIO
export async function actualizarNombreUsuarioFirebase(emailPreseleccionado = '') {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede editar nombres de usuarios.");

    const email = normalizarEmailPermiso(emailPreseleccionado);
    if (!email) return alert("No se pudo identificar el usuario.");

    const usuarioActual = state.listaUsuariosFirebase.find(u => normalizarEmailPermiso(u.email || '') === email)
        || state.listaPermisosFirebase.find(u => normalizarEmailPermiso(u.email || '') === email)
        || {};
    const nombreActual = (usuarioActual.nombre || usuarioActual.displayName || '').trim();
    const nombre = (prompt(`Nombre completo para:\n${email}`, nombreActual) || '').trim();

    if (!nombre) return;

    try {
        await actualizarNombreUsuarioIntranetFn({ email, nombre });
        alert("Nombre actualizado correctamente.");
    } catch (error) {
        alert("Error al actualizar nombre: " + (error.message || "No se pudo completar la operación."));
    }
}

// DESACTIVAR O REACTIVAR USUARIO
export async function cambiarEstadoUsuarioFirebase(email, activo) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede cambiar estados de usuarios.");

    const emailNormalizado = normalizarEmailPermiso(email);
    const accion = activo ? "reactivar" : "desactivar";

    if (!emailNormalizado) return alert("No se pudo identificar el usuario.");
    if (!confirm(`¿Confirmás ${accion} este usuario?\n\n${emailNormalizado}`)) return;

    try {
        await cambiarEstadoUsuarioIntranetFn({
            email: emailNormalizado,
            activo
        });

        alert(`Usuario ${activo ? "reactivado" : "desactivado"} correctamente.`);
    } catch (error) {
        alert("Error al cambiar estado: " + (error.message || "No se pudo completar la operación."));
    }
}

// SINCRONIZAR PADRON DE USUARIOS DESDE PERMISOS
export async function sincronizarUsuariosDesdePermisosFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede sincronizar usuarios.");

    const btn = document.getElementById('btn-sincronizar-usuarios-admin');
    const htmlOriginal = activarBotonCarga(btn, "Sincronizando...");

    try {
        const resultado = await sincronizarUsuariosDesdePermisosFn();
        const cantidad = resultado.data && typeof resultado.data.cantidad === 'number' ? resultado.data.cantidad : 0;
        alert(`Padrón de usuarios sincronizado.\n\nUsuarios procesados: ${cantidad}`);
    } catch (error) {
        alert("Error al sincronizar usuarios: " + (error.message || "No se pudo completar la operación."));
    } finally {
        restaurarBotonCarga(btn, htmlOriginal);
    }
}

// REVOCAR PERMISO
export async function revocarPermisoFirebase(docId) {
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede modificar este campo.");

    const cuentaRef = doc(db, "saldos", docId);

    try {
        await updateDoc(cuentaRef, { [campo]: valor.trim() });
    } catch (e) {
        console.error(e);
    }
}

// ELIMINAR SALDOS SELECCIONADOS
export async function eliminarSaldosSeleccionados() {
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el Administrador Principal puede cargar saldos desde CSV.");

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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    const btnLogin = document.getElementById('btn-login');
    const estadoLogin = document.getElementById('estado-login');
    const htmlOriginal = activarBotonCarga(btnLogin, "Ingresando...");

    if (estadoLogin) {
        estadoLogin.textContent = "Validando credenciales...";
        estadoLogin.classList.remove('hidden');
    }

    if (!email || !password) {
        restaurarBotonCarga(btnLogin, htmlOriginal);
        if (estadoLogin) estadoLogin.classList.add('hidden');
        return alert("Por favor, completa todos los datos.");
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        restaurarBotonCarga(btnLogin, htmlOriginal);
        if (estadoLogin) estadoLogin.classList.add('hidden');
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
    if (bloquearCambiosEnModoVerComo()) return;
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
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.puedeEditarGuardias) return alert("No tenes permisos para editar guardias.");
    if (!state.guardiaDiaSeleccionado) return;

    const emailColab = document.getElementById('select-colaborador-guardia').value;
    const esFeriado = document.getElementById('check-feriado-guardia').checked;
    const notas = document.getElementById('texto-notes-guardia').value.trim();
    const emailsEnfermeria = [...document.querySelectorAll('input[name="enfermeria-guardia"]:checked')].map(input => input.value);
    const enfermeria = emailsEnfermeria.map(email => {
        const persona = baseRecibos.find(emp => emp.email.toLowerCase().trim() === email.toLowerCase().trim());
        return { email, nombre: persona?.nombre || email };
    });
    const medicos = [...document.querySelectorAll('input[name="medicos-guardia"]:checked')]
        .map(input => ({ nombre: input.value, especialidad: '', contacto: '' }));

    if (!emailColab && !esFeriado && !notas && medicos.length === 0 && enfermeria.length === 0) {
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
            enfermeria,
            asignadosEmails: [...new Set([emailColab, ...emailsEnfermeria].filter(Boolean).map(email => email.toLowerCase().trim()))],
            medicos: medicos,
            feriado: esFeriado,
            notas: notas,
            fechaAlta: new Date(),
            fechaActualizacion: new Date()
        }, { merge: true });

        cerrarModalGuardia();
    } catch (e) {
        alert("Error al guardar guardia: " + e.message);
    }
}

export async function guardarGuardiasPeriodoFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.puedeEditarGuardias) return alert("No tenes permisos para editar guardias.");

    const desde = document.getElementById('guardias-periodo-desde').value;
    const hasta = document.getElementById('guardias-periodo-hasta').value;
    const diasIncluidos = new Set([...document.querySelectorAll('input[name="dia-guardia-periodo"]:checked')].map(input => Number(input.value)));
    const politica = document.getElementById('guardias-periodo-politica').value;
    const excluirFeriados = document.getElementById('guardias-periodo-excluir-feriados').checked;
    const emailAdministracion = document.getElementById('guardias-periodo-administracion').value;
    const emailsEnfermeria = [...document.querySelectorAll('input[name="enfermeria-guardia-periodo"]:checked')].map(input => input.value);
    const nombresMedicos = [...document.querySelectorAll('input[name="medicos-guardia-periodo"]:checked')].map(input => input.value);

    if (!desde || !hasta || desde > hasta) return alert("Seleccioná un rango de fechas válido.");
    if (diasIncluidos.size === 0) return alert("Seleccioná al menos un día de la semana.");
    if (!emailAdministracion && emailsEnfermeria.length === 0 && nombresMedicos.length === 0) return alert("Seleccioná al menos una persona para la guardia.");

    const [anioDesde, mesDesde, diaDesde] = desde.split('-').map(Number);
    const [anioHasta, mesHasta, diaHasta] = hasta.split('-').map(Number);
    const fechaActual = new Date(anioDesde, mesDesde - 1, diaDesde, 12);
    const fechaHasta = new Date(anioHasta, mesHasta - 1, diaHasta, 12);
    const fechas = [];
    while (fechaActual <= fechaHasta && fechas.length <= 366) {
        if (diasIncluidos.has(fechaActual.getDay())) {
            fechas.push(`${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`);
        }
        fechaActual.setDate(fechaActual.getDate() + 1);
    }

    if (fechaActual <= fechaHasta) return alert("El período no puede superar los 366 días seleccionados.");

    const existentes = new Map(state.listaGuardiasFirebase.map(guardia => [guardia.fecha, guardia]));
    const fechasAplicables = fechas.filter(fecha => {
        const existente = existentes.get(fecha);
        if (excluirFeriados && existente?.feriado) return false;
        if (politica === 'conservar' && existente) return false;
        return true;
    });
    if (fechasAplicables.length === 0) return alert("No hay fechas para modificar con la configuración elegida.");

    const existentesAfectadas = fechasAplicables.filter(fecha => existentes.has(fecha)).length;
    const accion = politica === 'reemplazar' && existentesAfectadas > 0
        ? `Se reemplazará el equipo de ${existentesAfectadas} guardia${existentesAfectadas === 1 ? '' : 's'} existente${existentesAfectadas === 1 ? '' : 's'}.`
        : `Se asignará el equipo en ${fechasAplicables.length} fecha${fechasAplicables.length === 1 ? '' : 's'}.`;
    if (!confirm(`${accion}\n\n¿Confirmás la asignación por período?`)) return;

    const enfermeriaSeleccionada = emailsEnfermeria.map(email => {
        const persona = baseRecibos.find(emp => emp.email.toLowerCase().trim() === email.toLowerCase().trim());
        return { email, nombre: persona?.nombre || email };
    });
    const medicosSeleccionados = nombresMedicos.map(nombre => ({ nombre, especialidad: '', contacto: '' }));
    const adminSeleccionado = emailAdministracion
        ? baseRecibos.find(emp => emp.email.toLowerCase().trim() === emailAdministracion.toLowerCase().trim())
        : null;
    const btn = document.getElementById('btn-guardar-guardias-periodo');
    const htmlOriginal = activarBotonCarga(btn, 'Asignando...');
    let omitidas = 0;
    let guardadas = 0;

    try {
        const operaciones = fechas.map(fecha => {
            const existente = existentes.get(fecha);
            if ((excluirFeriados && existente?.feriado) || (politica === 'conservar' && existente)) {
                omitidas++;
                return null;
            }

            let colaboradorEmail = emailAdministracion;
            let colaboradorNombre = adminSeleccionado?.nombre || '';
            let enfermeria = enfermeriaSeleccionada;
            let medicos = medicosSeleccionados;

            if (politica === 'completar' && existente) {
                colaboradorEmail = existente.colaboradorEmail || colaboradorEmail;
                colaboradorNombre = existente.colaboradorNombre || (colaboradorEmail === emailAdministracion ? colaboradorNombre : '');
                enfermeria = Array.isArray(existente.enfermeria) && existente.enfermeria.length > 0 ? existente.enfermeria : enfermeria;
                medicos = Array.isArray(existente.medicos) && existente.medicos.length > 0 ? existente.medicos : medicos;
            }

            const asignadosEmails = [...new Set([
                colaboradorEmail,
                ...enfermeria.map(persona => persona.email)
            ].filter(Boolean).map(email => email.toLowerCase().trim()))];
            guardadas++;

            return setDoc(doc(db, 'guardias', fecha), {
                fecha,
                colaboradorEmail,
                colaboradorNombre,
                enfermeria,
                medicos,
                asignadosEmails,
                fechaAlta: existente?.fechaAlta || new Date(),
                fechaActualizacion: new Date()
            }, { merge: true });
        }).filter(Boolean);

        await Promise.all(operaciones);
        cerrarModalGuardiasPeriodo();
        alert(`${guardadas} guardia${guardadas === 1 ? '' : 's'} asignada${guardadas === 1 ? '' : 's'}${omitidas ? `; ${omitidas} fecha${omitidas === 1 ? '' : 's'} conservada${omitidas === 1 ? '' : 's'}` : ''}.`);
    } catch (e) {
        alert("Error al asignar el período: " + e.message);
    } finally {
        restaurarBotonCarga(btn, htmlOriginal);
    }
}

export async function guardarNovedadInicioFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return alert("Solo el administrador puede publicar novedades.");

    const editor = document.getElementById('novedad-inicio-mensaje');
    const mensaje = editor.innerText.trim();
    const contenidoHtml = sanitizarHTMLNovedad(editor.innerHTML);
    const destinatariosEmails = [...document.querySelectorAll('input[name="destinatario-novedad-inicio"]:checked')]
        .map(input => input.value.toLowerCase().trim());
    if (!mensaje) return alert("Escribí el mensaje de la novedad.");
    if (destinatariosEmails.length === 0) return alert("Seleccioná al menos una persona destinataria.");

    const btn = document.getElementById('btn-publicar-novedad-inicio');
    const htmlOriginal = activarBotonCarga(btn, 'Publicando...');
    try {
        if (state.novedadEditandoId) {
            await updateDoc(doc(db, 'novedades', state.novedadEditandoId), { mensaje, contenidoHtml, destinatariosEmails, fechaActualizacion: new Date() });
            const indice = (state.listaNovedadesFirebase || []).findIndex(item => item.id === state.novedadEditandoId);
            if (indice >= 0) state.listaNovedadesFirebase[indice] = { ...state.listaNovedadesFirebase[indice], mensaje, contenidoHtml, destinatariosEmails, fechaActualizacion: new Date() };
        } else {
            const fechaCreacion = new Date();
            const nuevaRef = await addDoc(novedadesRef, { mensaje, contenidoHtml, destinatariosEmails, autorEmail: state.usuarioAutenticadoEmail, fechaCreacion, archivada: false });
            const nuevaNovedad = { id: nuevaRef.id, mensaje, contenidoHtml, destinatariosEmails, autorEmail: state.usuarioAutenticadoEmail, fechaCreacion, archivada: false };
            state.listaNovedadesFirebase = [nuevaNovedad, ...(state.listaNovedadesFirebase || []).filter(item => item.id !== nuevaRef.id)];
        }
        cerrarModalNovedadInicio();
        cambiarVista('inicio');
    } catch (e) {
        alert("Error al publicar la novedad: " + e.message);
    } finally {
        restaurarBotonCarga(btn, htmlOriginal);
    }
}

export async function eliminarNovedadInicioFirebase(id) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return;
    if (!confirm("¿Querés eliminar esta novedad?")) return;
    try {
        await deleteDoc(doc(db, 'novedades', id));
        state.listaNovedadesFirebase = (state.listaNovedadesFirebase || []).filter(item => item.id !== id);
        renderizarGestionNovedadesInicio();
        cambiarVista('inicio');
    } catch (e) {
        alert("Error al eliminar la novedad: " + e.message);
    }
}

export async function archivarNovedadInicioFirebase(id, archivada) {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.esAdminMaster) return;
    try {
        await updateDoc(doc(db, 'novedades', id), { archivada, fechaActualizacion: new Date() });
        const item = (state.listaNovedadesFirebase || []).find(novedad => novedad.id === id);
        if (item) item.archivada = archivada;
        renderizarGestionNovedadesInicio();
        cambiarVista('inicio');
    } catch (e) {
        alert("Error al archivar la novedad: " + e.message);
    }
}

// ELIMINAR GUARDIA PASIVA
export async function eliminarGuardiaFirebase() {
    if (bloquearCambiosEnModoVerComo()) return;
    if (!state.puedeEditarGuardias) return alert("No tenes permisos para editar guardias.");
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
