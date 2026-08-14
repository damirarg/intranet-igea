import { state, baseRecibos } from '../app-state.js';
import { cambiarVista } from '../ui.js';

const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function escaparHTML(valor) {
    return String(valor || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function puedeGestionarGuardias() {
    return state.esAdminMaster || state.tienePermisoGuardias;
}

function obtenerGuardia(fecha) {
    return state.listaGuardiasFirebase.find(g => g.fecha === fecha);
}

function normalizarMedicos(guardia) {
    if (!guardia || !Array.isArray(guardia.medicos)) return [];

    return guardia.medicos
        .filter(m => m && m.nombre)
        .map(m => ({
            nombre: m.nombre || '',
            especialidad: m.especialidad || '',
            contacto: m.contacto || ''
        }));
}

function nombreAdministrativo(guardia, corto = false) {
    if (!guardia || !guardia.colaboradorEmail) return '';

    const emp = baseRecibos.find(e => e.email.toLowerCase().trim() === guardia.colaboradorEmail.toLowerCase().trim());
    const nombre = emp && emp.nombre ? emp.nombre : (guardia.colaboradorNombre || guardia.colaboradorEmail);

    if (!corto) return nombre;

    const partes = nombre.trim().split(/\s+/);
    return partes.length > 1 ? partes[partes.length - 1] : nombre;
}

function formatearFecha(fechaString, opciones = { weekday: 'short', day: 'numeric', month: 'short' }) {
    const [anio, mes, dia] = fechaString.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', opciones);
}

function fechaKeyDesdeDate(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function renderizarBloqueActual() {
    const hoyKey = fechaKeyDesdeDate(new Date());
    const guardiaHoy = obtenerGuardia(hoyKey);
    const medicosHoy = normalizarMedicos(guardiaHoy);
    const adminHoy = nombreAdministrativo(guardiaHoy);

    const proximas = state.listaGuardiasFirebase
        .filter(g => g.fecha && g.fecha >= hoyKey)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 4);

    const proximasHTML = proximas.length > 0 ? proximas.map(g => {
        const admin = nombreAdministrativo(g, true);
        const medicos = normalizarMedicos(g);
        return `
            <div class="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                <div class="min-w-0">
                    <p class="text-xs font-black text-slate-700 capitalize">${escaparHTML(formatearFecha(g.fecha))}</p>
                    <p class="text-[11px] text-slate-500 truncate">${admin ? escaparHTML(admin) : 'Sin administración'} · ${medicos.length} médico${medicos.length === 1 ? '' : 's'}</p>
                </div>
                ${g.feriado ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg shrink-0">Feriado</span>' : ''}
            </div>
        `;
    }).join('') : `
        <p class="text-xs text-slate-400 italic py-4 text-center">No hay próximas guardias cargadas.</p>
    `;

    const medicosHoyHTML = medicosHoy.length > 0 ? medicosHoy.map(m => `
        <div class="rounded-xl border border-emerald-100 bg-white p-3">
            <p class="text-sm font-black text-slate-800">${escaparHTML(m.nombre)}</p>
            <p class="text-xs text-emerald-700 font-semibold">${escaparHTML(m.especialidad || 'Médico de guardia')}</p>
            ${m.contacto ? `<p class="text-xs text-slate-500 mt-1">${escaparHTML(m.contacto)}</p>` : ''}
        </div>
    `).join('') : `
        <div class="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-400 italic">
            Sin médicos cargados para hoy.
        </div>
    `;

    return `
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-3 mb-3 shrink-0">
            <div class="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div class="flex items-start justify-between gap-3 mb-2">
                    <div>
                        <p class="text-[10px] font-black text-sky-600 uppercase tracking-wider">Guardia de hoy</p>
                        <h3 class="text-base md:text-lg font-black text-slate-800 capitalize">${escaparHTML(formatearFecha(hoyKey, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>
                    </div>
                    ${guardiaHoy && guardiaHoy.feriado ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">Feriado</span>' : ''}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-[0.7fr_1.3fr] gap-2">
                    <div class="rounded-xl bg-sky-50 border border-sky-100 p-2.5">
                        <p class="text-[10px] font-black text-sky-700 uppercase tracking-wider mb-1">Administración</p>
                        <p class="text-sm font-black text-slate-800">${adminHoy ? escaparHTML(adminHoy) : 'Sin asignar'}</p>
                    </div>
                    <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                        <p class="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-1.5">Médicos</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${medicosHoyHTML}</div>
                    </div>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Próximas guardias</p>
                ${proximasHTML}
            </div>
        </div>
    `;
}

function renderizarContenidoGuardia(guardia) {
    if (!guardia) return '';

    const admin = nombreAdministrativo(guardia, true);
    const medicos = normalizarMedicos(guardia);
    const notas = guardia.notas || guardia.notes || '';

    let html = '';

    if (admin) {
        html += `
            <div class="mt-1.5 bg-sky-100 border border-sky-300 text-sky-800 px-1.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black tracking-tight text-center truncate" title="${escaparHTML(nombreAdministrativo(guardia))}">
                <span class="material-symbols-rounded" style="font-size: 12px;">support_agent</span> ${escaparHTML(admin)}
            </div>
        `;
    }

    if (medicos.length > 0) {
        html += `
            <div class="mt-1 space-y-0.5">
                ${medicos.slice(0, 2).map(m => `
                    <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-md text-[8px] md:text-[9px] font-bold truncate" title="${escaparHTML([m.nombre, m.especialidad, m.contacto].filter(Boolean).join(' · '))}">
                        <span class="material-symbols-rounded" style="font-size: 11px;">stethoscope</span> ${escaparHTML(m.nombre)}
                    </div>
                `).join('')}
                ${medicos.length > 2 ? `<p class="text-[8px] text-emerald-700 font-bold text-center">+${medicos.length - 2} más</p>` : ''}
            </div>
        `;
    }

    if (notas.trim() !== "") {
        html += `
            <p class="text-[9px] text-slate-400 italic mt-1 truncate px-1 text-center" title="${escaparHTML(notas)}">${escaparHTML(notas)}</p>
        `;
    }

    return html;
}

export function guardiasMesSiguiente() {
    state.guardiaMesActual++;
    if (state.guardiaMesActual > 11) {
        state.guardiaMesActual = 0;
        state.guardiaAnioActual++;
    }
    cambiarVista('guardias');
}

export function guardiasMesAnterior() {
    state.guardiaMesActual--;
    if (state.guardiaMesActual < 0) {
        state.guardiaMesActual = 11;
        state.guardiaAnioActual--;
    }
    cambiarVista('guardias');
}

export function renderizarGuardias() {
    const mes = state.guardiaMesActual;
    const anio = state.guardiaAnioActual;
    const primerDia = new Date(anio, mes, 1);
    let primerDiaIndex = primerDia.getDay();
    primerDiaIndex = primerDiaIndex === 0 ? 6 : primerDiaIndex - 1;

    const totalDias = new Date(anio, mes + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(anio, mes, 0).getDate();
    const puedeEditar = puedeGestionarGuardias();

    let celdasHTML = [];

    for (let i = primerDiaIndex - 1; i >= 0; i--) {
        const diaAnterior = totalDiasMesAnterior - i;
        celdasHTML.push(`
            <div class="min-h-[72px] md:min-h-[86px] 2xl:min-h-[96px] p-1.5 bg-slate-50/50 border border-slate-100 rounded-xl opacity-30 select-none">
                <span class="text-[10px] md:text-xs font-semibold text-slate-400">${diaAnterior}</span>
            </div>
        `);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
        const diaStr = String(dia).padStart(2, '0');
        const mesStr = String(mes + 1).padStart(2, '0');
        const fechaKey = `${anio}-${mesStr}-${diaStr}`;
        const fechaObj = new Date(anio, mes, dia);
        const diaSemanaIndex = fechaObj.getDay();
        const esFinDeSemana = (diaSemanaIndex === 0 || diaSemanaIndex === 6);
        const guardia = obtenerGuardia(fechaKey);
        const tieneMedicos = normalizarMedicos(guardia).length > 0;
        const tieneAdmin = Boolean(guardia && guardia.colaboradorEmail);

        let bgCelda = "bg-white border-slate-200 hover:border-sky-400 hover:shadow-md";
        let textDiaColor = "text-slate-600";

        if (esFinDeSemana) {
            bgCelda = "bg-slate-50 border-slate-200 hover:border-sky-400 hover:shadow-md";
            textDiaColor = "text-slate-800 font-bold";
        }

        const hoy = new Date();
        const esHoy = (hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio);
        if (esHoy) {
            bgCelda = "bg-sky-50/70 border-sky-400 ring-2 ring-sky-100 hover:shadow-md";
            textDiaColor = "text-sky-700 font-bold";
        }

        let badgeFeriadoHTML = "";

        if (guardia && guardia.feriado) {
            badgeFeriadoHTML = `
                <span class="bg-red-50 text-red-600 border border-red-200 text-[8px] md:text-[9px] font-black px-1 rounded flex items-center gap-0.5" title="Día feriado">
                    Feriado
                </span>
            `;
            bgCelda = "bg-red-50/40 border-red-200 hover:border-red-400 hover:shadow-md";
        }

        const estadoDiaHTML = `
            <div class="flex gap-1 mt-1.5">
                ${tieneAdmin ? '<span class="h-1.5 flex-1 rounded-full bg-sky-400" title="Administración asignada"></span>' : '<span class="h-1.5 flex-1 rounded-full bg-slate-200" title="Sin administración"></span>'}
                ${tieneMedicos ? '<span class="h-1.5 flex-1 rounded-full bg-emerald-400" title="Médicos cargados"></span>' : '<span class="h-1.5 flex-1 rounded-full bg-slate-200" title="Sin médicos"></span>'}
            </div>
        `;

        const clickAttr = puedeEditar
            ? `onclick="window.abrirModalGuardia('${fechaKey}')" class="min-h-[72px] md:min-h-[86px] 2xl:min-h-[96px] p-1.5 border rounded-xl cursor-pointer transition ${bgCelda}"`
            : `class="min-h-[72px] md:min-h-[86px] 2xl:min-h-[96px] p-1.5 border rounded-xl transition ${bgCelda}"`;

        celdasHTML.push(`
            <div ${clickAttr}>
                <div class="flex items-center justify-between gap-1">
                    <span class="text-xs md:text-sm ${textDiaColor}">${dia}</span>
                    <div class="flex gap-1 items-center">
                        ${badgeFeriadoHTML}
                        ${esHoy ? '<span class="bg-sky-600 w-1.5 h-1.5 rounded-full" title="Hoy"></span>' : ''}
                    </div>
                </div>
                ${estadoDiaHTML}
                ${renderizarContenidoGuardia(guardia)}
            </div>
        `);
    }

    const celdasTotales = celdasHTML.length;
    const celdasRestantes = celdasTotales <= 35 ? 35 - celdasTotales : 42 - celdasTotales;
    for (let i = 1; i <= celdasRestantes; i++) {
        celdasHTML.push(`
            <div class="min-h-[72px] md:min-h-[86px] 2xl:min-h-[96px] p-1.5 bg-slate-50/50 border border-slate-100 rounded-xl opacity-30 select-none">
                <span class="text-[10px] md:text-xs font-semibold text-slate-400">${i}</span>
            </div>
        `);
    }

    const encabezadoDiasHTML = diasSemana.map(d => `
        <div class="text-center font-bold text-slate-500 text-xs md:text-sm uppercase tracking-wider py-1.5 select-none">${d}</div>
    `).join('');

    return `
        ${renderizarBloqueActual()}

        <div class="mb-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <div>
                <h3 class="font-black text-slate-800 text-base md:text-lg">Cronograma de Guardias Pasivas</h3>
                <p class="text-xs text-slate-500">Guardias administrativas y médicas en un solo calendario operativo.</p>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sky-400"></span> Administración</span>
                    <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Médicos</span>
                </div>
                <div class="flex items-center gap-1.5 justify-between sm:justify-end">
                    <button onclick="window.guardiasMesAnterior()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 w-8 h-8 rounded-xl flex items-center justify-center transition">
                        <span class="material-symbols-rounded" style="font-size: 18px;">chevron_left</span>
                    </button>
                    <span class="font-bold text-slate-800 text-xs md:text-sm min-w-[120px] text-center select-none uppercase tracking-wide">
                        ${meses[mes]} ${anio}
                    </span>
                    <button onclick="window.guardiasMesSiguiente()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 w-8 h-8 rounded-xl flex items-center justify-center transition">
                        <span class="material-symbols-rounded" style="font-size: 18px;">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-2.5 md:p-3 shadow-sm shrink-0">
            <div class="grid grid-cols-7 gap-1.5 border-b border-slate-100 pb-1.5 mb-1.5">
                ${encabezadoDiasHTML}
            </div>

            <div class="grid grid-cols-7 gap-1.5 select-none">
                ${celdasHTML.join('')}
            </div>
        </div>
    `;
}
