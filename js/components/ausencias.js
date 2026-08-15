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

const tiposAjusteVacaciones = {
    carga_manual: { texto: 'Carga manual', icono: 'edit_calendar', color: 'blue' },
    acuerdo_especial: { texto: 'Acuerdo especial', icono: 'handshake', color: 'violet' },
    guardia: { texto: 'Días por guardia', icono: 'clinical_notes', color: 'emerald' },
    correccion: { texto: 'Corrección', icono: 'tune', color: 'slate' }
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

function sumarDias(fechaISO = '', dias = 0) {
    const fecha = parsearFechaLocal(fechaISO) || new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fechaAISO(fecha);
}

function inicioSemana(fechaISO = '') {
    const fecha = parsearFechaLocal(fechaISO) || new Date();
    const dia = fecha.getDay();
    const ajuste = dia === 0 ? -6 : 1 - dia;
    fecha.setDate(fecha.getDate() + ajuste);
    return fechaAISO(fecha);
}

function rangoFechas(fechaInicio = '', cantidadDias = 35) {
    const inicio = parsearFechaLocal(fechaInicio) || new Date();
    return Array.from({ length: cantidadDias }, (_, index) => {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + index);
        return fechaAISO(fecha);
    });
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

function formatearFecha(fechaISO = '') {
    if (!fechaISO) return '-';
    const [anio, mes, dia] = String(fechaISO).split('-');
    if (!anio || !mes || !dia) return fechaISO;
    return `${dia}/${mes}/${anio}`;
}

function formatearRangoCorto(fechaDesde = '', fechaHasta = '') {
    return `${formatearFecha(fechaDesde)} a ${formatearFecha(fechaHasta)}`;
}

function obtenerFeriadosArgentinaAnio(anio) {
    return state.feriadosArgentinaPorAnio[anio] || [];
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

function obtenerFechasFeriadasArgentina(anio) {
    return combinarFeriadosIGEA(anio, obtenerFeriadosArgentinaAnio(anio)).map(f => f.date);
}

function obtenerFeriadoPorFecha(fechaISO = '') {
    const anio = Number(String(fechaISO).slice(0, 4));
    return combinarFeriadosIGEA(anio, obtenerFeriadosArgentinaAnio(anio)).find(f => f.date === fechaISO) || null;
}

function feriadosArgentinaRango(fechaDesde = '', fechaHasta = '') {
    return aniosEnRango(fechaDesde, fechaHasta).flatMap(anio => obtenerFechasFeriadasArgentina(anio));
}

export async function cargarFeriadosArgentina(anio) {
    const anioNumero = Number(anio);
    if (!Number.isInteger(anioNumero) || state.feriadosArgentinaPorAnio[anioNumero] || state.feriadosArgentinaCargando[anioNumero]) return;

    state.feriadosArgentinaCargando[anioNumero] = true;

    try {
        const respuesta = await fetch(`https://date.nager.at/api/v4/Holidays/AR/${anioNumero}`);
        if (!respuesta.ok) throw new Error("No se pudieron cargar feriados.");
        const datos = await respuesta.json();
        state.feriadosArgentinaPorAnio[anioNumero] = combinarFeriadosIGEA(anioNumero, datos
            .filter(f => f.date)
            .map(f => ({
                date: f.date,
                name: f.localName || f.name || 'Feriado',
                nationalHoliday: f.nationalHoliday !== false
            })));

        if (state.seccionActual === 'ausencias') window.cambiarVista('ausencias');
    } catch (error) {
        console.warn("No se pudieron cargar feriados de Argentina:", error);
        state.feriadosArgentinaPorAnio[anioNumero] = feriadosLocalesIGEA(anioNumero);
    } finally {
        state.feriadosArgentinaCargando[anioNumero] = false;
    }
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

function inicialesEmpleado(empleado = {}) {
    const nombre = nombreEmpleado(empleado);
    const partes = nombre.replace(',', ' ').split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'IG';
}

function calcularAntiguedadAl31(fechaIngreso = '', anio = new Date().getFullYear()) {
    const ingreso = parsearFechaLocal(fechaIngreso);
    const corte = new Date(anio, 11, 31);
    if (!ingreso || corte < ingreso) return 0;

    let antiguedad = corte.getFullYear() - ingreso.getFullYear();
    const antesDelAniversario = corte.getMonth() < ingreso.getMonth()
        || (corte.getMonth() === ingreso.getMonth() && corte.getDate() < ingreso.getDate());

    if (antesDelAniversario) antiguedad--;
    return Math.max(0, antiguedad);
}

function calcularDiasBaseVacaciones(fechaIngreso = '', anio = new Date().getFullYear()) {
    const ingreso = parsearFechaLocal(fechaIngreso);
    if (!ingreso || ingreso > new Date(anio, 11, 31)) return 0;

    const antiguedad = calcularAntiguedadAl31(fechaIngreso, anio);
    const diasPorAntiguedad = antiguedad > 20 ? 35 : antiguedad > 10 ? 28 : antiguedad > 5 ? 21 : 14;
    const inicioAnio = new Date(anio, 0, 1);

    if (ingreso <= inicioAnio) return diasPorAntiguedad;

    const diasComputablesAnio = calcularDiasAusenciaCCT108(`${anio}-01-01`, `${anio}-12-31`, obtenerFechasFeriadasArgentina(anio));
    const diasTrabajados = calcularDiasAusenciaCCT108(fechaAISO(ingreso), `${anio}-12-31`, obtenerFechasFeriadasArgentina(anio));

    return diasTrabajados >= Math.ceil(diasComputablesAnio / 2)
        ? diasPorAntiguedad
        : Math.floor(diasTrabajados / 20);
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

function colorAjuste(tipo = 'correccion') {
    const meta = tiposAjusteVacaciones[tipo] || tiposAjusteVacaciones.correccion;
    const clases = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        violet: 'bg-violet-50 text-violet-700 border-violet-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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

function opcionesAjustes(tipoSeleccionado = 'carga_manual') {
    return Object.entries(tiposAjusteVacaciones).map(([valor, meta]) => `
        <option value="${valor}" ${valor === tipoSeleccionado ? 'selected' : ''}>${meta.texto}</option>
    `).join('');
}

function opcionesEmpleadosMultiples(empleadosSeleccionados = []) {
    const seleccionados = new Set(empleadosSeleccionados || []);
    const empleados = [...state.listaEmpleadosRRHHFirebase]
        .filter(e => !e.archivado)
        .sort((a, b) => nombreEmpleado(a).localeCompare(nombreEmpleado(b), 'es'));

    return empleados.map(e => `
        <option value="${escaparHTML(e.id)}" ${seleccionados.has(e.id) ? 'selected' : ''}>
            ${escaparHTML(nombreEmpleado(e))}
        </option>
    `).join('');
}

function ausenciasFiltradas() {
    return state.listaAusenciasFirebase
        .filter(a => !state.filtroAnioAusencias || String(a.fechaDesde || '').startsWith(String(state.filtroAnioAusencias)))
        .sort((a, b) => String(b.fechaDesde || '').localeCompare(String(a.fechaDesde || '')));
}

function aniosConAusencias() {
    const anios = new Set([new Date().getFullYear(), state.filtroAnioAusencias]);
    state.listaAusenciasFirebase.forEach(a => {
        const anio = parseInt(String(a.fechaDesde || '').slice(0, 4), 10);
        if (!Number.isNaN(anio)) anios.add(anio);
    });
    state.listaAjustesVacacionesFirebase.forEach(a => {
        const anio = Number(a.anio);
        if (!Number.isNaN(anio)) anios.add(anio);
    });
    state.listaReglasVacacionesFirebase.forEach(r => {
        const desde = Number(r.anioDesde);
        const hasta = Number(r.anioHasta || r.anioDesde);
        if (!Number.isNaN(desde)) anios.add(desde);
        if (!Number.isNaN(hasta)) anios.add(hasta);
    });
    return Array.from(anios).filter(Boolean).sort((a, b) => b - a);
}

function resumenAusencias(lista) {
    const hoyISO = fechaAISO(new Date());
    const vacacionesDeducidas = lista
        .filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobado')
        .reduce((acc, a) => acc + (Number(a.diasADescontar) || 0), 0);
    const solicitudesPendientes = lista
        .filter(a => a.tipo === 'vacaciones' && a.estado === 'solicitado')
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

    return { vacacionesDeducidas, solicitudesPendientes, enCurso, proximas };
}

function ajustesVacacionesAnio(anio) {
    return state.listaAjustesVacacionesFirebase.filter(a => Number(a.anio) === Number(anio));
}

function vacacionesAprobadasAnio(anio) {
    return state.listaAusenciasFirebase.filter(a =>
        a.tipo === 'vacaciones'
        && a.descuentaVacaciones === true
        && a.estado !== 'rechazado'
        && a.estado !== 'cancelado'
        && String(a.fechaDesde || '').startsWith(String(anio))
    );
}

function vacacionesEnRango(fechaDesde = '', fechaHasta = '') {
    return state.listaAusenciasFirebase.filter(a =>
        a.tipo === 'vacaciones'
        && a.descuentaVacaciones === true
        && a.estado !== 'rechazado'
        && a.estado !== 'cancelado'
        && String(a.fechaDesde || '') <= fechaHasta
        && String(a.fechaHasta || '') >= fechaDesde
    );
}

function fechaDisponibilidadVacaciones(anio) {
    return `${anio}-10-01`;
}

function fechaVencimientoVacaciones(anio) {
    return `${Number(anio) + 1}-05-31`;
}

function periodoVacacionalParaFecha(fechaISO = fechaAISO(new Date())) {
    const fecha = parsearFechaLocal(fechaISO) || new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;

    return mes <= 5 ? anio - 1 : anio;
}

function estadoDisponibilidadPeriodo(periodoVacacional, fechaCorte = fechaAISO(new Date())) {
    const desde = fechaDisponibilidadVacaciones(periodoVacacional);
    const hasta = fechaVencimientoVacaciones(periodoVacacional);

    if (fechaCorte < desde) return 'futuro';
    if (fechaCorte > hasta) return 'vencido';
    return 'vigente';
}

function ajustesVacacionesPeriodo(empleadoId, periodoVacacional, fechaCorte = fechaAISO(new Date())) {
    return state.listaAjustesVacacionesFirebase.filter(a => {
        if (a.empleadoId !== empleadoId) return false;
        const anio = Number(a.anio);
        if (anio !== Number(periodoVacacional)) return false;

        const fechaEfectiva = a.fecha || fechaDisponibilidadVacaciones(periodoVacacional);
        return fechaEfectiva <= fechaCorte;
    });
}

function reglasVacacionesPeriodo(empleadoId, periodoVacacional, fechaCorte = fechaAISO(new Date())) {
    return state.listaReglasVacacionesFirebase.filter(r => {
        if (r.activa === false) return false;
        if (!Array.isArray(r.empleadosIds) || !r.empleadosIds.includes(empleadoId)) return false;

        const desde = Number(r.anioDesde);
        const hasta = r.anioHasta ? Number(r.anioHasta) : Infinity;
        if (!Number.isFinite(desde) || Number(periodoVacacional) < desde || Number(periodoVacacional) > hasta) return false;

        const fechaEfectiva = r.fechaVigencia || `${periodoVacacional}-01-01`;
        return fechaEfectiva <= fechaCorte;
    });
}

function vacacionesEmpleadoPeriodoHasta(empleadoId, periodoVacacional, fechaCorte = fechaAISO(new Date())) {
    return state.listaAusenciasFirebase.filter(a =>
        a.empleadoId === empleadoId
        && a.tipo === 'vacaciones'
        && a.descuentaVacaciones === true
        && a.estado !== 'rechazado'
        && a.estado !== 'cancelado'
        && periodoVacacionalParaFecha(a.fechaDesde) === Number(periodoVacacional)
        && String(a.fechaDesde || '') <= fechaCorte
    );
}

function vacacionesPeriodoPosteriores(empleadoId, periodoVacacional, fechaCorte = fechaAISO(new Date())) {
    return state.listaAusenciasFirebase.filter(a =>
        a.empleadoId === empleadoId
        && a.tipo === 'vacaciones'
        && a.descuentaVacaciones === true
        && a.estado !== 'rechazado'
        && a.estado !== 'cancelado'
        && periodoVacacionalParaFecha(a.fechaDesde) === Number(periodoVacacional)
        && String(a.fechaDesde || '') > fechaCorte
    );
}

function calcularSaldoEmpleadoVacaciones(empleado, anio, fechaCorte = `${anio}-12-31`) {
    const periodoVacacional = periodoVacacionalParaFecha(fechaCorte);
    const diasBase = calcularDiasBaseVacaciones(empleado.fechaIngreso, periodoVacacional);
    const ajustesLista = ajustesVacacionesPeriodo(empleado.id, periodoVacacional, fechaCorte);
    const reglasLista = reglasVacacionesPeriodo(empleado.id, periodoVacacional, fechaCorte);
    const ajustesManuales = ajustesLista.reduce((acc, a) => acc + (Number(a.dias) || 0), 0);
    const reglas = reglasLista.reduce((acc, r) => acc + (Number(r.dias) || 0), 0);
    const ajustes = ajustesManuales + reglas;
    const vacacionesEmpleado = vacacionesEmpleadoPeriodoHasta(empleado.id, periodoVacacional, fechaCorte);
    const usados = vacacionesEmpleado
        .filter(a => a.estado === 'aprobado')
        .reduce((acc, a) => acc + (Number(a.diasADescontar) || 0), 0);
    const pendientes = vacacionesEmpleado
        .filter(a => a.estado === 'solicitado')
        .reduce((acc, a) => acc + (Number(a.diasADescontar) || 0), 0);
    const vencimiento = fechaVencimientoVacaciones(periodoVacacional);
    const saldoBruto = diasBase + ajustes - usados - pendientes;
    const estadoPeriodo = estadoDisponibilidadPeriodo(periodoVacacional, fechaCorte);
    const noDisponible = estadoPeriodo === 'futuro' ? Math.max(0, saldoBruto) : 0;
    const vencido = estadoPeriodo === 'vencido' ? Math.max(0, saldoBruto) : 0;

    return {
        diasBase,
        ajustes,
        ajustesManuales,
        reglas,
        usados,
        pendientes,
        noDisponible,
        vencido,
        disponibles: saldoBruto - vencido - noDisponible,
        antiguedad: calcularAntiguedadAl31(empleado.fechaIngreso, periodoVacacional),
        periodoVacacional,
        estadoPeriodo,
        fechaDisponibleDesde: fechaDisponibilidadVacaciones(periodoVacacional),
        fechaVencimiento: vencimiento,
        solicitudesFuturas: vacacionesPeriodoPosteriores(empleado.id, periodoVacacional, fechaCorte)
            .reduce((acc, a) => acc + (Number(a.diasADescontar) || 0), 0)
    };
}

function solicitudesPendientesVacaciones() {
    return state.listaAusenciasFirebase
        .filter(a => a.tipo === 'vacaciones' && a.estado === 'solicitado')
        .sort((a, b) => String(a.fechaDesde || '').localeCompare(String(b.fechaDesde || '')));
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
    state.vacacionesFechaInicio = fechaDisponibilidadVacaciones(state.filtroAnioAusencias);
    state.empleadoVacacionesSeleccionadoId = null;
    window.cambiarVista('ausencias');
}

export function moverRangoVacaciones(dias) {
    state.vacacionesFechaInicio = sumarDias(state.vacacionesFechaInicio || fechaAISO(new Date()), Number(dias) || 0);
    window.cambiarVista('ausencias');
}

export function irAHoyVacaciones() {
    state.vacacionesFechaInicio = fechaAISO(new Date());
    window.cambiarVista('ausencias');
}

export function prepararVacacionEmpleado(empleadoId, fecha) {
    const empleadoSelect = document.getElementById('input-empleado-ausencia');
    const tipoSelect = document.getElementById('input-tipo-ausencia');
    const estadoSelect = document.getElementById('input-estado-ausencia');
    const desdeInput = document.getElementById('input-fecha-desde-ausencia');
    const hastaInput = document.getElementById('input-fecha-hasta-ausencia');
    const descuentaCheck = document.getElementById('input-descuenta-vacaciones-ausencia');

    if (empleadoSelect) empleadoSelect.value = empleadoId;
    if (tipoSelect) tipoSelect.value = 'vacaciones';
    if (estadoSelect) estadoSelect.value = 'solicitado';
    if (desdeInput) desdeInput.value = fecha;
    if (hastaInput) hastaInput.value = fecha;
    if (descuentaCheck) descuentaCheck.checked = true;

    recalcularDiasAusenciaPreview();
    empleadoSelect?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function seleccionarEmpleadoVacaciones(empleadoId) {
    state.empleadoVacacionesSeleccionadoId = state.empleadoVacacionesSeleccionadoId === empleadoId ? null : empleadoId;
    window.cambiarVista('ausencias');
}

export function editarReglaVacaciones(id) {
    state.reglaVacacionesEditandoId = id;
    window.cambiarVista('ausencias');
}

export function cancelarEdicionReglaVacaciones() {
    state.reglaVacacionesEditandoId = null;
    window.cambiarVista('ausencias');
}

export function prepararAjusteVacacionesEmpleado(empleadoId) {
    const empleadoSelect = document.getElementById('input-empleado-ajuste-vacaciones');
    const anioInput = document.getElementById('input-anio-ajuste-vacaciones');
    const ajustePanel = document.getElementById('panel-ajustes-vacaciones');

    if (empleadoSelect) empleadoSelect.value = empleadoId;
    if (anioInput) anioInput.value = state.filtroAnioAusencias || new Date().getFullYear();
    ajustePanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function recalcularDiasAusenciaPreview() {
    const desde = document.getElementById('input-fecha-desde-ausencia')?.value || '';
    const hasta = document.getElementById('input-fecha-hasta-ausencia')?.value || '';
    const feriadosTexto = document.getElementById('input-feriados-ausencia')?.value || '';
    const tipo = document.getElementById('input-tipo-ausencia')?.value || 'vacaciones';
    const descuenta = document.getElementById('input-descuenta-vacaciones-ausencia')?.checked || tipo === 'vacaciones';
    const feriadosManuales = feriadosTexto.split(/\s+/).map(f => f.trim()).filter(Boolean);
    const feriados = [...new Set([...feriadosManuales, ...feriadosArgentinaRango(desde, hasta)])];
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

function renderizarTableroVacaciones(anioActual) {
    const empleados = [...state.listaEmpleadosRRHHFirebase]
        .filter(e => !e.archivado)
        .sort((a, b) => nombreEmpleado(a).localeCompare(nombreEmpleado(b), 'es'));
    const inicio = inicioSemana(state.vacacionesFechaInicio || fechaAISO(new Date()));
    const fechas = rangoFechas(inicio, 35);
    const fin = fechas[fechas.length - 1];
    aniosEnRango(inicio, fin).forEach(anio => cargarFeriadosArgentina(anio));
    const nombresDias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const hoyISO = fechaAISO(new Date());
    const vacaciones = vacacionesEnRango(inicio, fin);
    const periodoTablero = periodoVacacionalParaFecha(fin);
    const estadoPeriodoTablero = estadoDisponibilidadPeriodo(periodoTablero, fin);
    const etiquetaEstadoPeriodo = estadoPeriodoTablero === 'futuro'
        ? `Disponible desde ${formatearFecha(fechaDisponibilidadVacaciones(periodoTablero))}`
        : estadoPeriodoTablero === 'vencido'
            ? `Vencido el ${formatearFecha(fechaVencimientoVacaciones(periodoTablero))}`
            : `Vigente hasta ${formatearFecha(fechaVencimientoVacaciones(periodoTablero))}`;
    const totalDisponibles = empleados.reduce((acc, e) => acc + calcularSaldoEmpleadoVacaciones(e, anioActual, fin).disponibles, 0);
    const totalUsados = empleados.reduce((acc, e) => acc + calcularSaldoEmpleadoVacaciones(e, anioActual, fin).usados, 0);
    const totalPendientes = empleados.reduce((acc, e) => acc + calcularSaldoEmpleadoVacaciones(e, anioActual, fin).pendientes, 0);

    const encabezadoSemanas = [0, 7, 14, 21, 28].map(offset => {
        const fechaSemana = parsearFechaLocal(fechas[offset]);
        const semana = Math.ceil((((fechaSemana - new Date(fechaSemana.getFullYear(), 0, 1)) / 86400000) + new Date(fechaSemana.getFullYear(), 0, 1).getDay() + 1) / 7);
        return `<div class="text-[11px] font-bold text-indigo-700 px-2">Dd ${semana}</div>`;
    }).join('');

    const filas = empleados.map(empleado => {
        const saldo = calcularSaldoEmpleadoVacaciones(empleado, anioActual, fin);
        const vacacionesEmpleado = vacaciones.filter(v => v.empleadoId === empleado.id);
        const celdas = fechas.map(fecha => {
            const fechaObj = parsearFechaLocal(fecha);
            const diaSemana = fechaObj.getDay();
            const esDomingo = diaSemana === 0;
            const esHoy = fecha === hoyISO;
            const feriado = obtenerFeriadoPorFecha(fecha);
            const ausencia = vacacionesEmpleado.find(v => String(v.fechaDesde || '') <= fecha && String(v.fechaHasta || '') >= fecha);
            const clasesBase = feriado
                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                : esDomingo
                    ? 'bg-slate-100 text-slate-500'
                    : 'hover:bg-indigo-50 text-slate-700';
            const clasesAusencia = ausencia
                ? ausencia.estado === 'solicitado'
                    ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-100'
                    : 'bg-emerald-500 text-white shadow-sm shadow-emerald-100'
                : clasesBase;
            const titulo = ausencia
                ? `${nombreEmpleado(empleado)} · ${estadosAusencia[ausencia.estado] || 'Vacaciones'} · ${formatearRangoCorto(ausencia.fechaDesde, ausencia.fechaHasta)}`
                : feriado
                    ? `${nombreEmpleado(empleado)} · ${formatearFecha(fecha)} · ${feriado.name}`
                    : `${nombreEmpleado(empleado)} · ${formatearFecha(fecha)}`;

            return `
                <button title="${escaparHTML(titulo)}" onclick="window.prepararVacacionEmpleado('${empleado.id}', '${fecha}')" class="h-9 min-w-9 rounded-lg text-[11px] font-bold transition ${clasesAusencia} ${esHoy && !ausencia ? 'ring-2 ring-indigo-400' : ''}">
                    ${ausencia ? `<span class="material-symbols-rounded" style="font-size:15px;">${ausencia.estado === 'solicitado' ? 'pending_actions' : 'beach_access'}</span>` : feriado ? '<span class="material-symbols-rounded" style="font-size:14px;">flag</span>' : fechaObj.getDate()}
                </button>
            `;
        }).join('');

        return `
            <div class="grid grid-cols-[230px_repeat(35,minmax(36px,1fr))] min-w-[1540px] border-b border-slate-100 last:border-b-0">
                <button onclick="window.seleccionarEmpleadoVacaciones('${empleado.id}')" class="sticky left-0 z-10 bg-white hover:bg-indigo-50 border-r border-slate-200 px-3 py-2 flex items-center gap-2 text-left transition">
                    <div class="w-9 h-9 rounded-full bg-indigo-700 text-white flex items-center justify-center font-black text-xs shrink-0">${escaparHTML(inicialesEmpleado(empleado))}</div>
                    <div class="min-w-0">
                        <p class="text-xs font-black text-slate-800 truncate">${escaparHTML(nombreEmpleado(empleado))}</p>
                        <div class="flex items-center gap-1 mt-1">
                            <span class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px] font-black">${saldo.disponibles}</span>
                            <span class="text-[10px] text-slate-400 font-semibold">disp.</span>
                            <span class="text-[10px] text-slate-300">·</span>
                            <span class="text-[10px] text-slate-500 font-semibold">P. ${saldo.periodoVacacional}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 font-semibold mt-0.5">${saldo.estadoPeriodo === 'futuro' ? 'Aún no disponible' : `${saldo.antiguedad} años`}</p>
                    </div>
                </button>
                ${celdas}
            </div>
        `;
    }).join('');

    return `
        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-indigo-50/80 border-b border-indigo-100 p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <button onclick="window.moverRangoVacaciones(-35)" class="w-9 h-9 bg-white hover:bg-indigo-100 border border-indigo-100 rounded-xl text-indigo-700 transition flex items-center justify-center" title="Rango anterior">
                        <span class="material-symbols-rounded" style="font-size:18px;">chevron_left</span>
                    </button>
                    <div>
                        <div class="px-3 text-sm font-black text-indigo-900">${formatearRangoCorto(inicio, fin)}</div>
                        <div class="px-3 text-[11px] font-bold text-indigo-500">Período vacacional ${periodoTablero} · ${etiquetaEstadoPeriodo}</div>
                    </div>
                    <button onclick="window.moverRangoVacaciones(35)" class="w-9 h-9 bg-white hover:bg-indigo-100 border border-indigo-100 rounded-xl text-indigo-700 transition flex items-center justify-center" title="Rango siguiente">
                        <span class="material-symbols-rounded" style="font-size:18px;">chevron_right</span>
                    </button>
                    <button onclick="window.irAHoyVacaciones()" class="bg-white hover:bg-indigo-100 border border-indigo-100 text-indigo-800 px-3 py-2 rounded-xl text-xs font-black transition">Hoy</button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="bg-white border border-indigo-100 text-indigo-800 px-3 py-2 rounded-xl text-xs font-black">${empleados.length} empleados</span>
                    <span class="bg-white border border-indigo-100 text-indigo-800 px-3 py-2 rounded-xl text-xs font-black">${totalDisponibles} disponibles al ${formatearFecha(fin)}</span>
                    <span class="bg-white border border-indigo-100 text-indigo-800 px-3 py-2 rounded-xl text-xs font-black">${totalUsados} usados</span>
                    <span class="bg-white border border-amber-100 text-amber-700 px-3 py-2 rounded-xl text-xs font-black">${totalPendientes} pendientes</span>
                    <span class="bg-white border border-rose-100 text-rose-700 px-3 py-2 rounded-xl text-xs font-black">${aniosEnRango(inicio, fin).flatMap(anio => obtenerFechasFeriadasArgentina(anio)).filter(f => f >= inicio && f <= fin).length} feriados</span>
                    <button onclick="document.getElementById('input-empleado-ausencia')?.focus()" class="bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5">
                        <span class="material-symbols-rounded" style="font-size:16px;">add_circle</span> Crear solicitud
                    </button>
                </div>
            </div>
            <div class="overflow-auto max-h-[560px]">
                <div class="grid grid-cols-[230px_repeat(35,minmax(36px,1fr))] min-w-[1540px] sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div class="sticky left-0 z-30 bg-white border-r border-slate-200 p-3 text-[10px] uppercase tracking-wide font-black text-slate-500">Empleado</div>
                    ${fechas.map(fecha => {
                        const fechaObj = parsearFechaLocal(fecha);
                        const feriado = obtenerFeriadoPorFecha(fecha);
                        return `
                            <div class="p-1 text-center ${feriado ? 'bg-rose-50' : ''}" title="${feriado ? escaparHTML(feriado.name) : ''}">
                                <p class="text-[10px] font-black ${feriado ? 'text-rose-600' : 'text-slate-500'}">${nombresDias[fechaObj.getDay()]}</p>
                                <p class="text-[11px] font-bold ${feriado ? 'text-rose-700' : 'text-slate-800'} mt-1">${fechaObj.getDate()}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="grid grid-cols-[230px_repeat(5,252px)] min-w-[1540px] bg-white border-b border-slate-100">
                    <div class="sticky left-0 z-10 bg-white border-r border-slate-200"></div>
                    ${encabezadoSemanas}
                </div>
                ${filas || `<div class="p-8 text-center text-slate-400 text-xs italic">Cargá empleados activos en RRHH para ver el tablero.</div>`}
            </div>
        </section>
    `;
}

function renderizarAjustesVacaciones(anioActual, puedeEditar) {
    const ajusteEditando = state.ajusteVacacionesEditandoId
        ? state.listaAjustesVacacionesFirebase.find(a => a.id === state.ajusteVacacionesEditandoId)
        : null;
    const ajustes = ajustesVacacionesAnio(anioActual)
        .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
        .slice(0, 8);

    const filas = ajustes.map(a => {
        const meta = tiposAjusteVacaciones[a.tipo] || tiposAjusteVacaciones.correccion;
        return `
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-b-0">
                <div>
                    <p class="text-xs font-black text-slate-800">${escaparHTML(a.empleadoNombre || 'Empleado')}</p>
                    <p class="text-[11px] text-slate-500 font-semibold">${formatearFecha(a.fecha)} · ${escaparHTML(meta.texto)}</p>
                </div>
                <div class="flex items-center gap-1">
                    <span class="${colorAjuste(a.tipo)} border rounded-lg px-2 py-1 text-[11px] font-black">${Number(a.dias) > 0 ? '+' : ''}${Number(a.dias) || 0}</span>
                    ${puedeEditar ? `<button onclick="window.eliminarAjusteVacacionesFirebase('${a.id}')" class="text-slate-400 hover:text-red-600 p-1 rounded-lg transition" title="Eliminar ajuste"><span class="material-symbols-rounded" style="font-size:16px;">delete</span></button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div id="panel-ajustes-vacaciones" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h4 class="text-sm font-black text-slate-800 mb-4">${ajusteEditando ? 'Editar ajuste' : 'Ajustar días de vacaciones'}</h4>
            <div class="space-y-3">
                <input type="hidden" id="input-id-ajuste-vacaciones" value="${escaparHTML(ajusteEditando?.id || '')}">
                <select id="input-empleado-ajuste-vacaciones" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    ${opcionesEmpleados(ajusteEditando?.empleadoId || '')}
                </select>
                <div class="grid grid-cols-2 gap-3">
                    <input type="number" step="0.5" id="input-dias-ajuste-vacaciones" value="${escaparHTML(ajusteEditando?.dias || '')}" placeholder="Días" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <input type="number" min="2020" max="2100" id="input-anio-ajuste-vacaciones" value="${escaparHTML(ajusteEditando?.anio || anioActual)}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                </div>
                <select id="input-tipo-ajuste-vacaciones" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    ${opcionesAjustes(ajusteEditando?.tipo || 'carga_manual')}
                </select>
                <input type="date" id="input-fecha-ajuste-vacaciones" value="${escaparHTML(ajusteEditando?.fecha || fechaAISO(new Date()))}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <textarea id="input-notas-ajuste-vacaciones" rows="2" placeholder="Motivo o detalle..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">${escaparHTML(ajusteEditando?.notas || '')}</textarea>
                <button id="btn-guardar-ajuste-vacaciones" onclick="window.guardarAjusteVacacionesFirebase()" class="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs py-3 rounded-xl transition inline-flex items-center justify-center gap-1.5" ${puedeEditar ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" style="font-size:16px;">add_task</span> Guardar ajuste
                </button>
            </div>
            <div class="mt-5">
                <h5 class="text-[10px] uppercase tracking-wide font-black text-slate-400 mb-2">Últimos ajustes</h5>
                ${filas || `<p class="text-xs text-slate-400 italic">Sin ajustes cargados para ${anioActual}.</p>`}
            </div>
        </div>
    `;
}

function renderizarReglasVacaciones(anioActual, puedeEditar) {
    const reglaEditando = state.reglaVacacionesEditandoId
        ? state.listaReglasVacacionesFirebase.find(r => r.id === state.reglaVacacionesEditandoId)
        : null;
    const reglas = [...state.listaReglasVacacionesFirebase]
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));

    const filas = reglas.map(r => {
        const meta = tiposAjusteVacaciones[r.tipo] || tiposAjusteVacaciones.acuerdo_especial;
        const cantidadAsignados = Array.isArray(r.empleadosIds) ? r.empleadosIds.length : 0;
        const vigencia = r.anioHasta ? `${r.anioDesde} a ${r.anioHasta}` : `desde ${r.anioDesde}`;
        return `
            <div class="grid grid-cols-1 xl:grid-cols-[1fr_150px_130px_180px] gap-3 items-center border-b border-slate-100 py-3 last:border-b-0">
                <div>
                    <p class="text-xs font-black text-slate-800">${escaparHTML(r.nombre || meta.texto)}</p>
                    <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${Number(r.dias) > 0 ? '+' : ''}${Number(r.dias) || 0} días anuales · ${escaparHTML(meta.texto)} · ${escaparHTML(vigencia)}</p>
                    ${r.notas ? `<p class="text-[11px] text-slate-400 mt-0.5">${escaparHTML(r.notas)}</p>` : ''}
                </div>
                <span class="${colorAjuste(r.tipo)} border rounded-lg px-2.5 py-1 text-xs font-black justify-self-start">${Number(r.dias) > 0 ? '+' : ''}${Number(r.dias) || 0} días</span>
                <span class="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-2.5 py-1 text-xs font-black justify-self-start">${cantidadAsignados} asignado${cantidadAsignados === 1 ? '' : 's'}</span>
                <div class="flex items-center justify-start xl:justify-end gap-1">
                    ${puedeEditar ? `
                        <button onclick="window.editarReglaVacaciones('${r.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1" title="Editar regla">
                            <span class="material-symbols-rounded" style="font-size:14px;">edit</span> Editar
                        </button>
                        <button onclick="window.eliminarReglaVacacionesFirebase('${r.id}')" class="bg-white hover:bg-red-50 border border-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1" title="Eliminar regla">
                            <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <section class="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 items-start">
            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h4 class="text-sm font-black text-slate-800">${reglaEditando ? 'Editar regla especial' : 'Crear regla especial'}</h4>
                        <p class="text-[11px] text-slate-500 font-semibold mt-0.5">Para acuerdos o beneficios que se repiten automáticamente cada año.</p>
                    </div>
                    ${reglaEditando ? `<button onclick="window.cancelarEdicionReglaVacaciones()" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition" title="Cancelar edición"><span class="material-symbols-rounded" style="font-size:18px;">close</span></button>` : ''}
                </div>
                <div class="space-y-3">
                    <input type="hidden" id="input-id-regla-vacaciones" value="${escaparHTML(reglaEditando?.id || '')}">
                    <input id="input-nombre-regla-vacaciones" value="${escaparHTML(reglaEditando?.nombre || '')}" placeholder="Ej.: Acuerdo especial Violeta" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                    <div class="grid grid-cols-2 gap-3">
                        <input type="number" step="0.5" id="input-dias-regla-vacaciones" value="${escaparHTML(reglaEditando?.dias || '')}" placeholder="Días anuales" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        <select id="input-tipo-regla-vacaciones" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                            ${opcionesAjustes(reglaEditando?.tipo || 'acuerdo_especial')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <input type="number" min="2020" max="2100" id="input-anio-desde-regla-vacaciones" value="${escaparHTML(reglaEditando?.anioDesde || anioActual)}" placeholder="Desde año" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        <input type="number" min="2020" max="2100" id="input-anio-hasta-regla-vacaciones" value="${escaparHTML(reglaEditando?.anioHasta || '')}" placeholder="Hasta año opcional" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                    </div>
                    <select id="input-empleados-regla-vacaciones" multiple size="6" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        ${opcionesEmpleadosMultiples(reglaEditando?.empleadosIds || [])}
                    </select>
                    <textarea id="input-notas-regla-vacaciones" rows="2" placeholder="Detalle interno de la regla..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none">${escaparHTML(reglaEditando?.notas || '')}</textarea>
                    <button id="btn-guardar-regla-vacaciones" onclick="window.guardarReglaVacacionesFirebase()" class="w-full bg-violet-700 hover:bg-violet-800 text-white font-black text-xs py-3 rounded-xl transition inline-flex items-center justify-center gap-1.5" ${puedeEditar ? '' : 'disabled'}>
                        <span class="material-symbols-rounded" style="font-size:16px;">rule</span> ${reglaEditando ? 'Guardar regla' : 'Crear regla'}
                    </button>
                </div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="p-4 bg-violet-50 border-b border-violet-100 flex items-center justify-between gap-3">
                    <div>
                        <h4 class="font-black text-slate-800 text-sm">Reglas especiales activas</h4>
                        <p class="text-xs text-violet-700 font-semibold mt-0.5">${reglas.length} regla${reglas.length === 1 ? '' : 's'} configurada${reglas.length === 1 ? '' : 's'}.</p>
                    </div>
                    <span class="material-symbols-rounded text-violet-700" style="font-size:22px;">fact_check</span>
                </div>
                <div class="p-4">
                    ${filas || `<p class="text-xs text-slate-400 italic text-center py-6">Todavía no hay reglas especiales cargadas.</p>`}
                </div>
            </div>
        </section>
    `;
}

function renderizarSolicitudesPendientes(puedeEditar) {
    const solicitudes = solicitudesPendientesVacaciones();
    if (solicitudes.length === 0) return '';

    return `
        <section class="bg-amber-50 border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-4 border-b border-amber-100 flex items-center justify-between gap-3">
                <div>
                    <h4 class="text-sm font-black text-amber-900">Solicitudes pendientes</h4>
                    <p class="text-xs text-amber-700 font-semibold mt-0.5">${solicitudes.length} solicitud${solicitudes.length === 1 ? '' : 'es'} esperando definición.</p>
                </div>
                <span class="bg-white border border-amber-100 text-amber-800 rounded-xl px-3 py-2 text-xs font-black">
                    ${solicitudes.reduce((acc, s) => acc + (Number(s.diasADescontar) || 0), 0)} días reservados
                </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                ${solicitudes.map(s => `
                    <article class="bg-white border border-amber-100 rounded-xl p-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <p class="text-xs font-black text-slate-800">${escaparHTML(s.empleadoNombre || 'Empleado')}</p>
                                <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${formatearRangoCorto(s.fechaDesde, s.fechaHasta)}</p>
                            </div>
                            <span class="bg-amber-100 text-amber-800 rounded-lg px-2 py-1 text-[11px] font-black">${Number(s.diasADescontar) || 0} días</span>
                        </div>
                        ${s.notas ? `<p class="text-[11px] text-slate-500 mt-2">${escaparHTML(s.notas)}</p>` : ''}
                        ${puedeEditar ? `
                            <div class="flex justify-end gap-1 mt-3">
                                <button onclick="window.editarAusenciaFirebase('${s.id}')" class="bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1">
                                    <span class="material-symbols-rounded" style="font-size:14px;">edit</span> Revisar
                                </button>
                                <button onclick="window.eliminarAusenciaFirebase('${s.id}')" class="bg-white hover:bg-red-50 border border-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1">
                                    <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
                                </button>
                            </div>
                        ` : ''}
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

function renderizarFichaEmpleadoVacaciones(anioActual, fechaCorte = `${anioActual}-12-31`) {
    const empleado = state.empleadoVacacionesSeleccionadoId
        ? obtenerEmpleado(state.empleadoVacacionesSeleccionadoId)
        : null;

    if (!empleado) return '';

    const saldo = calcularSaldoEmpleadoVacaciones(empleado, anioActual, fechaCorte);
    const ajustes = ajustesVacacionesPeriodo(empleado.id, saldo.periodoVacacional, fechaCorte);
    const reglas = reglasVacacionesPeriodo(empleado.id, saldo.periodoVacacional, fechaCorte);
    const vacaciones = vacacionesEmpleadoPeriodoHasta(empleado.id, saldo.periodoVacacional, fechaCorte);
    const ausencias = state.listaAusenciasFirebase
        .filter(a =>
            a.empleadoId === empleado.id
            && String(a.fechaDesde || '') <= fechaCorte
            && (a.tipo !== 'vacaciones' || periodoVacacionalParaFecha(a.fechaDesde) === saldo.periodoVacacional)
        )
        .sort((a, b) => String(b.fechaDesde || '').localeCompare(String(a.fechaDesde || '')));
    const movimientos = [
        {
            orden: fechaDisponibilidadVacaciones(saldo.periodoVacacional),
            fecha: fechaDisponibilidadVacaciones(saldo.periodoVacacional),
            tipo: 'Acumulación',
            detalle: `Período ${saldo.periodoVacacional} · ${saldo.antiguedad} años de antigüedad · goce hasta ${formatearFecha(saldo.fechaVencimiento)}`,
            dias: saldo.diasBase,
            clases: 'bg-indigo-50 text-indigo-700 border-indigo-100'
        },
        ...reglas.map(r => {
            const meta = tiposAjusteVacaciones[r.tipo] || tiposAjusteVacaciones.acuerdo_especial;
            return {
                orden: r.fechaVigencia || `${saldo.periodoVacacional}-01-01`,
                fecha: r.fechaVigencia || `${saldo.periodoVacacional}-01-01`,
                tipo: 'Regla especial',
                detalle: `${r.nombre || meta.texto} · ${r.notas || 'Aplicación automática'}`,
                dias: Number(r.dias) || 0,
                clases: colorAjuste(r.tipo)
            };
        }),
        ...ajustes.map(a => {
            const meta = tiposAjusteVacaciones[a.tipo] || tiposAjusteVacaciones.correccion;
            return {
                orden: a.fecha || `${anioActual}-01-01`,
                fecha: a.fecha || `${anioActual}-01-01`,
                tipo: meta.texto,
                detalle: a.notas || 'Ajuste manual',
                dias: Number(a.dias) || 0,
                clases: colorAjuste(a.tipo)
            };
        }),
        ...vacaciones.map(v => ({
            orden: v.fechaDesde || `${anioActual}-12-31`,
            fecha: v.fechaDesde || `${anioActual}-12-31`,
            tipo: v.estado === 'solicitado' ? 'Solicitud pendiente' : 'Vacaciones tomadas',
            detalle: formatearRangoCorto(v.fechaDesde, v.fechaHasta),
            dias: -(Number(v.diasADescontar) || 0),
            clases: v.estado === 'solicitado'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }))
    ];

    if (saldo.vencido > 0) {
        movimientos.push({
            orden: saldo.fechaVencimiento,
            fecha: saldo.fechaVencimiento,
            tipo: 'Saldo vencido',
            detalle: `Días no utilizados del período ${saldo.periodoVacacional}`,
            dias: -saldo.vencido,
            clases: 'bg-rose-50 text-rose-700 border-rose-100'
        });
    }

    let saldoParcial = 0;
    const filasMovimientos = movimientos
        .sort((a, b) => String(a.orden).localeCompare(String(b.orden)))
        .map(m => {
            saldoParcial += Number(m.dias) || 0;
            return `
                <tr class="border-b border-slate-100 last:border-b-0">
                    <td class="p-3 text-xs font-bold text-slate-500 whitespace-nowrap">${formatearFecha(m.fecha)}</td>
                    <td class="p-3">
                        <p class="text-xs font-black text-slate-800">${escaparHTML(m.tipo)}</p>
                        <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${escaparHTML(m.detalle)}</p>
                    </td>
                    <td class="p-3 text-right">
                        <span class="${m.clases} border rounded-lg px-2.5 py-1 text-xs font-black">${m.dias > 0 ? '+' : ''}${m.dias}</span>
                    </td>
                    <td class="p-3 text-right text-xs font-black text-slate-800 whitespace-nowrap">${saldoParcial} días</td>
                </tr>
            `;
        }).join('');

    const filasAusencias = ausencias.map(a => {
        const meta = tiposAusencia[a.tipo] || tiposAusencia.otro;
        return `
            <tr class="border-b border-slate-100">
                <td class="p-2 text-xs font-bold text-slate-700">${escaparHTML(meta.texto)}</td>
                <td class="p-2 text-xs text-slate-500">${formatearRangoCorto(a.fechaDesde, a.fechaHasta)}</td>
                <td class="p-2 text-xs font-bold text-slate-700">${Number(a.diasComputables) || 0}</td>
                <td class="p-2 text-xs font-bold ${a.descuentaVacaciones ? 'text-teal-700' : 'text-slate-400'}">${Number(a.diasADescontar) || 0}</td>
            </tr>
        `;
    }).join('');

    return `
        <section class="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-indigo-50 p-4 border-b border-indigo-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-indigo-700 text-white flex items-center justify-center font-black">${escaparHTML(inicialesEmpleado(empleado))}</div>
                    <div>
                        <h4 class="text-base font-black text-slate-800">${escaparHTML(nombreEmpleado(empleado))}</h4>
                        <p class="text-xs text-indigo-700 font-bold">${escaparHTML(etiquetaArea(empleado.area))} · Saldo al ${formatearFecha(fechaCorte)}</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button onclick="window.prepararAjusteVacacionesEmpleado('${empleado.id}')" class="bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5">
                        <span class="material-symbols-rounded" style="font-size:16px;">add</span> Agregar ajuste
                    </button>
                    <button onclick="window.seleccionarEmpleadoVacaciones('${empleado.id}')" class="bg-white hover:bg-indigo-100 border border-indigo-100 text-indigo-800 px-3 py-2 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5">
                        <span class="material-symbols-rounded" style="font-size:16px;">close</span> Cerrar ficha
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border-b border-slate-100">
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p class="text-[10px] uppercase font-black text-slate-400">Base período ${saldo.periodoVacacional}</p>
                    <p class="text-2xl font-black text-slate-800 mt-1">${saldo.diasBase}</p>
                </div>
                <div class="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p class="text-[10px] uppercase font-black text-blue-600">Ajustes y reglas</p>
                    <p class="text-2xl font-black text-blue-800 mt-1">${saldo.ajustes > 0 ? '+' : ''}${saldo.ajustes}</p>
                </div>
                <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p class="text-[10px] uppercase font-black text-emerald-600">Usados</p>
                    <p class="text-2xl font-black text-emerald-800 mt-1">${saldo.usados}</p>
                </div>
                <div class="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p class="text-[10px] uppercase font-black text-amber-600">Pendientes</p>
                    <p class="text-2xl font-black text-amber-800 mt-1">${saldo.pendientes}</p>
                </div>
                <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <p class="text-[10px] uppercase font-black text-indigo-600">${saldo.estadoPeriodo === 'futuro' ? 'Aún no disponible' : 'Saldo disponible'}</p>
                    <p class="text-2xl font-black text-indigo-900 mt-1">${saldo.disponibles}</p>
                </div>
            </div>
            <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                <span class="bg-white border border-slate-200 rounded-lg px-2 py-1">Disponible desde ${formatearFecha(saldo.fechaDisponibleDesde)}</span>
                <span class="bg-white border border-slate-200 rounded-lg px-2 py-1">Vence ${formatearFecha(saldo.fechaVencimiento)}</span>
                ${saldo.noDisponible > 0 ? `<span class="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2 py-1">${saldo.noDisponible} días todavía no habilitados</span>` : ''}
                ${saldo.vencido > 0 ? `<span class="bg-rose-50 border border-rose-100 text-rose-700 rounded-lg px-2 py-1">${saldo.vencido} vencidos</span>` : ''}
                ${saldo.solicitudesFuturas > 0 ? `<span class="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-2 py-1">${saldo.solicitudesFuturas} días cargados después de esta fecha</span>` : ''}
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
                <div class="overflow-x-auto">
                    <h5 class="text-[10px] uppercase tracking-wide font-black text-slate-400 mb-2">Historial y ajustes</h5>
                    <table class="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
                        <thead>
                            <tr class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                                <th class="p-3">Fecha</th>
                                <th class="p-3">Evento</th>
                                <th class="p-3 text-right">Monto</th>
                                <th class="p-3 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>${filasMovimientos}</tbody>
                    </table>
                </div>
                <div class="overflow-x-auto">
                    <h5 class="text-[10px] uppercase tracking-wide font-black text-slate-400 mb-2">Ausencias del año</h5>
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                                <th class="p-2">Tipo</th>
                                <th class="p-2">Período</th>
                                <th class="p-2">Comp.</th>
                                <th class="p-2">Desc.</th>
                            </tr>
                        </thead>
                        <tbody>${filasAusencias || `<tr><td colspan="4" class="p-4 text-xs text-slate-400 italic text-center">Sin ausencias cargadas.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

export function renderizarAusencias() {
    const puedeEditar = state.esAdminMaster;
    const ausenciaEditando = state.ausenciaEditandoId
        ? state.listaAusenciasFirebase.find(a => a.id === state.ausenciaEditandoId)
        : null;
    const lista = ausenciasFiltradas();
    const resumen = resumenAusencias(lista);
    const anioActual = state.filtroAnioAusencias || new Date().getFullYear();
    const feriadosEditando = Array.isArray(ausenciaEditando?.feriadosManuales)
        ? ausenciaEditando.feriadosManuales.join('\n')
        : Array.isArray(ausenciaEditando?.feriados)
            ? ausenciaEditando.feriados.join('\n')
            : '';
    const tipoSeleccionado = ausenciaEditando?.tipo || 'vacaciones';
    const descuentaSeleccionado = ausenciaEditando
        ? ausenciaEditando.descuentaVacaciones === true
        : tiposAusencia[tipoSeleccionado].descuenta;
    const aniosDisponibles = aniosConAusencias();
    const inicioTablero = inicioSemana(state.vacacionesFechaInicio || fechaAISO(new Date()));
    const fechaCorteTablero = sumarDias(inicioTablero, 34);

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
                    <div class="flex flex-wrap items-center gap-2">
                        <label class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 inline-flex items-center gap-2 text-xs font-black text-slate-700">
                            Año
                            <select onchange="window.cambiarAnioAusencias(this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black focus:ring-2 focus:ring-teal-500 focus:outline-none">
                                ${aniosDisponibles.map(anio => `<option value="${anio}" ${Number(anio) === Number(anioActual) ? 'selected' : ''}>${anio}</option>`).join('')}
                            </select>
                        </label>
                        <button onclick="window.cambiarVista('inicio')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition inline-flex items-center gap-1.5">
                            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> Inicio
                        </button>
                    </div>
                </div>
                ${aniosDisponibles.length > 1 ? `
                    <div class="flex flex-wrap items-center gap-2 mt-4">
                        <span class="text-[10px] uppercase tracking-wide font-black text-slate-400">Años con movimientos</span>
                        ${aniosDisponibles.map(anio => `
                            <button onclick="window.cambiarAnioAusencias('${anio}')" class="${Number(anio) === Number(anioActual) ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-lg px-2.5 py-1 text-[11px] font-black transition">${anio}</button>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-slate-400">Registros visibles ${anioActual}</p>
                        <p class="text-2xl font-black text-slate-800 mt-1">${lista.length}</p>
                    </div>
                    <div class="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-teal-600">Vacaciones aprobadas</p>
                        <p class="text-2xl font-black text-teal-800 mt-1">${resumen.vacacionesDeducidas}</p>
                    </div>
                    <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-amber-600">Pendientes</p>
                        <p class="text-2xl font-black text-amber-800 mt-1">${resumen.solicitudesPendientes}</p>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                        <p class="text-[10px] uppercase tracking-wide font-black text-emerald-600">En curso</p>
                        <p class="text-2xl font-black text-emerald-800 mt-1">${resumen.enCurso}</p>
                    </div>
                </div>
            </section>

            ${renderizarTableroVacaciones(anioActual)}
            ${renderizarSolicitudesPendientes(puedeEditar)}
            ${renderizarFichaEmpleadoVacaciones(anioActual, fechaCorteTablero)}
            ${renderizarReglasVacaciones(anioActual, puedeEditar)}

            <section class="grid grid-cols-1 xl:grid-cols-[420px_420px_1fr] gap-5 items-start">
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
                            ${calcularDiasAusenciaCCT108(ausenciaEditando?.fechaDesde || '', ausenciaEditando?.fechaHasta || '', [...new Set([...(ausenciaEditando?.feriados || []), ...feriadosArgentinaRango(ausenciaEditando?.fechaDesde || '', ausenciaEditando?.fechaHasta || '')])])} días computables · ${contarDiasCalendario(ausenciaEditando?.fechaDesde || '', ausenciaEditando?.fechaHasta || '')} calendario
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

                ${renderizarAjustesVacaciones(anioActual, puedeEditar)}

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
