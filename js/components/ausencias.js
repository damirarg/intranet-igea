import { state } from '../app-state.js';

const tiposAusencia = {
    vacaciones: { texto: 'Vacaciones', icono: 'beach_access', color: 'teal', descuenta: true },
    enfermedad: { texto: 'Enfermedad', icono: 'local_hospital', color: 'rose', descuenta: false },
    mudanza: { texto: 'Mudanza', icono: 'home_work', color: 'amber', descuenta: false },
    nacimiento_hijo: { texto: 'Nacimiento de hijo', icono: 'child_care', color: 'blue', descuenta: false },
    estudio: { texto: 'Estudio', icono: 'school', color: 'violet', descuenta: false },
    tramite: { texto: 'Trámite personal', icono: 'fact_check', color: 'slate', descuenta: false },
    licencia_especial: { texto: 'Licencia especial', icono: 'event_note', color: 'indigo', descuenta: false },
    otro: { texto: 'Otra ausencia', icono: 'more_horiz', color: 'slate', descuenta: false }
};

const estadosAusencia = {
    solicitado: 'Solicitado',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    cancelado: 'Cancelado'
};

function escaparHTML(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

function formatearFecha(fechaISO = '') {
    if (!fechaISO) return '-';
    const [anio, mes, dia] = String(fechaISO).split('-');
    if (!anio || !mes || !dia) return fechaISO;
    return `${dia}/${mes}/${anio}`;
}

export function calcularDiasAusenciaCCT108(fechaDesde = '', fechaHasta = '', feriados = []) {
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

function obtenerEmpleado(id) {
    return state.listaEmpleadosRRHHFirebase.find(e => e.id === id) || null;
}

function nombreEmpleado(empleado = {}) {
    const apellidos = String(empleado.apellidos || '').trim();
    const nombres = String(empleado.nombres || '').trim();
    if (apellidos && nombres) return `${apellidos}, ${nombres}`;
    return empleado.nombreCompleto || apellidos || nombres || 'Empleado sin nombre';
}

function etiquetaArea(area = '') {
    if (area === 'administracion') return 'Administración';
    if (area === 'asistencial') return 'Asistencial';
    return 'Sin área';
}

function normalizarBusqueda(valor = '') {
    return String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function colorChip(tipo = 'otro') {
    const meta = tiposAusencia[tipo] || tiposAusencia.otro;
    const clases = {
        teal: 'bg-teal-50 text-teal-700 border-teal-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        violet: 'bg-violet-50 text-violet-700 border-violet-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return clases[meta.color] || clases.slate;
}

function opcionesEmpleados(empleadoSeleccionadoId = '') {
    const empleados = [...state.listaEmpleadosRRHHFirebase]
        .filter(e => !e.archivado)
        .sort((a, b) => nombreEmpleado(a).localeCompare(nombreEmpleado(b), 'es'));

    return `
        <option value="">Seleccionar empleado</option>
        ${empleados.map(e => `
            <option value="${escaparHTML(e.id)}" ${e.id === empleadoSeleccionadoId ? 'selected' : ''}>
                ${escaparHTML(nombreEmpleado(e))}
            </option>
        `).join('')}
    `;
}

function opcionesTipos(tipoSeleccionado = 'vacaciones') {
    return Object.entries(tiposAusencia).map(([valor, meta]) => `
        <option value="${valor}" ${valor === tipoSeleccionado ? 'selected' : ''}>${meta.texto}</option>
    `).join('');
}

function opcionesEstados(estadoSeleccionado = 'aprobado') {
    return Object.entries(estadosAusencia).map(([valor, texto]) => `
        <option value="${valor}" ${valor === estadoSeleccionado ? 'selected' : ''}>${texto}</option>
    `).join('');
}

function ausenciasFiltradas() {
    return state.listaAusenciasFirebase
        .filter(a => !state.filtroAnioAusencias || String(a.fechaDesde || '').startsWith(String(state.filtroAnioAusencias)))
        .sort((a, b) => String(b.fechaDesde || '').localeCompare(String(a.fechaDesde || '')));
}

function resumenAusencias(lista) {
    const hoyISO = fechaAISO(new Date());
    const vacacionesDeducidas = lista
        .filter(a => a.tipo === 'vacaciones' && a.estado !== 'rechazado' && a.estado !== 'cancelado')
        .reduce((acc, a) => acc + (Number(a.diasADescontar) || 0), 0);
    const enCurso = lista.filter(a =>
        a.estado === 'aprobado'
        && String(a.fechaDesde || '') <= hoyISO
        && String(a.fechaHasta || '') >= hoyISO
    ).length;
    const proximas = lista.filter(a =>
        a.estado === 'aprobado'
        && String(a.fechaDesde || '') > hoyISO
    ).length;

    return { vacacionesDeducidas, enCurso, proximas };
}

export function filtrarAusencias() {
    const input = document.getElementById('input-buscar-ausencia');
    const filtro = normalizarBusqueda(input ? input.value : '');

    document.querySelectorAll('[data-ausencia]').forEach(fila => {
        const texto = normalizarBusqueda(fila.dataset.busqueda || '');
        fila.classList.toggle('hidden', filtro && !texto.includes(filtro));
    });
}

export function cambiarAnioAusencias(valor) {
    const anio = parseInt(valor, 10);
    state.filtroAnioAusencias = Number.isNaN(anio) ? new Date().getFullYear() : anio;
    window.cambiarVista('ausencias');
}

export function recalcularDiasAusenciaPreview() {
    const desde = document.getElementById('input-fecha-desde-ausencia')?.value || '';
    const hasta = document.getElementById('input-fecha-hasta-ausencia')?.value || '';
    const feriadosTexto = document.getElementById('input-feriados-ausencia')?.value || '';
    const tipo = document.getElementById('input-tipo-ausencia')?.value || 'vacaciones';
    const descuenta = document.getElementById('input-descuenta-vacaciones-ausencia')?.checked || tipo === 'vacaciones';
    const feriados = feriadosTexto.split(/\s+/).map(f => f.trim()).filter(Boolean);
    const diasCCT = calcularDiasAusenciaCCT108(desde, hasta, feriados);
    const diasCalendario = contarDiasCalendario(desde, hasta);
    const preview = document.getElementById('preview-dias-ausencia');
    if (!preview) return;

    preview.innerHTML = `
        <span class="font-black text-slate-800">${diasCCT}</span> día${diasCCT === 1 ? '' : 's'} computable${diasCCT === 1 ? '' : 's'}
        <span class="text-slate-400">·</span>
        <span>${diasCalendario}</span> día${diasCalendario === 1 ? '' : 's'} calendario
        <span class="text-slate-400">·</span>
        <span class="${descuenta ? 'text-teal-700' : 'text-slate-500'}">${descuenta ? 'Descuenta vacaciones' : 'No descuenta vacaciones'}</span>
    `;
}

export function sincronizarDescuentoAusencia() {
    const tipo = document.getElementById('input-tipo-ausencia')?.value || 'vacaciones';
    const check = document.getElementById('input-descuenta-vacaciones-ausencia');
    if (check && tipo === 'vacaciones') check.checked = true;
    recalcularDiasAusenciaPreview();
}

export function renderizarAusencias() {
    const puedeEditar = state.esAdminMaster;
    const ausenciaEditando = state.ausenciaEditandoId
        ? state.listaAusenciasFirebase.find(a => a.id === state.ausenciaEditandoId)
        : null;
    const lista = ausenciasFiltradas();
    const resumen = resumenAusencias(lista);
    const anioActual = state.filtroAnioAusencias || new Date().getFullYear();
    const feriadosEditando = Array.isArray(ausenciaEditando?.feriados) ? ausenciaEditando.feriados.join('\n') : '';
    const tipoSeleccionado = ausenciaEditando?.tipo || 'vacaciones';
    const descuentaSeleccionado = ausenciaEditando
        ? ausenciaEditando.descuentaVacaciones === true
        : tiposAusencia[tipoSeleccionado].descuenta;

    const filas = lista.length ? lista.map(a => {
        const empleado = obtenerEmpleado(a.empleadoId);
        const nombre = a.empleadoNombre || nombreEmpleado(empleado || {});
        const meta = tiposAusencia[a.tipo] || tiposAusencia.otro;
        const estado = estadosAusencia[a.estado] || a.estado || '-';
        const busqueda = [nombre, a.tipo, estado, a.fechaDesde, a.fechaHasta, a.notas].filter(Boolean).join(' ');
        const diasADescontar = Number(a.diasADescontar) || 0;
        return `
            <tr data-ausencia data-busqueda="${escaparHTML(busqueda)}" class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-3.5">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl ${colorChip(a.tipo)} border flex items-center justify-center shrink-0">
                            <span class="material-symbols-rounded" style="font-size:18px;">${meta.icono}</span>
                        </div>
                        <div>
                            <p class="font-black text-slate-800 text-xs">${escaparHTML(nombre)}</p>
                            <p class="text-[11px] text-slate-500 font-semibold">${escaparHTML(etiquetaArea(empleado?.area || a.empleadoArea || ''))}</p>
                        </div>
                    </div>
                </td>
                <td class="p-3.5">
                    <span class="${colorChip(a.tipo)} px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 text-[11px] font-black">
                        <span class="material-symbols-rounded" style="font-size:14px;">${meta.icono}</span> ${meta.texto}
                    </span>
                </td>
                <td class="p-3.5 text-xs font-bold text-slate-700">${formatearFecha(a.fechaDesde)} - ${formatearFecha(a.fechaHasta)}</td>
                <td class="p-3.5 text-xs font-bold text-slate-600">
                    ${Number(a.diasComputables) || 0} computables
                    <span class="block text-[11px] text-slate-400 font-semibold">${Number(a.diasCalendario) || 0} calendario</span>
                </td>
                <td class="p-3.5 text-xs font-bold ${diasADescontar > 0 ? 'text-teal-700' : 'text-slate-400'}">${diasADescontar}</td>
                <td class="p-3.5 text-xs">
                    <span class="px-2.5 py-1 rounded-lg border font-black ${a.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : a.estado === 'rechazado' || a.estado === 'cancelado' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-100'}">${escaparHTML(estado)}</span>
                </td>
                <td class="p-3.5 text-right">
                    ${puedeEditar ? `
                        <button onclick="window.editarAusenciaFirebase('${a.id}')" class="text-slate-400 hover:text-teal-700 p-1.5 rounded-lg transition" title="Editar ausencia">
                            <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
                        </button>
                        <button onclick="window.eliminarAusenciaFirebase('${a.id}')" class="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition" title="Eliminar ausencia">
                            <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('') : `
        <tr>
            <td colspan="7" class="p-8 text-center text-slate-400 text-xs italic">
                Todavía no hay ausencias cargadas para ${anioActual}.
            </td>
        </tr>
    `;

    return `
        <div class="space-y-5 pb-8">
            <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <p class="text-[11px] uppercase tracking-wide font-black text-teal-600">Laboratorio interno RRHH</p>
                        <h3 class="text-xl md:text-2xl font-black text-slate-800 mt-1">Ausencias</h3>
                        <p class="text-sm text-slate-500 mt-1 max-w-3xl">Registro interno de vacaciones, enfermedad y licencias. Las vacaciones se computan con criterio CCT 108/75: días hábiles y sábados, sin domingos ni feriados.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.cambiarVista('inicio')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition inline-flex items-center gap-1.5">
                            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> Inicio
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-slate-400">Registros ${anioActual}</p>
                        <p class="text-2xl font-black text-slate-800 mt-1">${lista.length}</p>
                    </div>
                    <div class="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-teal-600">Vacaciones descontadas</p>
                        <p class="text-2xl font-black text-teal-800 mt-1">${resumen.vacacionesDeducidas}</p>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-emerald-600">En curso</p>
                        <p class="text-2xl font-black text-emerald-800 mt-1">${resumen.enCurso}</p>
                    </div>
                    <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-blue-600">Próximas</p>
                        <p class="text-2xl font-black text-blue-800 mt-1">${resumen.proximas}</p>
                    </div>
                </div>
            </section>

            <section class="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 items-start">
                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <h4 class="text-sm font-black text-slate-800">${ausenciaEditando ? 'Editar ausencia' : 'Cargar ausencia'}</h4>
                        ${ausenciaEditando ? `<button onclick="window.cancelarEdicionAusenciaFirebase()" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition" title="Cancelar edición"><span class="material-symbols-rounded" style="font-size:18px;">close</span></button>` : ''}
                    </div>
                    <div class="space-y-3">
                        <input type="hidden" id="input-id-ausencia" value="${escaparHTML(ausenciaEditando?.id || '')}">
                        <div>
                            <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Empleado</label>
                            <select id="input-empleado-ausencia" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none">
                                ${opcionesEmpleados(ausenciaEditando?.empleadoId || '')}
                            </select>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Tipo</label>
                                <select id="input-tipo-ausencia" onchange="window.sincronizarDescuentoAusencia()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none">
                                    ${opcionesTipos(tipoSeleccionado)}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Estado</label>
                                <select id="input-estado-ausencia" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none">
                                    ${opcionesEstados(ausenciaEditando?.estado || 'aprobado')}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Desde</label>
                                <input type="date" id="input-fecha-desde-ausencia" value="${escaparHTML(ausenciaEditando?.fechaDesde || '')}" onchange="window.recalcularDiasAusenciaPreview()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Hasta</label>
                                <input type="date" id="input-fecha-hasta-ausencia" value="${escaparHTML(ausenciaEditando?.fechaHasta || '')}" onchange="window.recalcularDiasAusenciaPreview()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none">
                            </div>
                        </div>
                        <label class="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 text-xs font-bold text-teal-800">
                            <input type="checkbox" id="input-descuenta-vacaciones-ausencia" ${descuentaSeleccionado ? 'checked' : ''} onchange="window.recalcularDiasAusenciaPreview()" class="w-4 h-4 text-teal-600 rounded focus:ring-teal-500">
                            Descontar del saldo de vacaciones
                        </label>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600" id="preview-dias-ausencia">
                            ${calcularDiasAusenciaCCT108(ausenciaEditando?.fechaDesde || '', ausenciaEditando?.fechaHasta || '', ausenciaEditando?.feriados || [])} días computables · ${contarDiasCalendario(ausenciaEditando?.fechaDesde || '', ausenciaEditando?.fechaHasta || '')} calendario
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Feriados dentro del período</label>
                            <textarea id="input-feriados-ausencia" oninput="window.recalcularDiasAusenciaPreview()" rows="3" placeholder="YYYY-MM-DD, uno por línea" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">${escaparHTML(feriadosEditando)}</textarea>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-black text-slate-500 mb-1">Notas</label>
                            <textarea id="input-notas-ausencia" rows="3" placeholder="Detalle interno..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">${escaparHTML(ausenciaEditando?.notas || '')}</textarea>
                        </div>
                        <button id="btn-guardar-ausencia" onclick="window.guardarAusenciaFirebase()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs py-3 rounded-xl transition shadow-md shadow-teal-100 inline-flex items-center justify-center gap-1.5" ${puedeEditar ? '' : 'disabled'}>
                            <span class="material-symbols-rounded" style="font-size:16px;">save</span> ${ausenciaEditando ? 'Guardar cambios' : 'Guardar ausencia'}
                        </button>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <h4 class="font-black text-slate-800 text-sm">Registro de Ausencias</h4>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <input id="input-buscar-ausencia" oninput="window.filtrarAusencias()" placeholder="Buscar empleado o tipo..." class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none">
                            <input type="number" min="2020" max="2100" value="${anioActual}" onchange="window.cambiarAnioAusencias(this.value)" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold w-28 focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50/60">
                                    <th class="p-3.5">Empleado</th>
                                    <th class="p-3.5">Tipo</th>
                                    <th class="p-3.5">Período</th>
                                    <th class="p-3.5">Días</th>
                                    <th class="p-3.5">Desc.</th>
                                    <th class="p-3.5">Estado</th>
                                    <th class="p-3.5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    `;
}
