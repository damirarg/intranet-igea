import { state } from '../app-state.js';
import { cambiarVista } from '../ui.js';

export function parsearMontoNumerico(montoTexto) {
    if (!montoTexto) return 0;
    let limpio = montoTexto.toString().replace('$', '').replace(/\./g, '').replace(',', '.').trim();
    let num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}

export function formatearMonedaAR(monto) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
}

export function alternarFiltroSaldadas(estado) {
    state.verCuentasSaldadas = estado;
    cambiarVista('saldos');
}

export function procesarArchivoCSV(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    state.datosCSVPrecargados = [];

    window.Papa.parse(archivo, {
        header: true,
        skipEmptyLines: true,
        complete: function(resultados) {
            let datosBrutos = resultados.data;
            let mapaUnificado = {};

            datosBrutos.forEach(fila => {
                let nombrePaciente = fila.enfaRazonSocial ? fila.enfaRazonSocial.trim() : 'Sin Nombre';
                let saldoTexto = fila.ventSaldo || "0";
                let saldoNumerico = parsearMontoNumerico(saldoTexto);
                let impOrigNum = parsearMontoNumerico(fila.ventImporteTotal || "0");
                let comprobante = fila.ventFactura ? fila.ventFactura.trim() : '-';

                if (saldoNumerico > 0.01) {
                    if (!mapaUnificado[nombrePaciente]) {
                        mapaUnificado[nombrePaciente] = {
                            paciente: nombrePaciente,
                            ultimoPago: fila.enfaUltimoPago || '-',
                            periodo: fila.ventPeriodo || '-',
                            fecha: fila.ventFecha || '-',
                            comprobantes: [comprobante],
                            importeOrigNum: impOrigNum,
                            saldoNum: saldoNumerico
                        };
                    } else {
                        mapaUnificado[nombrePaciente].saldoNum += saldoNumerico;
                        mapaUnificado[nombrePaciente].importeOrigNum += impOrigNum;
                        if (!mapaUnificado[nombrePaciente].comprobantes.includes(comprobante)) {
                            mapaUnificado[nombrePaciente].comprobantes.push(comprobante);
                        }
                    }
                }
            });

            state.datosCSVPrecargados = Object.values(mapaUnificado).map(item => ({
                paciente: item.paciente,
                ultimoPago: item.ultimoPago,
                periodo: item.periodo,
                fecha: item.fecha,
                comprobante: item.comprobantes.join(' / '),
                importeOrig: formatearMonedaAR(item.importeOrigNum),
                saldo: formatearMonedaAR(item.saldoNum),
                saldoNum: item.saldoNum
            }));

            cambiarVista('saldos');
        },
        error: function() { alert("Error al leer el archivo CSV."); }
    });
}

export function cancelarCargaCSV() {
    state.datosCSVPrecargados = [];
    document.getElementById('input-csv').value = '';
    cambiarVista('saldos');
}

export function seleccionarTodosSaldos(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.check-saldo-fbre');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
}

export function habilitarColumnasRedimensionables() {
    const resizers = document.querySelectorAll('.resizer');
    resizers.forEach(resizer => {
        let x = 0;
        let w = 0;
        let th = resizer.parentElement;

        const mouseDownHandler = function (e) {
            e.preventDefault();
            e.stopPropagation();

            x = e.clientX;
            const styles = window.getComputedStyle(th);
            w = parseInt(styles.width, 10);

            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
            resizer.classList.add('resizing');
        };

        const mouseMoveHandler = function (e) {
            const dx = e.clientX - x;
            let nuevoAncho = Math.max(20, w + dx);
            
            th.style.width = `${nuevoAncho}px`;
            th.style.minWidth = `${nuevoAncho}px`;
        };

        const mouseUpHandler = function () {
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
            resizer.classList.remove('resizing');
        };

        resizer.addEventListener('mousedown', mouseDownHandler);
    });
}

export function aplicarOrdenamientoSaldos() {
    if (!state.listaSaldosFirebase || state.listaSaldosFirebase.length === 0) return;

    state.listaSaldosFirebase.sort((a, b) => {
        let valA = a[state.columnaOrdenActual] || '';
        let valB = b[state.columnaOrdenActual] || '';

        if (state.columnaOrdenActual === 'saldo' || state.columnaOrdenActual === 'importeOrig') {
            valA = parsearMontoNumerico(valA);
            valB = parsearMontoNumerico(valB);
        } else if (state.columnaOrdenActual === 'acuerdoEspecial') {
            valA = a.acuerdoEspecial === true ? 1 : 0;
            valB = b.acuerdoEspecial === true ? 1 : 0;
        } else if (state.columnaOrdenActual === 'tienePagare') {
            valA = a.tienePagare === true ? 1 : 0;
            valB = b.tienePagare === true ? 1 : 0;
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return state.ordenAscendente ? -1 : 1;
        if (valA > valB) return state.ordenAscendente ? 1 : -1;
        return 0;
    });
}

export function ordenarSaldos(columnaKey) {
    if (state.columnaOrdenActual === columnaKey) {
        state.ordenAscendente = !state.ordenAscendente;
    } else {
        state.columnaOrdenActual = columnaKey;
        state.ordenAscendente = true;
    }
    aplicarOrdenamientoSaldos();
    cambiarVista('saldos');
}

function iconoOrden(columnaKey) {
    if (state.columnaOrdenActual !== columnaKey) return '<span class="text-slate-300 text-[9px] ml-0.5 pointer-events-none">⇅</span>';
    return state.ordenAscendente ? '<span class="text-rose-600 text-[9px] ml-0.5 pointer-events-none">▲</span>' : '<span class="text-rose-600 text-[9px] ml-0.5 pointer-events-none">▼</span>';
}

export function renderizarSaldos() {
    if (!state.esAdminMaster) state.verCuentasSaldadas = false;

    let cuentasVisibles = state.listaSaldosFirebase.filter(c => state.verCuentasSaldadas ? c.saldada === true : c.saldada !== true);

    let totalSaldosAcumulados = 0;
    if (state.datosCSVPrecargados.length > 0) {
        totalSaldosAcumulados = state.datosCSVPrecargados.reduce((acc, curr) => acc + (curr.saldoNum || parsearMontoNumerico(curr.saldo)), 0);
    } else {
        let activas = state.listaSaldosFirebase.filter(c => c.saldada !== true);
        totalSaldosAcumulados = activas.reduce((acc, curr) => acc + parsearMontoNumerico(curr.saldo), 0);
    }

    let selectorPestanasSaldosHTML = state.esAdminMaster ? `
        <div class="bg-slate-100 p-1 rounded-xl flex gap-1 shrink-0">
            <button onclick="window.alternarFiltroSaldadas(false)" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition ${!state.verCuentasSaldadas ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}">Activas</button>
            <button onclick="window.alternarFiltroSaldadas(true)" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition ${state.verCuentasSaldadas ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}">Saldadas</button>
        </div>
    ` : '';

    let htmlSuperior = `
        <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
            <div class="md:col-span-2 bg-rose-50 p-4 md:p-5 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <span class="material-symbols-rounded absolute -right-4 -bottom-4 text-8xl text-rose-100/50 pointer-events-none">request_quote</span>
                <div class="relative z-10">
                    <h3 class="font-bold text-rose-900 text-lg md:text-xl">Gestión de Saldos de Cuentas</h3>
                    <p class="text-xs text-rose-700 font-medium mt-0.5">Módulo para seguimiento de pagarés, obras sociales y cobranzas.</p>
                </div>
                <div class="relative z-10 mt-3 flex items-center justify-between gap-3">
                    <label for="input-csv" class="cursor-pointer bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold px-3.5 py-2 rounded-xl transition shadow-sm inline-flex items-center justify-center gap-1.5 text-xs w-full md:w-auto">
                        <span class="material-symbols-rounded" style="font-size: 16px;">upload_file</span> Cargar CSV
                    </label>
                    <input type="file" id="input-csv" accept=".csv" class="hidden" onchange="window.procesarArchivoCSV(event)">
                </div>
            </div>

            <div class="bg-white p-4 md:p-5 rounded-3xl border-t-4 border-t-rose-500 border-x border-b border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Pendiente Activo</span>
                        <div class="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                            <span class="material-symbols-rounded" style="font-size: 16px;">payments</span>
                        </div>
                    </div>
                    <h4 class="text-xl lg:text-2xl font-black text-rose-600 tracking-tight mt-0.5">
                        ${formatearMonedaAR(totalSaldosAcumulados)}
                    </h4>
                </div>
                <p class="text-[10px] text-slate-400 font-medium mt-2">
                    Total adeudado en cuentas activas.
                </p>
            </div>
        </div>
    `;

    if (state.datosCSVPrecargados.length > 0) {
        let filasHTML = state.datosCSVPrecargados.map((reg, index) => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-2 text-center celda-recortable sticky left-0 z-10 bg-white">
                    <input type="checkbox" class="check-saldo w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500" data-index="${index}" checked>
                </td>
                <td class="p-2 font-semibold text-slate-800 text-xs celda-recortable sticky left-8 z-10 bg-white shadow-xs" title="${reg.paciente}">${reg.paciente}</td>
                <td class="p-2 text-slate-500 text-[11px] celda-recortable">${reg.ultimoPago}</td>
                <td class="p-2 text-slate-500 text-[11px] celda-recortable">${reg.periodo}</td>
                <td class="p-2 text-slate-500 text-[11px] text-center celda-recortable" title="${reg.comprobante}">${reg.comprobante}</td>
                <td class="p-2 text-slate-500 text-[11px] text-right celda-recortable">${reg.importeOrig}</td>
                <td class="p-2 text-rose-600 font-bold text-xs text-right celda-recortable">${reg.saldo}</td>
            </tr>
        `).join('');

        setTimeout(habilitarColumnasRedimensionables, 100);

        return htmlSuperior + `
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shrink-0 mb-6">
                <div class="p-3 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs font-semibold flex items-center justify-between">
                    <span>Modo Precarga: Cuentas Unificadas por Paciente.</span>
                    <button onclick="window.cancelarCargaCSV()" class="text-[11px] bg-white border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition">Cancelar</button>
                </div>
                <div class="overflow-x-auto max-h-[55vh]">
                    <table class="tabla-flexible text-left border-collapse">
                        <thead class="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr class="border-b border-slate-200 text-slate-500 text-[9px] uppercase tracking-wider">
                                <th class="p-2 text-center w-8 resizable celda-recortable sticky left-0 z-30 bg-slate-50">Sel<div class="resizer"></div></th>
                                <th class="p-2 resizable w-36 celda-recortable sticky left-8 z-30 bg-slate-50 shadow-xs">Paciente<div class="resizer"></div></th>
                                <th class="p-2 resizable w-24 celda-recortable">Últ. Pago<div class="resizer"></div></th>
                                <th class="p-2 resizable w-20 celda-recortable">Período<div class="resizer"></div></th>
                                <th class="p-2 text-center resizable w-44 celda-recortable">Comprobantes<div class="resizer"></div></th>
                                <th class="p-2 text-right resizable w-28 celda-recortable">Imp. Orig.<div class="resizer"></div></th>
                                <th class="p-2 text-right resizable w-28 celda-recortable">Saldo Unificado<div class="resizer"></div></th>
                            </tr>
                        </thead>
                        <tbody>${filasHTML}</tbody>
                    </table>
                </div>
                <div class="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <span class="text-xs text-slate-500 font-medium">${state.datosCSVPrecargados.length} cuentas listas para revisión.</span>
                    <button id="btn-guardar-saldos" onclick="window.guardarSaldosSeleccionados()" class="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-rose-200 flex items-center gap-1">
                        <span class="material-symbols-rounded" style="font-size: 16px;">cloud_upload</span> Guardar Selección
                    </button>
                </div>
            </div>
        `;
    } 
    
    else {
        if (cuentasVisibles.length === 0) {
            return htmlSuperior + `
                <div class="mb-3">${selectorPestanasSaldosHTML}</div>
                <div class="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-2xl shrink-0">
                    <span class="material-symbols-rounded text-4xl mb-2 opacity-50">data_table</span>
                    <p class="text-sm font-medium">${state.verCuentasSaldadas ? 'No hay cuentas saldadas guardadas.' : 'No hay cuentas activas en seguimiento.'}</p>
                </div>
            `;
        }

        let filasFirebaseHTML = cuentasVisibles.map(cuenta => {
            let esAcuerdoEspecial = cuenta.acuerdoEspecial === true;
            let tienePagare = cuenta.tienePagare === true;
            let esSaldada = cuenta.saldada === true;

            let bgFila = 'hover:bg-slate-50';
            let bgCeldaFija = 'bg-white';
            
            if (esSaldada) {
                bgFila = 'bg-emerald-50/60 hover:bg-emerald-100/60';
                bgCeldaFija = 'bg-emerald-50';
            } else if (tienePagare) {
                bgFila = 'bg-sky-50/70 hover:bg-sky-100/70 border-sky-100';
                bgCeldaFija = 'bg-sky-50';
            } else if (esAcuerdoEspecial) {
                bgFila = 'bg-amber-50/60 hover:bg-amber-100/60';
                bgCeldaFija = 'bg-amber-50';
            }

            let columnaEstadoHTML = esAcuerdoEspecial ? `
                <button onclick="window.toggleAcuerdoEspecialFirebase('${cuenta.id}', false)" 
                    title="Quitar marca de acuerdo especial" 
                    class="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-2xs hover:bg-amber-200 transition truncate max-w-full">
                    🤝 Acuerdo
                </button>
            ` : `
                <button onclick="window.toggleAcuerdoEspecialFirebase('${cuenta.id}', true)" 
                    title="Marcar como cuenta con acuerdo especial" 
                    class="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition flex items-center gap-0.5 truncate max-w-full">
                    <span class="material-symbols-rounded shrink-0" style="font-size: 12px;">handshake</span> + Acu
                </button>
            `;

            let casillaSeleccionHTML = state.esAdminMaster ? `
                <input type="checkbox" class="check-saldo-fbre w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer" data-id="${cuenta.id}">
            ` : '<span class="text-slate-300 text-[10px]">•</span>';

            return `
                <tr class="border-b border-slate-100 transition ${bgFila}">
                    <td class="p-2 text-center celda-recortable sticky left-0 z-10 ${bgCeldaFija}">
                        ${casillaSeleccionHTML}
                    </td>
                    
                    <td class="p-2 font-semibold text-slate-800 text-[11px] celda-recortable sticky left-8 z-10 ${bgCeldaFija} shadow-xs" title="${cuenta.paciente}">
                        ${cuenta.paciente}
                    </td>

                    <td class="p-1.5 text-center celda-recortable">
                        <label class="inline-flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" ${tienePagare ? 'checked' : ''} 
                                onchange="window.togglePagareFirebase('${cuenta.id}', this.checked)"
                                class="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer">
                            <span class="text-[9px] font-bold ${tienePagare ? 'text-sky-800' : 'text-slate-400'}">${tienePagare ? 'SI' : 'NO'}</span>
                        </label>
                    </td>

                    <td class="p-1.5 celda-recortable">
                        ${columnaEstadoHTML}
                    </td>
                    
                    <td class="p-1.5 celda-recortable">
                        <input type="text" 
                            value="${cuenta.obraSocial || ''}" 
                            placeholder="OSDE"
                            onchange="window.actualizarCampoFirebase('${cuenta.id}', 'obraSocial', this.value)"
                            class="w-full min-w-0 bg-slate-50/80 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] focus:bg-white focus:ring-1 focus:ring-rose-400 focus:outline-none transition">
                    </td>

                    <td class="p-1.5 celda-recortable">
                        <input type="text" 
                            value="${cuenta.practica || ''}" 
                            placeholder="VEDA"
                            onchange="window.actualizarCampoFirebase('${cuenta.id}', 'practica', this.value)"
                            class="w-full min-w-0 bg-slate-50/80 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] focus:bg-white focus:ring-1 focus:ring-rose-400 focus:outline-none transition">
                    </td>

                    <td class="p-2 text-slate-500 text-[11px] text-center celda-recortable" title="${cuenta.ultimoPago}">${cuenta.ultimoPago}</td>
                    <td class="p-2 text-slate-500 text-[11px] text-center celda-recortable" title="${cuenta.periodo}">${cuenta.periodo}</td>
                    <td class="p-2 text-slate-500 text-[11px] text-center celda-recortable" title="${cuenta.comprobante}">${cuenta.comprobante}</td>
                    <td class="p-2 text-slate-500 text-[11px] text-right celda-recortable" title="${cuenta.importeOrig}">${cuenta.importeOrig}</td>
                    <td class="p-2 ${esSaldada ? 'text-emerald-600' : 'text-rose-600'} font-bold text-xs text-right celda-recortable" title="${cuenta.saldo}">${cuenta.saldo}</td>
                    
                    <td class="p-2 text-right celda-recortable flex items-center justify-end gap-1">
                        ${!esSaldada ? `
                            <button onclick="window.abrirModalCobro('${cuenta.id}')" title="Registrar Cobro" class="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 px-1.5 py-1 rounded transition text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                                <span class="material-symbols-rounded" style="font-size: 13px;">payments</span> Cobrar
                            </button>
                        ` : `
                            <span class="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                Saldada
                            </span>
                        `}

                        <button onclick="window.abrirModalGestion('${cuenta.id}')" class="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 px-1.5 py-1 rounded transition text-[10px] font-semibold flex items-center justify-center gap-0.5 shrink-0">
                            <span class="material-symbols-rounded shrink-0" style="font-size: 14px;">edit_document</span> 
                            Gestión <span class="bg-slate-200 text-slate-500 px-1 rounded-full text-[9px] ml-0.5">${cuenta.gestiones ? cuenta.gestiones.length : 0}</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        setTimeout(habilitarColumnasRedimensionables, 100);

        let btnEliminarMasivoHTML = state.esAdminMaster ? `
            <button onclick="window.eliminarSaldosSeleccionados()" class="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs">
                <span class="material-symbols-rounded text-red-500" style="font-size: 15px;">delete</span> Eliminar
            </button>
        ` : '';

        return htmlSuperior + `
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shrink-0 mb-6">
                <div class="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-slate-700 text-xs md:text-sm">${state.verCuentasSaldadas ? 'Histórico Saldadas' : 'Cuentas Activas'} (${cuentasVisibles.length})</h4>
                        ${selectorPestanasSaldosHTML}
                    </div>
                    ${btnEliminarMasivoHTML}
                </div>
                <div class="overflow-x-auto max-h-[60vh]">
                    <table class="tabla-flexible text-left border-collapse">
                        <thead class="sticky top-0 z-10 bg-slate-50 shadow-sm select-none">
                            <tr class="border-b border-slate-200 text-slate-500 text-[9px] uppercase tracking-wider">
                                <th class="p-2 text-center w-8 resizable celda-recortable sticky left-0 z-30 bg-slate-50">
                                    ${state.esAdminMaster ? `<input type="checkbox" onchange="window.seleccionarTodosSaldos(this)" class="w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer" title="Seleccionar todos">` : ''}
                                    <div class="resizer"></div>
                                </th>
                                
                                <th onclick="window.ordenarSaldos('paciente')" class="p-2 resizable w-36 cursor-pointer hover:bg-slate-100 transition celda-recortable sticky left-8 z-30 bg-slate-50 shadow-xs">
                                    Paciente ${iconoOrden('paciente')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('tienePagare')" class="p-2 text-center resizable w-16 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Pagaré ${iconoOrden('tienePagare')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('acuerdoEspecial')" class="p-2 resizable w-20 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Estado ${iconoOrden('acuerdoEspecial')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('obraSocial')" class="p-2 resizable w-24 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Obra Social ${iconoOrden('obraSocial')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('practica')" class="p-2 resizable w-20 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Práctica ${iconoOrden('practica')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('ultimoPago')" class="p-2 text-center resizable w-22 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Últ. Pago ${iconoOrden('ultimoPago')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('periodo')" class="p-2 text-center resizable w-18 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Período ${iconoOrden('periodo')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('comprobante')" class="p-2 text-center resizable w-32 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Comprobantes ${iconoOrden('comprobante')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('importeOrig')" class="p-2 text-right resizable w-24 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Imp. Orig. ${iconoOrden('importeOrig')}<div class="resizer"></div>
                                </th>
                                <th onclick="window.ordenarSaldos('saldo')" class="p-2 text-right resizable w-24 cursor-pointer hover:bg-slate-100 transition celda-recortable">
                                    Saldo Actual ${iconoOrden('saldo')}<div class="resizer"></div>
                                </th>
                                <th class="p-2 text-right resizable w-36 celda-recortable">Acciones<div class="resizer"></div></th>
                            </tr>
                        </thead>
                        <tbody>${filasFirebaseHTML}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
}