import { state } from '../../app-state.js';
import { renderizarImportacionDebitos } from './debitos-importacion.js';
import { actualizarGestionPrestacionDebitosFirestore } from './debitos-firestore.js';
import { escaparHTML, formatearMonedaAR, parsearMontoDebito } from './debitos-utils.js';

let timerFiltroTextoDebitos = null;

function puedeGestionarPrestacionDebitos(prestacion) {
    return prestacion?.origen === 'simulacion' || state.esAdminMaster || state.puedeEditarDebitos;
}

function setValorMonedaInput(id, valor) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = valor > 0 ? formatearMonedaAR(valor) : '';
}

export function recalcularImportesGestionDebitos(prestacionId, origen = '') {
    const prestacion = state.listaDebitosPrestacionesFirebase.find(item => item.id === prestacionId);
    if (!prestacion) return;

    const importeDebitado = importePrestacion(prestacion);
    const selectEstado = document.getElementById('select-estado-gestion-debito');
    const inputRefacturado = document.getElementById('input-importe-refacturado-debito');

    if (!inputRefacturado) return;

    if (origen === 'estado' && selectEstado?.value === 'refacturado') {
        inputRefacturado.value = formatearMonedaAR(importeDebitado);
    }

    if (origen === 'estado' && selectEstado?.value === 'no_refacturable') {
        inputRefacturado.value = '';
    }

    const estadoActual = selectEstado?.value || '';
    const importeRefacturado = Math.min(Math.max(parsearMontoDebito(inputRefacturado.value || '0'), 0), importeDebitado);
    if (importeRefacturado !== parsearMontoDebito(inputRefacturado.value || '0')) {
        inputRefacturado.value = importeRefacturado > 0 ? formatearMonedaAR(importeRefacturado) : '';
    }

    const recuperadoCalculado = estadoActual === 'refacturado' ? importeRefacturado : 0;
    const perdidoCalculado = estadoActual === 'refacturado'
        ? Math.max(importeDebitado - importeRefacturado, 0)
        : estadoActual === 'no_refacturable'
            ? importeDebitado
            : 0;

    setValorMonedaInput('input-importe-recuperado-debito', recuperadoCalculado);
    setValorMonedaInput('input-importe-perdido-debito', perdidoCalculado);
}

export function cambiarVistaDebitos(vista) {
    state.debitosVistaActual = vista || 'dashboard';
    window.cambiarVista('debitos');
}

export function seleccionarLoteDebitos(loteId) {
    state.debitosLoteSeleccionadoId = loteId || '';
    state.debitosPrestacionSeleccionadaId = '';
    state.debitosPrestacionesSeleccionadasIds = [];
    state.debitosVistaActual = 'prestaciones';
    window.cambiarVista('debitos');
}

export function seleccionarPrestacionDebitos(prestacionId) {
    state.debitosPrestacionSeleccionadaId = prestacionId || '';
    state.debitosVistaActual = 'prestaciones';
    window.cambiarVista('debitos');
}

export function cerrarDetallePrestacionDebitos() {
    state.debitosPrestacionSeleccionadaId = '';
    window.cambiarVista('debitos');
}

export function actualizarFiltroDebitos(campo, valor) {
    if (campo === 'texto') {
        state.debitosFiltroTexto = valor || '';
        state.debitosPrestacionSeleccionadaId = '';
        state.debitosPrestacionesSeleccionadasIds = [];
        clearTimeout(timerFiltroTextoDebitos);
        timerFiltroTextoDebitos = setTimeout(() => {
            window.cambiarVista('debitos');
        }, 350);
        return;
    }
    if (campo === 'estado') state.debitosFiltroEstado = valor || 'todos';
    if (campo === 'refacturable') state.debitosFiltroRefacturable = valor || 'todos';
    state.debitosPrestacionSeleccionadaId = '';
    state.debitosPrestacionesSeleccionadasIds = [];
    window.cambiarVista('debitos');
}

export function limpiarFiltrosDebitos() {
    state.debitosFiltroTexto = '';
    state.debitosFiltroEstado = 'todos';
    state.debitosFiltroRefacturable = 'todos';
    state.debitosPrestacionSeleccionadaId = '';
    state.debitosPrestacionesSeleccionadasIds = [];
    window.cambiarVista('debitos');
}

export function seleccionarPrestacionMasivaDebitos(prestacionId, seleccionado) {
    const prestacion = state.listaDebitosPrestacionesFirebase.find(item => item.id === prestacionId);
    if (!prestacion || !puedeGestionarPrestacionDebitos(prestacion)) return;

    const seleccionadas = new Set(state.debitosPrestacionesSeleccionadasIds || []);
    if (seleccionado) seleccionadas.add(prestacionId);
    else seleccionadas.delete(prestacionId);
    state.debitosPrestacionesSeleccionadasIds = Array.from(seleccionadas);
    window.cambiarVista('debitos');
}

export function seleccionarPrestacionesVisiblesDebitos(idsTexto, seleccionado) {
    const ids = String(idsTexto || '').split('|').filter(Boolean);
    const seleccionadas = new Set(state.debitosPrestacionesSeleccionadasIds || []);
    ids.forEach(id => {
        const prestacion = state.listaDebitosPrestacionesFirebase.find(item => item.id === id);
        if (!prestacion || !puedeGestionarPrestacionDebitos(prestacion)) return;

        if (seleccionado) seleccionadas.add(id);
        else seleccionadas.delete(id);
    });
    state.debitosPrestacionesSeleccionadasIds = Array.from(seleccionadas);
    window.cambiarVista('debitos');
}

export async function aplicarGestionMasivaDebitos() {
    const idsSeleccionados = state.debitosPrestacionesSeleccionadasIds || [];
    if (idsSeleccionados.length === 0) return alert('Seleccioná al menos una prestación.');

    const estado = document.getElementById('select-estado-masivo-debitos')?.value || '';
    const observaciones = document.getElementById('input-observacion-masiva-debitos')?.value.trim() || '';

    if (!estado) {
        return alert('Elegí una etapa para aplicar.');
    }

    const prestaciones = idsSeleccionados
        .map(id => state.listaDebitosPrestacionesFirebase.find(prestacion => prestacion.id === id))
        .filter(prestacion => prestacion && puedeGestionarPrestacionDebitos(prestacion));

    if (prestaciones.length === 0) {
        return alert('No hay prestaciones seleccionadas con permiso de edición.');
    }

    const btn = document.getElementById('btn-aplicar-masivo-debitos');
    const htmlOriginal = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current inline-block mr-1.5"></span> Aplicando...';
    }

    try {
        for (const prestacion of prestaciones) {
            const gestionAnterior = { ...(prestacion.gestion || {}) };
            const estadoNuevo = estado || gestionAnterior.estado || 'debito_recibido';
            const importeDebitado = importePrestacion(prestacion);
            const refacturableNuevo = ['refacturable', 'refacturado'].includes(estadoNuevo)
                ? true
                : estadoNuevo === 'no_refacturable'
                    ? false
                    : null;
            const importeRefacturado = estadoNuevo === 'refacturado' ? importeDebitado : 0;
            const importeRecuperado = estadoNuevo === 'refacturado' ? importeDebitado : 0;
            const importePerdido = estadoNuevo === 'no_refacturable' ? importeDebitado : 0;
            const usuario = state.usuarioActualEmail || (prestacion.origen === 'simulacion' ? 'simulacion-local' : '');
            const gestionNueva = {
                ...gestionAnterior,
                estado: estadoNuevo,
                refacturable: refacturableNuevo,
                importeRefacturado,
                importeRecuperado,
                importePerdido,
                observaciones: observaciones || gestionAnterior.observaciones || '',
                fechaActualizacion: new Date().toISOString(),
                usuarioActualizacion: usuario
            };
            const trazabilidadNueva = [
                ...(Array.isArray(prestacion.trazabilidad) ? prestacion.trazabilidad : []),
                {
                    fecha: new Date().toISOString(),
                    usuario,
                    accion: prestacion.origen === 'simulacion' ? 'actualizar_gestion_masiva_simulada' : 'actualizar_gestion_masiva',
                    estadoAnterior: gestionAnterior.estado || 'debito_recibido',
                    estadoNuevo,
                    observaciones
                }
            ];

            if (prestacion.origen !== 'simulacion') {
                await actualizarGestionPrestacionDebitosFirestore(prestacion.id, gestionNueva, trazabilidadNueva);
            }

            prestacion.gestion = gestionNueva;
            prestacion.trazabilidad = trazabilidadNueva;
        }

        state.debitosPrestacionesSeleccionadasIds = [];
        state.debitosPrestacionSeleccionadaId = '';
        window.cambiarVista('debitos');
    } catch (error) {
        alert('Error al aplicar gestión masiva: ' + mensajeErrorGestionDebitos(error));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = htmlOriginal;
        }
    }
}

function mensajeErrorGestionDebitos(error) {
    const mensaje = error && error.message ? error.message : '';

    if (mensaje.toLowerCase().includes('permission') || error?.code === 'permission-denied') {
        return 'Firebase rechazó la actualización por permisos. Si estás probando localmente contra producción, puede que todavía falten desplegar las reglas nuevas de Firestore.';
    }

    return mensaje || 'No se pudo guardar la gestión.';
}

export async function guardarGestionPrestacionDebitos(prestacionId) {
    const prestacion = state.listaDebitosPrestacionesFirebase.find(item => item.id === prestacionId);
    if (!prestacion) return alert('No se encontró la prestación seleccionada.');

    const estado = document.getElementById('select-estado-gestion-debito')?.value || 'debito_recibido';
    const observaciones = document.getElementById('textarea-observacion-gestion-debito')?.value.trim() || '';
    const importeDebitado = importePrestacion(prestacion);
    const importeRefacturado = Math.min(Math.max(parsearMontoDebito(document.getElementById('input-importe-refacturado-debito')?.value || '0'), 0), importeDebitado);
    const importeRecuperado = estado === 'refacturado' ? importeRefacturado : 0;
    const importePerdido = estado === 'refacturado' ? Math.max(importeDebitado - importeRefacturado, 0) : 0;
    const gestionAnterior = { ...(prestacion.gestion || {}) };
    const usuario = state.usuarioActualEmail || (prestacion.origen === 'simulacion' ? 'simulacion-local' : '');

    if (estado === 'refacturado' && importeRefacturado <= 0) {
        return alert('Para marcar una prestación como refacturada, cargá el importe refacturado.');
    }

    const gestionNueva = {
        ...gestionAnterior,
        estado,
        refacturable: ['refacturable', 'refacturado'].includes(estado)
            ? true
            : estado === 'no_refacturable'
                ? false
                : null,
        importeRefacturado,
        importeRecuperado,
        importePerdido,
        observaciones,
        fechaActualizacion: new Date().toISOString(),
        usuarioActualizacion: usuario
    };

    const trazabilidadNueva = [
        ...(Array.isArray(prestacion.trazabilidad) ? prestacion.trazabilidad : []),
        {
            fecha: new Date().toISOString(),
            usuario,
            accion: prestacion.origen === 'simulacion' ? 'actualizar_gestion_simulada' : 'actualizar_gestion',
            estadoAnterior: gestionAnterior.estado || 'debito_recibido',
            estadoNuevo: estado,
            observaciones
        }
    ];

    if (prestacion.origen === 'simulacion') {
        prestacion.gestion = gestionNueva;
        prestacion.trazabilidad = trazabilidadNueva;
        window.cambiarVista('debitos');
        return;
    }

    const btn = document.getElementById('btn-guardar-gestion-debito');
    const htmlOriginal = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current inline-block mr-1.5"></span> Guardando...';
    }

    try {
        await actualizarGestionPrestacionDebitosFirestore(prestacionId, gestionNueva, trazabilidadNueva);
        prestacion.gestion = gestionNueva;
        prestacion.trazabilidad = trazabilidadNueva;
        window.cambiarVista('debitos');
    } catch (error) {
        alert('Error al guardar gestión: ' + mensajeErrorGestionDebitos(error));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = htmlOriginal;
        }
    }
}

function renderizarPestanas() {
    const pestanas = [
        ['dashboard', 'dashboard', 'Dashboard'],
        ['importacion', 'upload_file', 'Importar débito'],
        ['lotes', 'inventory_2', 'Lotes'],
        ['prestaciones', 'table_view', 'Prestaciones'],
        ['seguimiento', 'timeline', 'Seguimiento']
    ];

    return `
        <div class="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 mb-4">
            ${pestanas.map(([id, icono, texto]) => `
                <button onclick="window.cambiarVistaDebitos('${id}')" class="${state.debitosVistaActual === id ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'} px-3 py-2 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5">
                    <span class="material-symbols-rounded" style="font-size:16px;">${icono}</span> ${texto}
                </button>
            `).join('')}
        </div>
    `;
}

function importePrestacion(prestacion) {
    return Number(prestacion?.camposNormalizados?.importeDebitado) || 0;
}

function estadoGestion(prestacion) {
    return prestacion?.gestion?.estado || 'debito_recibido';
}

function importeRefacturadoPrestacion(prestacion) {
    return Number(prestacion?.gestion?.importeRefacturado || prestacion?.camposNormalizados?.importeRefacturado) || 0;
}

function esRefacturable(prestacion) {
    return estadoGestion(prestacion) !== 'refacturado' && (prestacion?.gestion?.refacturable === true || estadoGestion(prestacion) === 'refacturable');
}

function esNoRefacturable(prestacion) {
    return prestacion?.gestion?.refacturable === false || estadoGestion(prestacion) === 'no_refacturable';
}

function metricasDebitos(prestaciones = state.listaDebitosPrestacionesFirebase) {
    const totalDebitado = prestaciones.reduce((total, prestacion) => total + importePrestacion(prestacion), 0);
    const pendientes = prestaciones.filter(prestacion => estadoGestion(prestacion) === 'debito_recibido');
    const analizadas = prestaciones.filter(prestacion => estadoGestion(prestacion) !== 'debito_recibido');
    const refacturables = prestaciones.filter(esRefacturable);
    const noRefacturables = prestaciones.filter(esNoRefacturable);
    const importePendiente = pendientes.reduce((total, prestacion) => total + importePrestacion(prestacion), 0);
    const importeRefacturable = refacturables.reduce((total, prestacion) => total + importePrestacion(prestacion), 0);
    const importeNoRefacturable = noRefacturables.reduce((total, prestacion) => total + importePrestacion(prestacion), 0);
    const refacturadas = prestaciones.filter(prestacion => estadoGestion(prestacion) === 'refacturado');
    const importeRefacturado = prestaciones.reduce((total, prestacion) => total + importeRefacturadoPrestacion(prestacion), 0);
    const importeRecuperado = prestaciones.reduce((total, prestacion) => total + (Number(prestacion.gestion?.importeRecuperado) || 0), 0);
    const importePerdido = prestaciones.reduce((total, prestacion) => total + (Number(prestacion.gestion?.importePerdido) || 0), 0);
    const importePendienteRecupero = Math.max(importeRefacturado - importeRecuperado - importePerdido, 0);
    const importePotencialRecupero = importeRefacturable + importeRefacturado;
    const tasaRecuperabilidad = totalDebitado ? Math.round((importePotencialRecupero / totalDebitado) * 100) : 0;
    const tasaNoRecuperable = totalDebitado ? Math.round((importeNoRefacturable / totalDebitado) * 100) : 0;

    return {
        totalDebitado,
        cantidadPrestaciones: prestaciones.length,
        pendientes: pendientes.length,
        analizadas: analizadas.length,
        refacturables: refacturables.length,
        noRefacturables: noRefacturables.length,
        refacturadas: refacturadas.length,
        importePendiente,
        importeRefacturable,
        importeNoRefacturable,
        importeRefacturado,
        importeRecuperado,
        importePerdido,
        importePendienteRecupero,
        importePotencialRecupero,
        tasaRecuperabilidad,
        tasaNoRecuperable,
        avanceAnalisis: prestaciones.length ? Math.round((analizadas.length / prestaciones.length) * 100) : 0
    };
}

function agruparPrestacionesPor(prestaciones, obtenerClave) {
    const grupos = new Map();

    prestaciones.forEach(prestacion => {
        const clave = obtenerClave(prestacion) || 'Sin dato';
        const actual = grupos.get(clave) || { clave, cantidad: 0, importe: 0 };
        actual.cantidad += 1;
        actual.importe += importePrestacion(prestacion);
        grupos.set(clave, actual);
    });

    return Array.from(grupos.values()).sort((a, b) => b.importe - a.importe);
}

function renderizarRankingDebitos(titulo, filas, color = 'orange') {
    const colorTexto = color === 'blue' ? 'text-blue-700' : color === 'emerald' ? 'text-emerald-700' : 'text-orange-700';

    return `
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h4 class="font-black text-slate-800 text-sm mb-3">${titulo}</h4>
            ${filas.length ? filas.slice(0, 6).map(fila => `
                <div class="py-2 border-t border-slate-100 first:border-t-0">
                    <div class="flex items-start justify-between gap-3">
                        <span class="text-xs font-black text-slate-700 leading-snug">${escaparHTML(fila.clave)}</span>
                        <span class="text-xs font-black ${colorTexto} whitespace-nowrap">${formatearMonedaAR(fila.importe)}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 font-semibold mt-0.5">${fila.cantidad} prestación${fila.cantidad === 1 ? '' : 'es'}</p>
                </div>
            `).join('') : '<p class="text-xs text-slate-400 italic">Sin datos todavía.</p>'}
        </div>
    `;
}

function renderizarDashboard() {
    const prestaciones = state.listaDebitosPrestacionesFirebase;
    const metricas = metricasDebitos(prestaciones);
    const porFinanciador = agruparPrestacionesPor(prestaciones, prestacion => prestacion.financiador);
    const porMotivo = agruparPrestacionesPor(prestaciones, prestacion => prestacion.camposNormalizados?.motivoDebito);
    const porConcepto = agruparPrestacionesPor(prestaciones, prestacion => prestacion.camposNormalizados?.concepto);
    const motivosNoRecuperables = agruparPrestacionesPor(prestaciones.filter(esNoRefacturable), prestacion => prestacion.camposNormalizados?.motivoDebito);
    const motivoPrincipal = porMotivo[0];
    const noRecuperablePrincipal = motivosNoRecuperables[0];

    return `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white border-t-4 border-t-orange-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Total debitado por NC</span>
                <strong class="text-2xl text-slate-900">${formatearMonedaAR(metricas.totalDebitado)}</strong>
            </div>
            <div class="bg-white border-t-4 border-t-slate-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Lotes</span>
                <strong class="text-2xl text-slate-900">${state.listaDebitosLotesFirebase.length}</strong>
            </div>
            <div class="bg-white border-t-4 border-t-blue-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Prestaciones</span>
                <strong class="text-2xl text-slate-900">${metricas.cantidadPrestaciones}</strong>
            </div>
            <div class="bg-white border-t-4 border-t-emerald-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Analizado</span>
                <strong class="text-2xl text-slate-900">${metricas.avanceAnalisis}%</strong>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-blue-700 uppercase">Pendiente de análisis</span>
                <strong class="text-xl text-blue-950">${formatearMonedaAR(metricas.importePendiente)}</strong>
                <p class="text-xs text-blue-800 font-semibold mt-1">${metricas.pendientes} prestación${metricas.pendientes === 1 ? '' : 'es'}</p>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-emerald-700 uppercase">Potencial recuperable</span>
                <strong class="text-xl text-emerald-950">${formatearMonedaAR(metricas.importePotencialRecupero)}</strong>
                <p class="text-xs text-emerald-800 font-semibold mt-1">${metricas.tasaRecuperabilidad}% del débito importado.</p>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-emerald-700 uppercase">Ya refacturado</span>
                <strong class="text-xl text-emerald-950">${formatearMonedaAR(metricas.importeRefacturado)}</strong>
                <p class="text-xs text-emerald-800 font-semibold mt-1">${metricas.refacturadas} prestación${metricas.refacturadas === 1 ? '' : 'es'}</p>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-red-700 uppercase">No recuperable justificado</span>
                <strong class="text-xl text-red-950">${formatearMonedaAR(metricas.importeNoRefacturable)}</strong>
                <p class="text-xs text-red-800 font-semibold mt-1">${metricas.tasaNoRecuperable}% del débito importado.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Refacturado</span>
                <strong class="text-xl text-slate-900">${formatearMonedaAR(metricas.importeRefacturado)}</strong>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Recuperado real</span>
                <strong class="text-xl text-emerald-700">${formatearMonedaAR(metricas.importeRecuperado)}</strong>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Pendiente recupero</span>
                <strong class="text-xl text-blue-700">${formatearMonedaAR(metricas.importePendienteRecupero)}</strong>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Perdido</span>
                <strong class="text-xl text-red-700">${formatearMonedaAR(metricas.importePerdido)}</strong>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="material-symbols-rounded text-blue-700" style="font-size:22px;">inventory_2</span>
                <h4 class="font-black text-slate-800 text-sm mt-2">Qué se debita más</h4>
                <p class="text-xs text-slate-500 font-semibold mt-1">${motivoPrincipal ? `${escaparHTML(motivoPrincipal.clave)} concentra ${formatearMonedaAR(motivoPrincipal.importe)}.` : 'Todavía no hay motivos cargados.'}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="material-symbols-rounded text-orange-700" style="font-size:22px;">table_rows</span>
                <h4 class="font-black text-slate-800 text-sm mt-2">No recuperable a justificar</h4>
                <p class="text-xs text-slate-500 font-semibold mt-1">${noRecuperablePrincipal ? `${escaparHTML(noRecuperablePrincipal.clave)} explica ${formatearMonedaAR(noRecuperablePrincipal.importe)}.` : 'Todavía no hay débitos cerrados sin reclamo.'}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span class="material-symbols-rounded text-emerald-700" style="font-size:22px;">trending_up</span>
                <h4 class="font-black text-slate-800 text-sm mt-2">Lectura de recupero</h4>
                <p class="text-xs text-slate-500 font-semibold mt-1">Reclamo, refacturación y recupero real quedan separados para saber si corresponde recuperar o asumir el débito.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            ${renderizarRankingDebitos('Débitos por financiador', porFinanciador, 'orange')}
            ${renderizarRankingDebitos('Motivos de débito', porMotivo, 'blue')}
            ${renderizarRankingDebitos('Conceptos más debitados', porConcepto, 'emerald')}
        </div>
    `;
}

function renderizarLotes() {
    if (state.listaDebitosLotesFirebase.length === 0) {
        return `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
                Todavía no hay lotes importados o simulados.
            </div>
        `;
    }

    const lotes = [...state.listaDebitosLotesFirebase].sort((a, b) => {
        const fechaA = a.fechaImportacion && a.fechaImportacion.toMillis ? a.fechaImportacion.toMillis() : new Date(a.fechaImportacion || 0).getTime();
        const fechaB = b.fechaImportacion && b.fechaImportacion.toMillis ? b.fechaImportacion.toMillis() : new Date(b.fechaImportacion || 0).getTime();
        return fechaB - fechaA;
    });

    return `
        <div class="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-3 text-xs text-blue-800 font-semibold">
            Los lotes marcados como simulados existen solo en esta sesión local. Sirven para probar el flujo sin guardar en Firebase.
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-xs">
                <thead class="bg-slate-50 text-slate-500">
                    <tr>
                        <th class="text-left p-3 font-black">Financiador</th>
                        <th class="text-left p-3 font-black">Período</th>
                        <th class="text-left p-3 font-black">NC</th>
                        <th class="text-left p-3 font-black">Archivo</th>
                        <th class="text-right p-3 font-black">Registros</th>
                        <th class="text-right p-3 font-black">Total debitado</th>
                        <th class="text-right p-3 font-black">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${lotes.map(lote => `
                        <tr class="border-t border-slate-100 hover:bg-slate-50">
                            <td class="p-3 font-black text-slate-800">${escaparHTML(lote.financiador || '-')}</td>
                            <td class="p-3 text-slate-600">${escaparHTML(lote.periodo || '-')}</td>
                            <td class="p-3 text-slate-700 font-black">${escaparHTML(lote.numeroNC || '-')}</td>
                            <td class="p-3 text-slate-500">
                                <span class="block">${escaparHTML(lote.archivoNombre || '-')}</span>
                                ${lote.origen === 'simulacion' ? '<span class="inline-flex items-center gap-1 mt-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-0.5 text-[10px] font-black">Simulado</span>' : ''}
                            </td>
                            <td class="p-3 text-right font-semibold text-slate-700">${lote.cantidadRegistros || 0}</td>
                            <td class="p-3 text-right font-black text-orange-700">${formatearMonedaAR(lote.importeTotalDebitado)}</td>
                            <td class="p-3 text-right">
                                <button onclick="window.seleccionarLoteDebitos('${lote.id}')" class="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-100 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1">
                                    <span class="material-symbols-rounded" style="font-size:14px;">visibility</span> Ver prestaciones
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarPrestaciones() {
    const loteSeleccionado = state.listaDebitosLotesFirebase.find(lote => lote.id === state.debitosLoteSeleccionadoId);
    const prestacionesFuente = state.debitosLoteSeleccionadoId
        ? state.listaDebitosPrestacionesFirebase.filter(prestacion => prestacion.loteId === state.debitosLoteSeleccionadoId)
        : state.listaDebitosPrestacionesFirebase;
    const textoFiltro = (state.debitosFiltroTexto || '').trim().toLowerCase();
    const estadoFiltro = state.debitosFiltroEstado || 'todos';
    const prestacionesFiltradas = prestacionesFuente.filter(prestacion => {
        const campos = prestacion.camposNormalizados || {};
        const gestion = prestacion.gestion || {};
        const estado = gestion.estado || 'debito_recibido';
        const datosOriginales = Object.values(prestacion.datosOriginalesMarkey || {});
        const textoBase = [
            prestacion.financiador,
            campos.nc,
            campos.fecha,
            campos.paciente,
            campos.codigo,
            campos.concepto,
            campos.profesional,
            campos.motivoDebito,
            campos.factura,
            campos.estadoHistorico,
            ...datosOriginales
        ].join(' ').toLowerCase();

        const coincideTexto = !textoFiltro || textoBase.includes(textoFiltro);
        const coincideEstado = estadoFiltro === 'todos' || estado === estadoFiltro;

        return coincideTexto && coincideEstado;
    });
    const prestaciones = prestacionesFiltradas.slice(0, 100);
    const prestacionesGestionables = prestaciones.filter(prestacion => puedeGestionarPrestacionDebitos(prestacion));
    const idsVisibles = prestacionesGestionables.map(prestacion => prestacion.id);
    const idsVisiblesTexto = idsVisibles.join('|');
    const seleccionadasSet = new Set(state.debitosPrestacionesSeleccionadasIds || []);
    const seleccionadasVisibles = idsVisibles.filter(id => seleccionadasSet.has(id));
    const todasVisiblesSeleccionadas = idsVisibles.length > 0 && seleccionadasVisibles.length === idsVisibles.length;
    const cantidadSeleccionadas = seleccionadasSet.size;
    const totalFiltrado = prestacionesFiltradas.reduce((total, prestacion) => total + (Number(prestacion.camposNormalizados?.importeDebitado) || 0), 0);
    const pendientes = prestacionesFiltradas.filter(prestacion => (prestacion.gestion?.estado || 'debito_recibido') === 'debito_recibido').length;
    const refacturables = prestacionesFiltradas.filter(esRefacturable).length;
    const refacturadas = prestacionesFiltradas.filter(prestacion => estadoGestion(prestacion) === 'refacturado').length;
    const noRefacturables = prestacionesFiltradas.filter(esNoRefacturable).length;

    if (prestacionesFuente.length === 0) {
        return `
            ${state.debitosLoteSeleccionadoId ? `
                <div class="mb-3">
                    <button onclick="window.seleccionarLoteDebitos('')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5">
                        <span class="material-symbols-rounded" style="font-size:16px;">filter_alt_off</span> Ver todas
                    </button>
                </div>
            ` : ''}
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">Todavía no hay prestaciones importadas.</div>
        `;
    }

    const detallePrestacion = renderizarDetallePrestacion();
    const filtrosActivos = textoFiltro || estadoFiltro !== 'todos';

    return `
        <div class="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div class="text-xs text-slate-500 font-semibold">
                ${loteSeleccionado
                    ? `Mostrando prestaciones del lote <strong class="text-slate-800">${escaparHTML(loteSeleccionado.financiador || '-')} · ${escaparHTML(loteSeleccionado.periodo || '-')}</strong>${loteSeleccionado.origen === 'simulacion' ? ' <span class="bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-0.5 text-[10px] font-black">Simulado</span>' : ''}`
                    : `Mostrando hasta 100 prestaciones importadas`
                }
            </div>
            ${state.debitosLoteSeleccionadoId ? `
                <button onclick="window.seleccionarLoteDebitos('')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5">
                    <span class="material-symbols-rounded" style="font-size:16px;">filter_alt_off</span> Ver todas
                </button>
            ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <span class="block text-[10px] font-black text-slate-400 uppercase">Prestaciones filtradas</span>
                <strong class="text-lg text-slate-900">${prestacionesFiltradas.length}</strong>
            </div>
            <div class="bg-orange-50 border border-orange-100 rounded-2xl p-3 shadow-sm">
                <span class="block text-[10px] font-black text-orange-700 uppercase">Débito filtrado</span>
                <strong class="text-lg text-orange-800">${formatearMonedaAR(totalFiltrado)}</strong>
            </div>
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-3 shadow-sm">
                <span class="block text-[10px] font-black text-blue-700 uppercase">Pendientes</span>
                <strong class="text-lg text-blue-900">${pendientes}</strong>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 shadow-sm">
                <span class="block text-[10px] font-black text-emerald-700 uppercase">Reclamar / refact. / no reclamar</span>
                <strong class="text-lg text-emerald-900">${refacturables} / ${refacturadas} / ${noRefacturables}</strong>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-3">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div class="md:col-span-8 relative">
                    <span class="material-symbols-rounded absolute left-3 top-2.5 text-slate-400" style="font-size:16px;">search</span>
                    <input id="input-buscar-prestaciones-debitos" value="${escaparHTML(state.debitosFiltroTexto || '')}" oninput="window.actualizarFiltroDebitos('texto', this.value)" placeholder="Buscar paciente, concepto, motivo, factura..." class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none">
                </div>
                <select onchange="window.actualizarFiltroDebitos('estado', this.value)" class="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none">
                    <option value="todos" ${estadoFiltro === 'todos' ? 'selected' : ''}>Todas las etapas</option>
                    <option value="debito_recibido" ${estadoFiltro === 'debito_recibido' ? 'selected' : ''}>Pendiente de análisis</option>
                    <option value="analizado" ${estadoFiltro === 'analizado' ? 'selected' : ''}>Analizado</option>
                    <option value="refacturable" ${estadoFiltro === 'refacturable' ? 'selected' : ''}>A reclamar</option>
                    <option value="refacturado" ${estadoFiltro === 'refacturado' ? 'selected' : ''}>Refacturada</option>
                    <option value="no_refacturable" ${estadoFiltro === 'no_refacturable' ? 'selected' : ''}>Cerrado sin reclamo</option>
                </select>
                <button onclick="window.limpiarFiltrosDebitos()" class="md:col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-black transition inline-flex items-center justify-center" title="Limpiar filtros" ${filtrosActivos ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" style="font-size:16px;">filter_alt_off</span>
                </button>
            </div>
        </div>

        ${prestacionesFiltradas.length === 0 ? `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400 mb-3">No hay prestaciones que coincidan con los filtros.</div>
        ` : ''}

        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-3">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                <div class="lg:col-span-3 text-xs font-black text-slate-700">
                    ${cantidadSeleccionadas} prestación${cantidadSeleccionadas === 1 ? '' : 'es'} seleccionada${cantidadSeleccionadas === 1 ? '' : 's'}
                </div>
                <select id="select-estado-masivo-debitos" class="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none">
                    <option value="">Mantener etapa</option>
                    <option value="debito_recibido">Pendiente de análisis</option>
                    <option value="analizado">Analizado</option>
                    <option value="refacturable">A reclamar</option>
                    <option value="refacturado">Refacturada</option>
                    <option value="no_refacturable">Cerrado sin reclamo</option>
                </select>
                <input id="input-observacion-masiva-debitos" placeholder="Observación para historial..." class="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none">
                <button id="btn-aplicar-masivo-debitos" onclick="window.aplicarGestionMasivaDebitos()" class="lg:col-span-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50 disabled:cursor-not-allowed" ${cantidadSeleccionadas > 0 ? '' : 'disabled'}>
                    Aplicar
                </button>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl overflow-auto shadow-sm max-h-[560px]">
            <table class="w-full text-xs">
                <thead class="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                        <th class="text-left p-3 font-black w-10">
                            <input type="checkbox" class="w-3.5 h-3.5 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-40" onchange="window.seleccionarPrestacionesVisiblesDebitos('${idsVisiblesTexto}', this.checked)" ${todasVisiblesSeleccionadas ? 'checked' : ''} ${idsVisibles.length ? '' : 'disabled'}>
                        </th>
                        <th class="text-left p-3 font-black">Financiador</th>
                        <th class="text-left p-3 font-black">NC</th>
                        <th class="text-left p-3 font-black">Paciente</th>
                        <th class="text-left p-3 font-black">FC</th>
                        <th class="text-left p-3 font-black">Concepto</th>
                        <th class="text-left p-3 font-black">Motivo</th>
                        <th class="text-right p-3 font-black">Débito</th>
                        <th class="text-right p-3 font-black">Refact.</th>
                        <th class="text-left p-3 font-black">Etapa</th>
                        <th class="text-right p-3 font-black">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${prestaciones.map(prestacion => {
                        const campos = prestacion.camposNormalizados || {};
                        const gestion = prestacion.gestion || {};
                        const puedeGestionar = puedeGestionarPrestacionDebitos(prestacion);
                        return `
                            <tr class="border-t border-slate-100 hover:bg-slate-50 ${prestacion.id === state.debitosPrestacionSeleccionadaId ? 'bg-orange-50/40' : ''}">
                                <td class="p-2.5">
                                    <input type="checkbox" class="w-3.5 h-3.5 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-40" onchange="window.seleccionarPrestacionMasivaDebitos('${prestacion.id}', this.checked)" ${seleccionadasSet.has(prestacion.id) ? 'checked' : ''} ${puedeGestionar ? '' : 'disabled'}>
                                </td>
                                <td class="p-2.5 font-semibold text-slate-700">${escaparHTML(prestacion.financiador || '-')}</td>
                                <td class="p-2.5 text-slate-500 font-semibold">${escaparHTML(campos.nc || '-')}</td>
                                <td class="p-2.5 font-black text-slate-800">${escaparHTML(campos.paciente || '-')}</td>
                                <td class="p-2.5 text-slate-500 font-semibold">${escaparHTML(campos.factura || '-')}</td>
                                <td class="p-2.5 text-slate-600">${escaparHTML(campos.concepto || '-')}</td>
                                <td class="p-2.5 text-slate-500">${escaparHTML(campos.motivoDebito || '-')}</td>
                                <td class="p-2.5 text-right font-black text-orange-700">${formatearMonedaAR(campos.importeDebitado)}</td>
                                <td class="p-2.5 text-right font-black text-emerald-700">${importeRefacturadoPrestacion(prestacion) ? formatearMonedaAR(importeRefacturadoPrestacion(prestacion)) : '-'}</td>
                                <td class="p-2.5 text-slate-600">
                                    <span class="block">${escaparHTML(textoEstadoDebito(gestion.estado || 'debito_recibido'))}</span>
                                    ${prestacion.origen === 'simulacion' ? '<span class="inline-flex items-center gap-1 mt-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-0.5 text-[10px] font-black">Simulado</span>' : ''}
                                </td>
                                <td class="p-2.5 text-right">
                                    <button onclick="window.seleccionarPrestacionDebitos('${prestacion.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1">
                                        <span class="material-symbols-rounded" style="font-size:14px;">edit_note</span> Gestionar
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ${detallePrestacion}
    `;
}

function formatearFechaHora(valor) {
    if (!valor) return '-';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '-';
    return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatearFechaSimple(valor) {
    if (!valor) return '-';
    if (typeof valor === 'string') return valor;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleDateString('es-AR');
}

function textoEstadoDebito(valor) {
    const estados = {
        debito_recibido: 'Pendiente de análisis',
        analizado: 'Analizado',
        refacturable: 'A reclamar',
        refacturado: 'Refacturada',
        no_refacturable: 'Cerrado sin reclamo'
    };

    return estados[valor] || valor || '-';
}

function renderizarDetallePrestacion() {
    if (!state.debitosPrestacionSeleccionadaId) return '';

    const prestacion = state.listaDebitosPrestacionesFirebase.find(item => item.id === state.debitosPrestacionSeleccionadaId);
    if (!prestacion) return '';

    const campos = prestacion.camposNormalizados || {};
    const gestion = prestacion.gestion || {};
    const datosOriginales = prestacion.datosOriginalesMarkey || {};
    const trazabilidad = Array.isArray(prestacion.trazabilidad) ? prestacion.trazabilidad : [];
    const puedeGestionar = puedeGestionarPrestacionDebitos(prestacion);
    const filasOriginales = Object.entries(datosOriginales)
        .filter(([clave]) => clave)
        .slice(0, 40)
        .map(([clave, valor]) => `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-1 py-1.5 border-b border-slate-100">
                <span class="text-[11px] font-black text-slate-500">${escaparHTML(clave)}</span>
                <span class="md:col-span-2 text-xs text-slate-700 font-semibold">${escaparHTML(valor || '-')}</span>
            </div>
        `).join('');

    return `
        <div class="fixed right-3 bottom-3 top-20 z-50 w-[min(920px,calc(100vw-24px))] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div class="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-start justify-between gap-3 shrink-0">
                <div>
                    <h4 class="font-black text-slate-900 text-sm">Detalle y gestión de prestación</h4>
                    <p class="text-xs text-slate-500 mt-0.5">${escaparHTML(campos.paciente || '-')} · ${escaparHTML(campos.concepto || '-')}</p>
                </div>
                <button onclick="window.cerrarDetallePrestacionDebitos()" class="text-slate-400 hover:text-red-600 transition p-1" title="Cerrar detalle">
                    <span class="material-symbols-rounded" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 p-3 overflow-y-auto">
                <div class="xl:col-span-3 space-y-2">
                    <div class="bg-orange-50 border border-orange-100 rounded-xl p-2.5">
                        <span class="block text-[10px] font-black text-orange-700 uppercase">Importe debitado</span>
                        <strong class="text-xl text-orange-800">${formatearMonedaAR(campos.importeDebitado)}</strong>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-700 font-semibold space-y-1">
                        <p><strong>Financiador:</strong> ${escaparHTML(prestacion.financiador || '-')}</p>
                        <p><strong>NC:</strong> ${escaparHTML(campos.nc || '-')}</p>
                        <p><strong>Fecha:</strong> ${escaparHTML(formatearFechaSimple(campos.fecha))}</p>
                        <p><strong>Código:</strong> ${escaparHTML(campos.codigo || '-')}</p>
                        <p><strong>Profesional:</strong> ${escaparHTML(campos.profesional || '-')}</p>
                        <p><strong>FC:</strong> ${escaparHTML(campos.factura || '-')}</p>
                        <p><strong>Motivo:</strong> ${escaparHTML(campos.motivoDebito || '-')}</p>
                    </div>
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-800 font-semibold">
                        <p><strong>Condición:</strong> Debitada por NC</p>
                        <p><strong>Etapa:</strong> ${escaparHTML(textoEstadoDebito(gestion.estado || 'debito_recibido'))}</p>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-xs text-emerald-900 font-semibold">
                        <p><strong>Refacturado:</strong> ${formatearMonedaAR(gestion.importeRefacturado || 0)}</p>
                        <p><strong>Recuperado:</strong> ${formatearMonedaAR(gestion.importeRecuperado || 0)}</p>
                        <p><strong>Perdido:</strong> ${formatearMonedaAR(gestion.importePerdido || 0)}</p>
                    </div>
                </div>

                <div class="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-3">
                    <h5 class="text-xs font-black text-slate-800 mb-2">Gestión interna</h5>
                    <div class="space-y-2">
                        <label class="block">
                            <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">Etapa de gestión</span>
                            <select id="select-estado-gestion-debito" onchange="window.recalcularImportesGestionDebitos('${prestacion.id}', 'estado')" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeGestionar ? '' : 'disabled'}>
                                <option value="debito_recibido" ${gestion.estado === 'debito_recibido' ? 'selected' : ''}>Pendiente de análisis</option>
                                <option value="analizado" ${gestion.estado === 'analizado' ? 'selected' : ''}>Analizado</option>
                                <option value="refacturable" ${gestion.estado === 'refacturable' ? 'selected' : ''}>A reclamar</option>
                                <option value="refacturado" ${gestion.estado === 'refacturado' ? 'selected' : ''}>Refacturada</option>
                                <option value="no_refacturable" ${gestion.estado === 'no_refacturable' ? 'selected' : ''}>Cerrado sin reclamo</option>
                            </select>
                        </label>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <label class="block">
                                <span class="block text-[10px] font-black text-slate-500 uppercase mb-1">Refacturado</span>
                                <input id="input-importe-refacturado-debito" type="text" value="${gestion.importeRefacturado ? formatearMonedaAR(gestion.importeRefacturado) : ''}" oninput="window.recalcularImportesGestionDebitos('${prestacion.id}', 'refacturado')" onchange="window.recalcularImportesGestionDebitos('${prestacion.id}', 'refacturado')" placeholder="$ 0,00" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeGestionar ? '' : 'disabled'}>
                            </label>
                            <label class="block">
                                <span class="block text-[10px] font-black text-slate-500 uppercase mb-1">Recuperado calc.</span>
                                <input id="input-importe-recuperado-debito" type="text" value="${gestion.importeRecuperado ? formatearMonedaAR(gestion.importeRecuperado) : ''}" placeholder="$ 0,00" class="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500" readonly>
                            </label>
                            <label class="block">
                                <span class="block text-[10px] font-black text-slate-500 uppercase mb-1">Diferencia calc.</span>
                                <input id="input-importe-perdido-debito" type="text" value="${gestion.importePerdido ? formatearMonedaAR(gestion.importePerdido) : ''}" placeholder="$ 0,00" class="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500" readonly>
                            </label>
                        </div>
                        <label class="block">
                            <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">Observación</span>
                            <textarea id="textarea-observacion-gestion-debito" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none" placeholder="Criterio, comentario o próxima acción..." ${puedeGestionar ? '' : 'disabled'}>${escaparHTML(gestion.observaciones || '')}</textarea>
                        </label>
                        <button id="btn-guardar-gestion-debito" onclick="window.guardarGestionPrestacionDebitos('${prestacion.id}')" class="w-full ${puedeGestionar ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-300 cursor-not-allowed'} text-white font-black text-xs py-2.5 rounded-xl transition" ${puedeGestionar ? '' : 'disabled'}>
                            ${prestacion.origen === 'simulacion' ? 'Guardar gestión simulada' : 'Guardar gestión'}
                        </button>
                        ${puedeGestionar ? '' : '<p class="text-[11px] text-slate-400 font-semibold">No tenés permiso para editar la gestión de este débito.</p>'}
                    </div>
                </div>

                <div class="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-3">
                    <h5 class="text-xs font-black text-slate-800 mb-3">Historial</h5>
                    <div class="max-h-[220px] overflow-y-auto">
                        ${trazabilidad.length ? trazabilidad.slice().reverse().map(item => `
                            <div class="border border-slate-100 rounded-xl p-2 mb-2 bg-slate-50">
                                <p class="text-[11px] font-black text-slate-600">${formatearFechaHora(item.fecha)} · ${escaparHTML(item.usuario || '-')}</p>
                                <p class="text-xs text-slate-700 font-semibold mt-1">${escaparHTML(textoEstadoDebito(item.estadoAnterior))} → ${escaparHTML(textoEstadoDebito(item.estadoNuevo))}</p>
                                ${item.observaciones ? `<p class="text-xs text-slate-500 mt-1">${escaparHTML(item.observaciones)}</p>` : ''}
                            </div>
                        `).join('') : '<p class="text-xs text-slate-400 italic">Sin cambios de gestión todavía.</p>'}
                    </div>
                </div>

                <div class="xl:col-span-3 bg-white border border-slate-200 rounded-xl p-3">
                    <h5 class="text-xs font-black text-slate-800 mb-2">Datos originales Markey</h5>
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 max-h-[260px] overflow-auto">
                        ${filasOriginales || '<p class="text-xs text-slate-400 italic">No hay datos originales disponibles.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderizarSeguimiento() {
    const prestaciones = state.listaDebitosPrestacionesFirebase;
    const metricas = metricasDebitos(prestaciones);
    const total = metricas.totalDebitado || 0;
    const porcentajePendiente = total ? Math.round((metricas.importePendiente / total) * 100) : 0;
    const porcentajeRefacturable = total ? Math.round((metricas.importeRefacturable / total) * 100) : 0;
    const porcentajeNoRefacturable = total ? Math.round((metricas.importeNoRefacturable / total) * 100) : 0;
    const porcentajeRecuperoReal = metricas.importeRefacturado ? Math.round((metricas.importeRecuperado / metricas.importeRefacturado) * 100) : 0;
    const ultimosCambios = prestaciones
        .flatMap(prestacion => {
            const campos = prestacion.camposNormalizados || {};
            return (prestacion.trazabilidad || []).map(item => ({
                ...item,
                paciente: campos.paciente,
                concepto: campos.concepto,
                importe: importePrestacion(prestacion)
            }));
        })
        .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
        .slice(0, 10);

    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h4 class="font-black text-slate-800 text-sm">Avance de análisis</h4>
                <div class="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" style="width: ${metricas.avanceAnalisis}%"></div>
                </div>
                <p class="text-xs text-slate-500 font-semibold mt-2">${metricas.analizadas} de ${metricas.cantidadPrestaciones} prestaciones analizadas (${metricas.avanceAnalisis}%).</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h4 class="font-black text-slate-800 text-sm">Composición por importe</h4>
                <div class="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div class="h-full bg-blue-500" style="width: ${porcentajePendiente}%"></div>
                    <div class="h-full bg-emerald-500" style="width: ${porcentajeRefacturable}%"></div>
                    <div class="h-full bg-red-500" style="width: ${porcentajeNoRefacturable}%"></div>
                </div>
                <div class="grid grid-cols-3 gap-2 mt-3 text-[11px] font-black">
                    <span class="text-blue-700">Pend. ${porcentajePendiente}%</span>
                    <span class="text-emerald-700">Reclamar ${porcentajeRefacturable}%</span>
                    <span class="text-red-700">No reclamar ${porcentajeNoRefacturable}%</span>
                </div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h4 class="font-black text-slate-800 text-sm">Lectura operativa</h4>
                <p class="text-xs text-slate-500 font-semibold mt-2">Este seguimiento todavía mide gestión preliminar. El recupero real se incorporará cuando registremos refacturación y cobros recuperados.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-blue-700 uppercase">Pendiente</span>
                <strong class="text-xl text-blue-950">${formatearMonedaAR(metricas.importePendiente)}</strong>
                <p class="text-xs text-blue-800 font-semibold mt-1">${metricas.pendientes} prestaciones sin análisis.</p>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-emerald-700 uppercase">A reclamar</span>
                <strong class="text-xl text-emerald-950">${formatearMonedaAR(metricas.importeRefacturable)}</strong>
                <p class="text-xs text-emerald-800 font-semibold mt-1">${metricas.refacturables} prestaciones marcadas.</p>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-red-700 uppercase">No reclamar</span>
                <strong class="text-xl text-red-950">${formatearMonedaAR(metricas.importeNoRefacturable)}</strong>
                <p class="text-xs text-red-800 font-semibold mt-1">${metricas.noRefacturables} prestaciones marcadas.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div class="bg-white border border-slate-200 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Refacturado</span>
                <strong class="text-xl text-slate-900">${formatearMonedaAR(metricas.importeRefacturado)}</strong>
                <p class="text-xs text-slate-500 font-semibold mt-1">${metricas.refacturadas} prestaciones en estado refacturada.</p>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-emerald-700 uppercase">Recuperado real</span>
                <strong class="text-xl text-emerald-950">${formatearMonedaAR(metricas.importeRecuperado)}</strong>
                <p class="text-xs text-emerald-800 font-semibold mt-1">${porcentajeRecuperoReal}% sobre lo refacturado.</p>
            </div>
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-blue-700 uppercase">Pendiente recupero</span>
                <strong class="text-xl text-blue-950">${formatearMonedaAR(metricas.importePendienteRecupero)}</strong>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-2xl p-4">
                <span class="block text-[11px] font-black text-red-700 uppercase">Perdido</span>
                <strong class="text-xl text-red-950">${formatearMonedaAR(metricas.importePerdido)}</strong>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-4">
            <h4 class="font-black text-slate-800 text-sm mb-3">Últimos movimientos de gestión</h4>
            ${ultimosCambios.length ? ultimosCambios.map(item => `
                <div class="border-t border-slate-100 first:border-t-0 py-3">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-xs font-black text-slate-800">${escaparHTML(item.paciente || '-')}</p>
                            <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${escaparHTML(item.concepto || '-')}</p>
                            <p class="text-[11px] text-slate-400 font-semibold mt-1">${formatearFechaHora(item.fecha)} · ${escaparHTML(item.usuario || '-')}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-black text-orange-700">${formatearMonedaAR(item.importe)}</p>
                            <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${escaparHTML(textoEstadoDebito(item.estadoAnterior))} → ${escaparHTML(textoEstadoDebito(item.estadoNuevo))}</p>
                        </div>
                    </div>
                    ${item.observaciones ? `<p class="text-xs text-slate-500 mt-2">${escaparHTML(item.observaciones)}</p>` : ''}
                </div>
            `).join('') : '<p class="text-xs text-slate-400 italic">Todavía no hay movimientos de gestión.</p>'}
        </div>
    `;
}

export function renderizarDebitos() {
    if (!state.esAdminMaster && !state.tienePermisoDebitos) {
        return `<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">No tenés permisos para ver este módulo.</div>`;
    }

    const vista = state.debitosVistaActual || 'dashboard';
    const contenido = vista === 'importacion'
        ? renderizarImportacionDebitos()
        : vista === 'lotes'
            ? renderizarLotes()
            : vista === 'prestaciones'
                ? renderizarPrestaciones()
                : vista === 'seguimiento'
                    ? renderizarSeguimiento()
                    : renderizarDashboard();

    return `
        <div class="mb-4 bg-orange-50 border border-orange-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <span class="material-symbols-rounded absolute -right-4 -bottom-5 text-8xl text-orange-100 pointer-events-none">price_check</span>
            <div class="relative z-10">
                <h3 class="text-xl md:text-2xl font-black text-slate-900">Gestión de Débitos</h3>
                <p class="text-xs md:text-sm text-orange-800 font-semibold mt-1">Importar, consolidar y controlar débitos de obras sociales, prepagas y convenios.</p>
            </div>
        </div>
        ${renderizarPestanas()}
        ${contenido}
    `;
}
