import { state } from '../../app-state.js';
import { renderizarImportacionDebitos } from './debitos-importacion.js';
import { escaparHTML, formatearMonedaAR } from './debitos-utils.js';

export function cambiarVistaDebitos(vista) {
    state.debitosVistaActual = vista || 'dashboard';
    window.cambiarVista('debitos');
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

function renderizarDashboard() {
    const totalDebitado = state.listaDebitosLotesFirebase.reduce((total, lote) => total + (Number(lote.importeTotalDebitado) || 0), 0);
    const totalPrestaciones = state.listaDebitosPrestacionesFirebase.length;

    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white border-t-4 border-t-orange-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Total debitado importado</span>
                <strong class="text-2xl text-slate-900">${formatearMonedaAR(totalDebitado)}</strong>
            </div>
            <div class="bg-white border-t-4 border-t-slate-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Lotes</span>
                <strong class="text-2xl text-slate-900">${state.listaDebitosLotesFirebase.length}</strong>
            </div>
            <div class="bg-white border-t-4 border-t-blue-500 border-x border-b border-slate-100 rounded-2xl p-4 shadow-sm">
                <span class="block text-[11px] font-black text-slate-400 uppercase">Prestaciones</span>
                <strong class="text-2xl text-slate-900">${totalPrestaciones}</strong>
            </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-4">
            <h4 class="font-black text-slate-800 text-sm">MVP del módulo</h4>
            <p class="text-xs text-slate-500 mt-1">La primera etapa consolida importación por lote. La gestión, refacturación y recupero real se construirán sobre estos datos.</p>
        </div>
    `;
}

function renderizarLotes() {
    if (state.listaDebitosLotesFirebase.length === 0) {
        return `<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">Todavía no hay lotes importados.</div>`;
    }

    const lotes = [...state.listaDebitosLotesFirebase].sort((a, b) => {
        const fechaA = a.fechaImportacion && a.fechaImportacion.toMillis ? a.fechaImportacion.toMillis() : 0;
        const fechaB = b.fechaImportacion && b.fechaImportacion.toMillis ? b.fechaImportacion.toMillis() : 0;
        return fechaB - fechaA;
    });

    return `
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-xs">
                <thead class="bg-slate-50 text-slate-500">
                    <tr>
                        <th class="text-left p-3 font-black">Financiador</th>
                        <th class="text-left p-3 font-black">Período</th>
                        <th class="text-left p-3 font-black">Archivo</th>
                        <th class="text-right p-3 font-black">Registros</th>
                        <th class="text-right p-3 font-black">Total debitado</th>
                    </tr>
                </thead>
                <tbody>
                    ${lotes.map(lote => `
                        <tr class="border-t border-slate-100 hover:bg-slate-50">
                            <td class="p-3 font-black text-slate-800">${escaparHTML(lote.financiador || '-')}</td>
                            <td class="p-3 text-slate-600">${escaparHTML(lote.periodo || '-')}</td>
                            <td class="p-3 text-slate-500">${escaparHTML(lote.archivoNombre || '-')}</td>
                            <td class="p-3 text-right font-semibold text-slate-700">${lote.cantidadRegistros || 0}</td>
                            <td class="p-3 text-right font-black text-orange-700">${formatearMonedaAR(lote.importeTotalDebitado)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarPrestaciones() {
    const prestaciones = state.listaDebitosPrestacionesFirebase.slice(0, 100);

    if (prestaciones.length === 0) {
        return `<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">Todavía no hay prestaciones importadas.</div>`;
    }

    return `
        <div class="bg-white border border-slate-200 rounded-2xl overflow-auto shadow-sm max-h-[560px]">
            <table class="w-full text-xs">
                <thead class="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                        <th class="text-left p-3 font-black">Financiador</th>
                        <th class="text-left p-3 font-black">Paciente</th>
                        <th class="text-left p-3 font-black">Concepto</th>
                        <th class="text-left p-3 font-black">Motivo</th>
                        <th class="text-right p-3 font-black">Débito</th>
                        <th class="text-left p-3 font-black">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${prestaciones.map(prestacion => {
                        const campos = prestacion.camposNormalizados || {};
                        const gestion = prestacion.gestion || {};
                        return `
                            <tr class="border-t border-slate-100 hover:bg-slate-50">
                                <td class="p-3 font-semibold text-slate-700">${escaparHTML(prestacion.financiador || '-')}</td>
                                <td class="p-3 font-black text-slate-800">${escaparHTML(campos.paciente || '-')}</td>
                                <td class="p-3 text-slate-600">${escaparHTML(campos.concepto || '-')}</td>
                                <td class="p-3 text-slate-500">${escaparHTML(campos.motivoDebito || '-')}</td>
                                <td class="p-3 text-right font-black text-orange-700">${formatearMonedaAR(campos.importeDebitado)}</td>
                                <td class="p-3 text-slate-600">${escaparHTML(gestion.estado || 'debito_recibido')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderizarSeguimiento() {
    return `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h4 class="font-black text-slate-800 text-sm">Seguimiento de recupero</h4>
            <p class="text-xs text-slate-500 mt-1">Pendiente para la siguiente etapa: análisis, estado refacturable, refacturado, recuperado, parcial, perdido y trazabilidad por acción.</p>
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
