import { state } from '../app-state.js';
import { db } from '../firebase-config.js';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const capacitacionesRef = collection(db, 'capacitaciones');

const areas = {
    toda_institucion: 'Toda la institución',
    administracion: 'Administración',
    asistencial: 'Asistencial',
    enfermeria: 'Enfermería',
    asistentes: 'Asistentes'
};

const tiposMaterial = {
    documento: { texto: 'Documento', icono: 'description' },
    presentacion: { texto: 'Presentación PDF', icono: 'picture_as_pdf' },
    video: { texto: 'Video', icono: 'play_circle' },
    enlace: { texto: 'Enlace', icono: 'link' },
    certificado: { texto: 'Certificado', icono: 'workspace_premium' }
};

function escaparHTML(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function nuevoId(prefijo) {
    return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function borradorVacio() {
    return {
        titulo: '',
        fecha: new Date().toISOString().split('T')[0],
        area: 'toda_institucion',
        obligatoria: false,
        secciones: []
    };
}

function asegurarBorrador() {
    if (!state.capacitacionBorrador) state.capacitacionBorrador = borradorVacio();
    if (!Array.isArray(state.capacitacionBorrador.secciones)) state.capacitacionBorrador.secciones = [];
    return state.capacitacionBorrador;
}

function puedeEditar() {
    return state.esAdminMaster || state.puedeEditarCapacitaciones;
}

function capturarFormulario() {
    const borrador = asegurarBorrador();
    const titulo = document.getElementById('input-capacitacion-titulo');
    const fecha = document.getElementById('input-capacitacion-fecha');
    const area = document.getElementById('select-capacitacion-area');
    const obligatoria = document.getElementById('check-capacitacion-obligatoria');
    if (titulo) borrador.titulo = titulo.value;
    if (fecha) borrador.fecha = fecha.value;
    if (area) borrador.area = area.value;
    if (obligatoria) borrador.obligatoria = obligatoria.checked;
}

function refrescar() {
    window.cambiarVista('capacitaciones');
}

export function seleccionarCapacitacion(capacitacionId = '') {
    state.capacitacionSeleccionadaId = capacitacionId;
    refrescar();
}

export function nuevaCapacitacion() {
    state.capacitacionEditandoId = '';
    state.capacitacionBorrador = borradorVacio();
    state.capacitacionSeleccionadaId = '';
    refrescar();
}

export function editarCapacitacion(capacitacionId) {
    const capacitacion = state.listaCapacitacionesFirebase.find(item => item.id === capacitacionId);
    if (!capacitacion || !puedeEditar()) return;
    state.capacitacionEditandoId = capacitacionId;
    state.capacitacionSeleccionadaId = '';
    state.capacitacionBorrador = {
        titulo: capacitacion.titulo || '',
        fecha: capacitacion.fecha || '',
        area: capacitacion.area || 'toda_institucion',
        obligatoria: capacitacion.obligatoria === true,
        secciones: JSON.parse(JSON.stringify(capacitacion.secciones || []))
    };
    refrescar();
}

export function cancelarEdicionCapacitacion() {
    state.capacitacionEditandoId = '';
    state.capacitacionBorrador = null;
    refrescar();
}

export function agregarSeccionCapacitacion() {
    capturarFormulario();
    const input = document.getElementById('input-nueva-seccion-capacitacion');
    const titulo = input?.value.trim() || '';
    if (!titulo) return alert('Ingresá un título para la sección.');
    asegurarBorrador().secciones.push({ id: nuevoId('sec'), titulo, materiales: [] });
    refrescar();
}

export function eliminarSeccionCapacitacion(seccionId) {
    capturarFormulario();
    const borrador = asegurarBorrador();
    borrador.secciones = borrador.secciones.filter(seccion => seccion.id !== seccionId);
    refrescar();
}

export function moverSeccionCapacitacion(seccionId, direccion) {
    capturarFormulario();
    const secciones = asegurarBorrador().secciones;
    const indice = secciones.findIndex(seccion => seccion.id === seccionId);
    const destino = indice + Number(direccion);
    if (indice < 0 || destino < 0 || destino >= secciones.length) return;
    [secciones[indice], secciones[destino]] = [secciones[destino], secciones[indice]];
    refrescar();
}

export function actualizarTituloSeccionCapacitacion(seccionId, valor) {
    const seccion = asegurarBorrador().secciones.find(item => item.id === seccionId);
    if (seccion) seccion.titulo = String(valor || '');
}

export function agregarMaterialCapacitacion(seccionId) {
    capturarFormulario();
    const nombre = document.getElementById(`material-nombre-${seccionId}`)?.value.trim() || '';
    const tipo = document.getElementById(`material-tipo-${seccionId}`)?.value || 'documento';
    const url = document.getElementById(`material-url-${seccionId}`)?.value.trim() || '';
    if (!nombre || !url) return alert('Completá el nombre y el enlace del material.');
    try {
        new URL(url);
    } catch {
        return alert('Ingresá un enlace válido que comience con http:// o https://.');
    }
    const seccion = asegurarBorrador().secciones.find(item => item.id === seccionId);
    if (!seccion) return;
    if (!Array.isArray(seccion.materiales)) seccion.materiales = [];
    seccion.materiales.push({ id: nuevoId('mat'), nombre, tipo, url });
    refrescar();
}

export function eliminarMaterialCapacitacion(seccionId, materialId) {
    capturarFormulario();
    const seccion = asegurarBorrador().secciones.find(item => item.id === seccionId);
    if (!seccion) return;
    seccion.materiales = (seccion.materiales || []).filter(material => material.id !== materialId);
    refrescar();
}

export function moverMaterialCapacitacion(seccionId, materialId, direccion) {
    capturarFormulario();
    const seccion = asegurarBorrador().secciones.find(item => item.id === seccionId);
    if (!seccion) return;
    const materiales = seccion.materiales || [];
    const indice = materiales.findIndex(material => material.id === materialId);
    const destino = indice + Number(direccion);
    if (indice < 0 || destino < 0 || destino >= materiales.length) return;
    [materiales[indice], materiales[destino]] = [materiales[destino], materiales[indice]];
    refrescar();
}

export function actualizarMaterialCapacitacion(seccionId, materialId, campo, valor) {
    if (!['nombre', 'tipo', 'url'].includes(campo)) return;
    const seccion = asegurarBorrador().secciones.find(item => item.id === seccionId);
    const material = (seccion?.materiales || []).find(item => item.id === materialId);
    if (material) material[campo] = String(valor || '');
}

export async function guardarCapacitacion() {
    if (!puedeEditar()) return alert('No tenés permiso para editar capacitaciones.');
    if (state.verComoEmail) return alert("Volvé a 'Vista administrador' para guardar cambios.");
    capturarFormulario();
    const borrador = asegurarBorrador();
    if (!borrador.titulo.trim()) return alert('Ingresá el título de la capacitación.');
    if (!borrador.fecha) return alert('Seleccioná la fecha de la capacitación.');
    if (borrador.secciones.length === 0) return alert('Agregá al menos una sección.');
    if (borrador.secciones.some(seccion => !String(seccion.titulo || '').trim())) {
        return alert('Todas las secciones deben tener un título.');
    }
    if (!borrador.secciones.some(seccion => (seccion.materiales || []).length > 0)) {
        return alert('Agregá al menos un material.');
    }
    const materiales = borrador.secciones.flatMap(seccion => seccion.materiales || []);
    if (materiales.some(material => !String(material.nombre || '').trim() || !String(material.url || '').trim())) {
        return alert('Todos los materiales deben tener nombre y enlace.');
    }
    if (materiales.some(material => {
        try { new URL(material.url); return false; } catch { return true; }
    })) {
        return alert('Revisá los enlaces de los materiales: alguno no es una URL válida.');
    }

    const btn = document.getElementById('btn-guardar-capacitacion');
    const htmlOriginal = btn?.innerHTML || '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span> Guardando...';
    }

    const payload = {
        titulo: borrador.titulo.trim(),
        fecha: borrador.fecha,
        area: borrador.area,
        obligatoria: borrador.obligatoria === true,
        secciones: borrador.secciones.map((seccion, indiceSeccion) => ({
            id: seccion.id || nuevoId('sec'),
            titulo: String(seccion.titulo || '').trim(),
            orden: indiceSeccion + 1,
            materiales: (seccion.materiales || []).map((material, indiceMaterial) => ({
                id: material.id || nuevoId('mat'),
                nombre: String(material.nombre || '').trim(),
                tipo: material.tipo || 'documento',
                url: String(material.url || '').trim(),
                orden: indiceMaterial + 1
            }))
        })),
        actualizadoPor: state.usuarioActualEmail || '',
        fechaActualizacion: serverTimestamp()
    };

    try {
        if (state.capacitacionEditandoId) {
            await updateDoc(doc(db, 'capacitaciones', state.capacitacionEditandoId), payload);
        } else {
            await addDoc(capacitacionesRef, {
                ...payload,
                creadoPor: state.usuarioActualEmail || '',
                fechaCreacion: serverTimestamp()
            });
        }
        state.capacitacionEditandoId = '';
        state.capacitacionBorrador = null;
        refrescar();
    } catch (error) {
        alert('No se pudo guardar la capacitación: ' + (error.message || 'Error desconocido.'));
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = htmlOriginal;
        }
    }
}

export async function eliminarCapacitacion(capacitacionId) {
    if (!puedeEditar()) return;
    const capacitacion = state.listaCapacitacionesFirebase.find(item => item.id === capacitacionId);
    if (!capacitacion) return;
    if (!confirm(`¿Eliminar la capacitación "${capacitacion.titulo}"?`)) return;
    try {
        await deleteDoc(doc(db, 'capacitaciones', capacitacionId));
        if (state.capacitacionSeleccionadaId === capacitacionId) state.capacitacionSeleccionadaId = '';
    } catch (error) {
        alert('No se pudo eliminar la capacitación: ' + (error.message || 'Error desconocido.'));
    }
}

export function abrirMaterialCapacitacion(capacitacionId, seccionId, materialId) {
    const capacitacion = state.listaCapacitacionesFirebase.find(item => item.id === capacitacionId);
    const seccion = (capacitacion?.secciones || []).find(item => item.id === seccionId);
    const material = (seccion?.materiales || []).find(item => item.id === materialId);
    if (!material?.url) return;
    if (material.tipo === 'video' || material.tipo === 'enlace') {
        window.open(material.url, '_blank', 'noopener,noreferrer');
        return;
    }
    window.abrirDocumento(material.nombre || capacitacion.titulo, material.url);
}

function fechaVisible(fecha = '') {
    if (!fecha) return 'Sin fecha';
    const valor = new Date(`${fecha}T12:00:00`);
    return Number.isNaN(valor.getTime()) ? fecha : valor.toLocaleDateString('es-AR');
}

function renderizarMaterialEditor(seccion, material, indiceMaterial) {
    const meta = tiposMaterial[material.tipo] || tiposMaterial.documento;
    const esPrimero = indiceMaterial === 0;
    const esUltimo = indiceMaterial === seccion.materiales.length - 1;
    return `<div class="grid grid-cols-[auto_minmax(120px,1fr)_130px_minmax(180px,2fr)_auto] items-center gap-2 bg-white border border-slate-100 rounded-lg px-2.5 py-2 min-w-[720px]">
        <span class="material-symbols-rounded text-violet-600" style="font-size:17px;">${meta.icono}</span>
        <input value="${escaparHTML(material.nombre)}" onchange="window.actualizarMaterialCapacitacion('${seccion.id}', '${material.id}', 'nombre', this.value)" class="bg-transparent border-0 p-1 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-violet-500 rounded" aria-label="Nombre del material">
        <select onchange="window.actualizarMaterialCapacitacion('${seccion.id}', '${material.id}', 'tipo', this.value)" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]">${Object.entries(tiposMaterial).map(([valor, opcion]) => `<option value="${valor}" ${material.tipo === valor ? 'selected' : ''}>${opcion.texto}</option>`).join('')}</select>
        <input value="${escaparHTML(material.url)}" onchange="window.actualizarMaterialCapacitacion('${seccion.id}', '${material.id}', 'url', this.value)" class="bg-transparent border-0 p-1 text-[11px] text-slate-500 focus:ring-1 focus:ring-violet-500 rounded" aria-label="Enlace del material">
        <div class="flex items-center shrink-0">
            <button onclick="window.moverMaterialCapacitacion('${seccion.id}', '${material.id}', -1)" class="p-1 text-slate-400 hover:text-violet-700 disabled:opacity-30" title="Subir" ${esPrimero ? 'disabled' : ''}><span class="material-symbols-rounded" style="font-size:15px;">arrow_upward</span></button>
            <button onclick="window.moverMaterialCapacitacion('${seccion.id}', '${material.id}', 1)" class="p-1 text-slate-400 hover:text-violet-700 disabled:opacity-30" title="Bajar" ${esUltimo ? 'disabled' : ''}><span class="material-symbols-rounded" style="font-size:15px;">arrow_downward</span></button>
            <button onclick="window.eliminarMaterialCapacitacion('${seccion.id}', '${material.id}')" class="p-1 text-slate-400 hover:text-red-600" title="Eliminar material"><span class="material-symbols-rounded" style="font-size:15px;">close</span></button>
        </div>
    </div>`;
}

function renderizarSeccionEditor(seccion, indiceSeccion, cantidadSecciones) {
    const materiales = seccion.materiales || [];
    const listado = materiales.length
        ? `<div class="space-y-1.5 mb-3 overflow-x-auto">${materiales.map((material, indice) => renderizarMaterialEditor(seccion, material, indice)).join('')}</div>`
        : '<p class="text-[11px] text-slate-400 italic mb-3">Todavía no hay materiales en esta sección.</p>';
    return `<div class="border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
                <span class="w-6 h-6 bg-violet-100 text-violet-700 rounded-lg inline-flex items-center justify-center text-[11px] font-black shrink-0">${indiceSeccion + 1}</span>
                <input value="${escaparHTML(seccion.titulo)}" onchange="window.actualizarTituloSeccionCapacitacion('${seccion.id}', this.value)" class="min-w-0 w-full bg-transparent border-0 p-0 text-xs font-black text-slate-800 focus:ring-0" aria-label="Título de sección">
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
                <button onclick="window.moverSeccionCapacitacion('${seccion.id}', -1)" class="p-1 text-slate-400 hover:text-violet-700 disabled:opacity-30" title="Subir" ${indiceSeccion === 0 ? 'disabled' : ''}><span class="material-symbols-rounded" style="font-size:17px;">arrow_upward</span></button>
                <button onclick="window.moverSeccionCapacitacion('${seccion.id}', 1)" class="p-1 text-slate-400 hover:text-violet-700 disabled:opacity-30" title="Bajar" ${indiceSeccion === cantidadSecciones - 1 ? 'disabled' : ''}><span class="material-symbols-rounded" style="font-size:17px;">arrow_downward</span></button>
                <button onclick="window.eliminarSeccionCapacitacion('${seccion.id}')" class="p-1 text-slate-400 hover:text-red-600" title="Eliminar sección"><span class="material-symbols-rounded" style="font-size:17px;">delete</span></button>
            </div>
        </div>
        <div class="p-3">
            ${listado}
            <div class="grid grid-cols-1 md:grid-cols-[1fr_160px_2fr_auto] gap-2">
                <input id="material-nombre-${seccion.id}" placeholder="Nombre del material" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none">
                <select id="material-tipo-${seccion.id}" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none">${Object.entries(tiposMaterial).map(([valor, meta]) => `<option value="${valor}">${meta.texto}</option>`).join('')}</select>
                <input id="material-url-${seccion.id}" type="url" placeholder="Enlace de Google Drive o video" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none">
                <button onclick="window.agregarMaterialCapacitacion('${seccion.id}')" class="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-black" title="Agregar material"><span class="material-symbols-rounded" style="font-size:17px;">add</span></button>
            </div>
        </div>
    </div>`;
}

function renderizarMaterialDetalle(capacitacion, seccion, material) {
    const meta = tiposMaterial[material.tipo] || tiposMaterial.documento;
    const iconoAccion = material.tipo === 'video' || material.tipo === 'enlace' ? 'open_in_new' : 'visibility';
    return `<button onclick="window.abrirMaterialCapacitacion('${capacitacion.id}', '${seccion.id}', '${material.id}')" class="w-full px-3 py-3 border-t border-slate-100 first:border-t-0 hover:bg-violet-50 transition flex items-center justify-between gap-3 text-left">
        <span class="flex items-center gap-3 min-w-0"><span class="w-9 h-9 bg-slate-100 text-violet-700 rounded-lg inline-flex items-center justify-center shrink-0"><span class="material-symbols-rounded" style="font-size:20px;">${meta.icono}</span></span><span class="min-w-0"><span class="block text-xs font-black text-slate-800 truncate">${escaparHTML(material.nombre)}</span><span class="block text-[10px] text-slate-400 font-semibold mt-0.5">${meta.texto}</span></span></span><span class="material-symbols-rounded text-slate-400" style="font-size:18px;">${iconoAccion}</span>
    </button>`;
}

function renderizarSeccionDetalle(capacitacion, seccion, indice) {
    const materiales = (seccion.materiales || []).map(material => renderizarMaterialDetalle(capacitacion, seccion, material)).join('');
    return `<section>
        <h4 class="text-sm font-black text-slate-800 flex items-center gap-2 mb-2"><span class="w-6 h-6 bg-violet-100 text-violet-700 rounded-lg inline-flex items-center justify-center text-[11px]">${indice + 1}</span>${escaparHTML(seccion.titulo)}</h4>
        <div class="border border-slate-200 rounded-xl overflow-hidden">${materiales || '<p class="p-4 text-xs text-slate-400 italic">Sin materiales publicados.</p>'}</div>
    </section>`;
}

function renderizarTarjetaCapacitacion(capacitacion) {
    const cantidadMateriales = (capacitacion.secciones || []).reduce((total, seccion) => total + (seccion.materiales || []).length, 0);
    const etiquetaObligatoria = capacitacion.obligatoria ? '<span class="text-[10px] font-black text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">OBLIGATORIA</span>' : '';
    const acciones = puedeEditar() ? `<div class="border-t border-slate-100 px-3 py-2 flex justify-end gap-1"><button onclick="window.editarCapacitacion('${capacitacion.id}')" class="p-1.5 text-slate-400 hover:text-violet-700" title="Editar"><span class="material-symbols-rounded" style="font-size:18px;">edit</span></button><button onclick="window.eliminarCapacitacion('${capacitacion.id}')" class="p-1.5 text-slate-400 hover:text-red-600" title="Eliminar"><span class="material-symbols-rounded" style="font-size:18px;">delete</span></button></div>` : '';
    return `<article class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition flex flex-col">
        <button onclick="window.seleccionarCapacitacion('${capacitacion.id}')" class="p-4 text-left flex-1">
            <div class="flex items-start justify-between gap-3"><span class="w-10 h-10 bg-violet-50 text-violet-700 rounded-xl inline-flex items-center justify-center"><span class="material-symbols-rounded">school</span></span>${etiquetaObligatoria}</div>
            <h4 class="text-base font-black text-slate-900 mt-3 leading-snug">${escaparHTML(capacitacion.titulo)}</h4>
            <p class="text-[11px] text-slate-500 font-semibold mt-2">${fechaVisible(capacitacion.fecha)} · ${escaparHTML(areas[capacitacion.area] || capacitacion.area || 'Toda la institución')}</p>
            <p class="text-[11px] text-slate-400 mt-3">${(capacitacion.secciones || []).length} secciones · ${cantidadMateriales} materiales</p>
        </button>
        ${acciones}
    </article>`;
}

function renderizarEditor() {
    const borrador = asegurarBorrador();
    return `
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 mb-5">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h4 class="font-black text-slate-900 text-base">${state.capacitacionEditandoId ? 'Editar capacitación' : 'Nueva capacitación'}</h4>
                    <p class="text-xs text-slate-500 mt-1">Organizá los materiales en secciones y definí su orden de lectura.</p>
                </div>
                ${state.capacitacionEditandoId || borrador.secciones.length ? `<button onclick="window.cancelarEdicionCapacitacion()" class="text-slate-400 hover:text-red-600 p-1" title="Cancelar"><span class="material-symbols-rounded">close</span></button>` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <label class="xl:col-span-2 text-[11px] font-black text-slate-500 uppercase">Título
                    <input id="input-capacitacion-titulo" value="${escaparHTML(borrador.titulo)}" placeholder="Ej: Seguridad del paciente" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs normal-case focus:ring-2 focus:ring-violet-500 focus:outline-none">
                </label>
                <label class="text-[11px] font-black text-slate-500 uppercase">Fecha
                    <input id="input-capacitacion-fecha" type="date" value="${escaparHTML(borrador.fecha)}" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs normal-case focus:ring-2 focus:ring-violet-500 focus:outline-none">
                </label>
                <label class="text-[11px] font-black text-slate-500 uppercase">Área
                    <select id="select-capacitacion-area" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs normal-case focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        ${Object.entries(areas).map(([valor, texto]) => `<option value="${valor}" ${borrador.area === valor ? 'selected' : ''}>${texto}</option>`).join('')}
                    </select>
                </label>
            </div>
            <label class="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                <input id="check-capacitacion-obligatoria" type="checkbox" ${borrador.obligatoria ? 'checked' : ''} class="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"> Capacitación obligatoria
            </label>

            <div class="border-t border-slate-100 mt-4 pt-4">
                <div class="flex flex-col sm:flex-row gap-2 mb-3">
                    <input id="input-nueva-seccion-capacitacion" placeholder="Título de nueva sección" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none">
                    <button onclick="window.agregarSeccionCapacitacion()" class="bg-violet-100 hover:bg-violet-200 text-violet-800 px-4 py-2.5 rounded-xl text-xs font-black inline-flex items-center justify-center gap-1"><span class="material-symbols-rounded" style="font-size:16px;">add</span> Agregar sección</button>
                </div>
                <div class="space-y-3">
                    ${borrador.secciones.map((seccion, indice) => renderizarSeccionEditor(seccion, indice, borrador.secciones.length)).join('') || '<div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center text-xs text-slate-400">Agregá la primera sección para comenzar a organizar los materiales.</div>'}
                </div>
            </div>
            <div class="mt-4 flex justify-end">
                <button id="btn-guardar-capacitacion" onclick="window.guardarCapacitacion()" class="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-50"><span class="material-symbols-rounded" style="font-size:17px;">save</span> ${state.capacitacionEditandoId ? 'Guardar cambios' : 'Publicar capacitación'}</button>
            </div>
        </section>`;
}

function renderizarDetalle(capacitacion) {
    return `
        <div class="mb-4 flex items-center justify-between gap-3">
            <button onclick="window.seleccionarCapacitacion('')" class="text-slate-600 hover:text-violet-700 text-xs font-black inline-flex items-center gap-1"><span class="material-symbols-rounded" style="font-size:17px;">arrow_back</span> Volver a capacitaciones</button>
            ${puedeEditar() ? `<button onclick="window.editarCapacitacion('${capacitacion.id}')" class="bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1"><span class="material-symbols-rounded" style="font-size:16px;">edit</span> Editar</button>` : ''}
        </div>
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100">
                <div class="flex flex-wrap gap-2 mb-3"><span class="bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 rounded-lg text-[10px] font-black">${escaparHTML(areas[capacitacion.area] || capacitacion.area || 'Toda la institución')}</span>${capacitacion.obligatoria ? '<span class="bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-lg text-[10px] font-black">OBLIGATORIA</span>' : '<span class="bg-slate-50 text-slate-600 border border-slate-100 px-2.5 py-1 rounded-lg text-[10px] font-black">OPTATIVA</span>'}</div>
                <h3 class="text-xl md:text-2xl font-black text-slate-900">${escaparHTML(capacitacion.titulo)}</h3>
                <p class="text-xs text-slate-500 font-semibold mt-2 inline-flex items-center gap-1"><span class="material-symbols-rounded" style="font-size:15px;">event</span> ${fechaVisible(capacitacion.fecha)}</p>
            </div>
            <div class="p-4 md:p-5 space-y-5">
                ${(capacitacion.secciones || []).map((seccion, indice) => renderizarSeccionDetalle(capacitacion, seccion, indice)).join('')}
            </div>
        </section>`;
}

export function renderizarCapacitaciones() {
    const capacitacionSeleccionada = state.listaCapacitacionesFirebase.find(item => item.id === state.capacitacionSeleccionadaId);
    if (capacitacionSeleccionada) return renderizarDetalle(capacitacionSeleccionada);

    const capacitaciones = [...state.listaCapacitacionesFirebase].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    return `
        <div class="mb-5 bg-violet-50 border border-violet-100 rounded-2xl p-5 relative overflow-hidden">
            <span class="material-symbols-rounded absolute -right-3 -bottom-5 text-8xl text-violet-100">school</span>
            <div class="relative z-10 flex items-start justify-between gap-3">
                <div><h3 class="text-xl md:text-2xl font-black text-slate-900">Capacitaciones</h3><p class="text-xs md:text-sm text-violet-800 font-semibold mt-1">Materiales institucionales organizados por capacitación.</p></div>
                ${puedeEditar() && !state.capacitacionBorrador ? `<button onclick="window.nuevaCapacitacion()" class="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 shrink-0"><span class="material-symbols-rounded" style="font-size:17px;">add</span> Nueva</button>` : ''}
            </div>
        </div>
        ${puedeEditar() && state.capacitacionBorrador ? renderizarEditor() : ''}
        ${capacitaciones.length ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">${capacitaciones.map(renderizarTarjetaCapacitacion).join('')}</div>` : `<div class="bg-white border border-slate-200 rounded-2xl p-10 text-center"><span class="material-symbols-rounded text-4xl text-violet-300">school</span><h4 class="text-sm font-black text-slate-700 mt-2">Todavía no hay capacitaciones publicadas</h4><p class="text-xs text-slate-400 mt-1">${puedeEditar() ? 'Creá la primera capacitación para comenzar.' : 'Los nuevos materiales aparecerán aquí.'}</p></div>`}
    `;
}
