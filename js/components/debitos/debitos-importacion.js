import { state } from '../../app-state.js';
import { cambiarVista } from '../../ui.js';
import { crearLoteDebitosFirestore } from './debitos-firestore.js';
import { esNumeroNCValido, escaparHTML, formatearMonedaAR, normalizarNumeroNC, prepararFilasMarkey } from './debitos-utils.js';

function valorInput(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : '';
}

function soloDigitos(valor = '', max = 8) {
    return String(valor || '').replace(/\D/g, '').slice(0, max);
}

function leerPartesNCDesdeFormulario({ completar = false } = {}) {
    const tipo = (valorInput('select-debitos-nc-tipo') || state.debitosImportacionNCTipo || 'B').toUpperCase() === 'A' ? 'A' : 'B';
    const punto = soloDigitos(valorInput('input-debitos-nc-punto') || state.debitosImportacionNCPunto || '', 4);
    const numero = soloDigitos(valorInput('input-debitos-nc-numero') || state.debitosImportacionNCNumero || '', 8);

    state.debitosImportacionNCTipo = tipo;
    state.debitosImportacionNCPunto = completar && punto ? punto.padStart(4, '0') : punto;
    state.debitosImportacionNCNumero = completar && numero ? numero.padStart(8, '0') : numero;
    state.debitosImportacionNC = punto && numero
        ? `N/C ${tipo}${(completar ? punto.padStart(4, '0') : punto)}-${(completar ? numero.padStart(8, '0') : numero)}`
        : '';

    return state.debitosImportacionNC;
}

function partesNCDesdeValor(valor = '') {
    const normalizada = normalizarNumeroNC(valor);
    const match = normalizada.match(/^N\/C ([AB])([0-9]{4})-([0-9]{8})$/);
    return match
        ? { tipo: match[1], punto: match[2], numero: match[3], normalizada }
        : { tipo: state.debitosImportacionNCTipo || 'B', punto: state.debitosImportacionNCPunto || '', numero: state.debitosImportacionNCNumero || '', normalizada: state.debitosImportacionNC || '' };
}

function guardarFormularioImportacionEnEstado() {
    state.debitosImportacionFinanciador = valorInput('input-debitos-financiador') || state.debitosImportacionFinanciador || '';
    state.debitosImportacionPeriodo = valorInput('input-debitos-periodo') || state.debitosImportacionPeriodo || '';
    leerPartesNCDesdeFormulario({ completar: true });
    aplicarNCManualAPreview();
}

function mensajeErrorImportacion(error) {
    const mensaje = error && error.message ? error.message : '';

    if (mensaje.toLowerCase().includes('permission') || error?.code === 'permission-denied') {
        return 'Firebase rechazó el guardado por permisos. Si estás probando localmente, probablemente todavía falten desplegar las reglas Firestore nuevas para debitos_lotes y debitos_prestaciones.';
    }

    return mensaje || 'No se pudo completar la operación.';
}

export function actualizarCampoImportacionDebitos(campo, valor) {
    if (campo === 'financiador') state.debitosImportacionFinanciador = valor || '';
    if (campo === 'periodo') state.debitosImportacionPeriodo = valor || '';
    if (campo === 'ncTipo') state.debitosImportacionNCTipo = String(valor || 'B').toUpperCase() === 'A' ? 'A' : 'B';
    if (campo === 'ncPunto') state.debitosImportacionNCPunto = soloDigitos(valor, 4);
    if (campo === 'ncNumero') state.debitosImportacionNCNumero = soloDigitos(valor, 8);
    if (['ncTipo', 'ncPunto', 'ncNumero'].includes(campo)) {
        const punto = state.debitosImportacionNCPunto || '';
        const numero = state.debitosImportacionNCNumero || '';
        state.debitosImportacionNC = punto && numero ? `N/C ${state.debitosImportacionNCTipo || 'B'}${punto}-${numero}` : '';
        aplicarNCManualAPreview();
    }
}

export function cambiarModoSimulacionDebitos(activado) {
    state.debitosModoSimulacion = activado === true;
    cambiarVista('debitos');
}

function crearLoteDebitosSimulado({ financiador, periodo, numeroNC, archivoNombre, prestaciones, importeTotalDebitado }) {
    const loteId = `sim-${Date.now()}`;
    const fechaImportacion = new Date();

    state.listaDebitosLotesFirebase.unshift({
        id: loteId,
        financiador,
        periodo,
        numeroNC,
        archivoNombre,
        cantidadRegistros: prestaciones.length,
        importeTotalDebitado,
        usuarioImportador: state.usuarioActualEmail || 'simulacion-local',
        fechaImportacion,
        estadoImportacion: 'simulado',
        origen: 'simulacion'
    });

    const prestacionesSimuladas = prestaciones.map((prestacion, index) => ({
        ...prestacion,
        id: `${loteId}-${index + 1}`,
        loteId,
        numeroNC,
        financiador: prestacion.camposNormalizados?.convenio || financiador,
        periodo,
        usuarioImportador: state.usuarioActualEmail || 'simulacion-local',
        fechaImportacion,
        origen: 'simulacion'
    }));

    state.listaDebitosPrestacionesFirebase = [
        ...prestacionesSimuladas,
        ...state.listaDebitosPrestacionesFirebase
    ];

    return loteId;
}

function aplicarNCManualAPreview() {
    const numeroNC = normalizarNumeroNC(state.debitosImportacionNC || '');
    if (!numeroNC || !state.debitosImportacionPreview) return;

    state.debitosImportacionPreview.prestaciones.forEach(prestacion => {
        prestacion.camposNormalizados = {
            ...(prestacion.camposNormalizados || {}),
            nc: numeroNC
        };
    });
}

export function procesarArchivoDebitosCSV(event) {
    const archivo = event && event.target ? event.target.files[0] : null;
    if (!archivo) return;

    guardarFormularioImportacionEnEstado();
    state.debitosImportacionPreview = null;
    state.debitosImportacionArchivoNombre = archivo.name;

    const extension = archivo.name.split('.').pop().toLowerCase();

    if (['xlsx', 'xls'].includes(extension)) {
        const lector = new FileReader();
        lector.onload = eventReader => {
            try {
                if (!window.XLSX) {
                    alert('No se cargó la librería para leer Excel. Probá de nuevo o exportá el archivo como CSV.');
                    return;
                }

                const workbook = window.XLSX.read(eventReader.target.result, { type: 'array', cellDates: true });
                const nombreHoja = workbook.SheetNames.includes('BaseDebitos') ? 'BaseDebitos' : workbook.SheetNames[0];
                const hoja = workbook.Sheets[nombreHoja];
                const filas = window.XLSX.utils.sheet_to_json(hoja, { defval: '' });
                prepararPreviewDebitos(filas);
            } catch (error) {
                alert('No se pudo leer el archivo Excel de débitos.');
            }
        };
        lector.onerror = () => alert('No se pudo leer el archivo Excel de débitos.');
        lector.readAsArrayBuffer(archivo);
        return;
    }

    window.Papa.parse(archivo, {
        header: true,
        skipEmptyLines: true,
        complete(resultados) {
            const filas = Array.isArray(resultados.data) ? resultados.data : [];
            prepararPreviewDebitos(filas);
        },
        error() {
            alert('No se pudo leer el archivo CSV de débitos.');
        }
    });
}

function prepararPreviewDebitos(filas) {
    const preview = prepararFilasMarkey(filas);
    const numeroNC = normalizarNumeroNC(state.debitosImportacionNC || '');

    if (numeroNC) {
        preview.prestaciones.forEach(prestacion => {
            prestacion.camposNormalizados.nc = numeroNC;
        });
    }

    preview.errores = [];
    if (preview.cantidadRegistros === 0) {
        preview.errores.push('El archivo no contiene registros importables.');
    }
    if (preview.importeTotalDebitado === 0) {
        preview.advertencias.push('El total debitado detectado es cero. Revisá si la columna de importe fue reconocida correctamente.');
    }

    state.debitosImportacionPreview = preview;
    cambiarVista('debitos');
}

export function cancelarImportacionDebitos() {
    state.debitosImportacionPreview = null;
    state.debitosImportacionArchivoNombre = '';
    state.debitosImportacionFinanciador = '';
    state.debitosImportacionPeriodo = '';
    state.debitosImportacionNC = '';
    state.debitosImportacionNCTipo = 'B';
    state.debitosImportacionNCPunto = '';
    state.debitosImportacionNCNumero = '';
    const input = document.getElementById('input-debitos-csv');
    if (input) input.value = '';
    cambiarVista('debitos');
}

export async function crearLoteDebitos() {
    const preview = state.debitosImportacionPreview;
    if (!preview || preview.cantidadRegistros === 0) return alert('Primero cargá y validá un archivo.');

    guardarFormularioImportacionEnEstado();

    const financiador = state.debitosImportacionFinanciador;
    const periodo = state.debitosImportacionPeriodo;
    const numeroNC = leerPartesNCDesdeFormulario({ completar: true });

    if (!financiador) return alert('Indicá la obra social, prepaga o convenio del lote.');
    if (!periodo) return alert('Indicá el período del lote.');
    if (!numeroNC) return alert('Indicá la NC emitida para este reporte.');
    if (!esNumeroNCValido(numeroNC)) return alert('La NC debe tener formato N/C B0004-00000086 o N/C A0004-00000086.');

    preview.prestaciones.forEach(prestacion => {
        prestacion.camposNormalizados.nc = numeroNC;
    });

    const btn = document.getElementById('btn-crear-lote-debitos');
    const htmlOriginal = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current inline-block mr-1.5"></span> Importando...';
    }

    try {
        const lotePayload = {
            financiador,
            periodo,
            numeroNC,
            archivoNombre: state.debitosImportacionArchivoNombre,
            prestaciones: preview.prestaciones,
            importeTotalDebitado: preview.importeTotalDebitado
        };

        const loteId = state.debitosModoSimulacion
            ? crearLoteDebitosSimulado(lotePayload)
            : await crearLoteDebitosFirestore(lotePayload);

        alert(`${state.debitosModoSimulacion ? 'Simulación creada correctamente' : 'Lote importado correctamente'}.\n\nID: ${loteId}\nRegistros: ${preview.cantidadRegistros}`);
        cancelarImportacionDebitos();
        state.debitosVistaActual = 'lotes';
        cambiarVista('debitos');
    } catch (error) {
        alert('Error al importar lote: ' + mensajeErrorImportacion(error));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = htmlOriginal;
        }
    }
}

export function renderizarImportacionDebitos() {
    const puedeEditar = state.esAdminMaster || state.puedeEditarDebitos;
    const preview = state.debitosImportacionPreview;
    const financiador = escaparHTML(state.debitosImportacionFinanciador || '');
    const periodo = escaparHTML(state.debitosImportacionPeriodo || '');
    const partesNC = partesNCDesdeValor(state.debitosImportacionNC || '');
    const numeroNCNormalizado = normalizarNumeroNC(state.debitosImportacionNC || '');
    const numeroNC = escaparHTML(esNumeroNCValido(numeroNCNormalizado) ? numeroNCNormalizado : state.debitosImportacionNC || '');
    const ncValida = esNumeroNCValido(numeroNCNormalizado);
    const ncTipo = partesNC.tipo || 'B';
    const ncPunto = escaparHTML(partesNC.punto || state.debitosImportacionNCPunto || '');
    const ncNumero = escaparHTML(partesNC.numero || state.debitosImportacionNCNumero || '');
    const modoSimulacion = state.debitosModoSimulacion !== false;
    const prestacionesPreview = preview?.prestaciones || [];
    const resumenGestionPreview = preview ? {
        pendientes: prestacionesPreview.filter(prestacion => (prestacion.gestion?.estado || 'debito_recibido') === 'debito_recibido').length,
        aReclamar: prestacionesPreview.filter(prestacion => prestacion.gestion?.estado === 'refacturable').length,
        refacturadas: prestacionesPreview.filter(prestacion => prestacion.gestion?.estado === 'refacturado').length,
        cerradas: prestacionesPreview.filter(prestacion => prestacion.gestion?.estado === 'no_refacturable').length,
        importeRefacturado: prestacionesPreview.reduce((total, prestacion) => total + (Number(prestacion.gestion?.importeRefacturado) || 0), 0)
    } : null;

    const resumenPreview = preview ? `
        <div class="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h4 class="text-sm font-black text-slate-800">Previsualización del archivo</h4>
                    <p class="text-xs text-slate-500 mt-0.5">${escaparHTML(state.debitosImportacionArchivoNombre || 'Archivo CSV')}</p>
                    <p class="text-xs text-slate-500 mt-0.5">NC aplicada: <strong class="text-slate-800">${numeroNC || 'Sin NC cargada'}</strong></p>
                </div>
                <button onclick="window.cancelarImportacionDebitos()" class="text-slate-400 hover:text-red-600 transition p-1" title="Cancelar importación">
                    <span class="material-symbols-rounded" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <span class="block text-[10px] font-black text-slate-400 uppercase">NC emitida</span>
                    <strong class="text-sm text-slate-800">${numeroNC || '-'}</strong>
                </div>
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <span class="block text-[10px] font-black text-slate-400 uppercase">Prestaciones detectadas</span>
                    <strong class="text-lg text-slate-800">${preview.cantidadRegistros}</strong>
                </div>
                <div class="bg-orange-50 rounded-xl border border-orange-100 p-3">
                    <span class="block text-[10px] font-black text-orange-700 uppercase">Total debitado</span>
                    <strong class="text-lg text-orange-800">${formatearMonedaAR(preview.importeTotalDebitado)}</strong>
                </div>
                <div class="bg-emerald-50 rounded-xl border border-emerald-100 p-3">
                    <span class="block text-[10px] font-black text-emerald-700 uppercase">Total refacturado detectado</span>
                    <strong class="text-lg text-emerald-900">${formatearMonedaAR(resumenGestionPreview.importeRefacturado)}</strong>
                </div>
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <span class="block text-[10px] font-black text-slate-400 uppercase">Columnas detectadas</span>
                    <strong class="text-lg text-slate-800">${preview.encabezados.length}</strong>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <span class="block text-[10px] font-black text-blue-700 uppercase">Pendientes</span>
                    <strong class="text-lg text-blue-900">${resumenGestionPreview.pendientes}</strong>
                </div>
                <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <span class="block text-[10px] font-black text-emerald-700 uppercase">A reclamar</span>
                    <strong class="text-lg text-emerald-900">${resumenGestionPreview.aReclamar}</strong>
                </div>
                <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <span class="block text-[10px] font-black text-emerald-700 uppercase">Refacturadas</span>
                    <strong class="text-lg text-emerald-900">${resumenGestionPreview.refacturadas}</strong>
                </div>
                <div class="bg-red-50 border border-red-100 rounded-xl p-3">
                    <span class="block text-[10px] font-black text-red-700 uppercase">Sin reclamo</span>
                    <strong class="text-lg text-red-900">${resumenGestionPreview.cerradas}</strong>
                </div>
            </div>

            ${preview.advertencias.length ? `
                <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-800 font-semibold">
                    ${preview.advertencias.map(a => `<p>${escaparHTML(a)}</p>`).join('')}
                </div>
            ` : ''}

            ${preview.errores.length ? `
                <div class="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-xs text-red-700 font-semibold">
                    ${preview.errores.map(e => `<p>${escaparHTML(e)}</p>`).join('')}
                </div>
            ` : ''}

            <div class="overflow-auto border border-slate-100 rounded-xl max-h-[280px]">
                <table class="w-full text-xs">
                    <thead class="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                            <th class="text-left p-2 font-black">Paciente</th>
                            <th class="text-left p-2 font-black">Convenio</th>
                            <th class="text-left p-2 font-black">NC</th>
                            <th class="text-left p-2 font-black">FC</th>
                            <th class="text-left p-2 font-black">Código</th>
                            <th class="text-left p-2 font-black">Concepto</th>
                            <th class="text-left p-2 font-black">Etapa</th>
                            <th class="text-right p-2 font-black">Imp. débito</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${preview.prestaciones.slice(0, 20).map(prestacion => {
                            const campos = prestacion.camposNormalizados;
                            return `
                                <tr class="border-t border-slate-100">
                                    <td class="p-2 font-semibold text-slate-700">${escaparHTML(campos.paciente || '-')}</td>
                                    <td class="p-2 text-slate-500">${escaparHTML(campos.convenio || '-')}</td>
                                    <td class="p-2 text-slate-500">${escaparHTML(campos.nc || '-')}</td>
                                    <td class="p-2 text-slate-500">${escaparHTML(campos.factura || '-')}</td>
                                    <td class="p-2 text-slate-600">${escaparHTML(campos.codigo || '-')}</td>
                                    <td class="p-2 text-slate-600">${escaparHTML(campos.concepto || '-')}</td>
                                    <td class="p-2 text-slate-600">${escaparHTML(campos.estadoHistorico || prestacion.gestion?.estado || '-')}</td>
                                    <td class="p-2 text-right font-black text-orange-700">${formatearMonedaAR(campos.importeDebitado)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <span class="block text-[10px] font-black text-blue-700 uppercase">Qué se crea al confirmar</span>
                    <p class="text-xs text-blue-800 font-semibold mt-1">1 lote con los datos generales de esta importación y ${preview.cantidadRegistros} prestaciones vinculadas a ese lote.</p>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span class="block text-[10px] font-black text-slate-500 uppercase">Dato original protegido</span>
                    <p class="text-xs text-slate-600 font-semibold mt-1">Cada fila conserva los campos originales de Markey y agrega datos de gestión separados.</p>
                </div>
            </div>
        </div>
    ` : '';

    return `
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div class="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h4 class="font-black text-slate-800 text-sm flex items-center gap-2">
                    <span class="material-symbols-rounded text-orange-600">upload_file</span> Importar reporte Markey
                </h4>
                <p class="text-xs text-slate-500 mt-1 mb-4">Acepta CSV o Excel. Cada fila importable queda como prestación debitada y conserva los datos originales para auditoría.</p>

                <div class="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-xs text-orange-900">
                    <p class="font-black mb-1">Flujo de importación</p>
                    <p class="font-semibold">1. Indicá financiador, período y NC. 2. Seleccioná Excel o CSV. 3. Revisá clasificación y advertencias. 4. Confirmá para guardar lote + prestaciones.</p>
                </div>

                <div class="space-y-3">
                    <label class="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3 cursor-pointer">
                        <input type="checkbox" class="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" onchange="window.cambiarModoSimulacionDebitos(this.checked)" ${modoSimulacion ? 'checked' : ''}>
                        <span>
                            <span class="block text-xs font-black text-blue-900">Simular sin guardar en Firebase</span>
                            <span class="block text-[11px] text-blue-700 font-semibold mt-0.5">Crea el lote solo en esta sesión local para revisar el circuito completo sin tocar la base.</span>
                        </span>
                    </label>
                    <label class="block">
                        <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">Financiador</span>
                        <input id="input-debitos-financiador" type="text" value="${financiador}" oninput="window.actualizarCampoImportacionDebitos('financiador', this.value)" placeholder="Obra social, prepaga o convenio" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                    </label>
                    <label class="block">
                        <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">Período</span>
                        <input id="input-debitos-periodo" type="month" value="${periodo}" onchange="window.actualizarCampoImportacionDebitos('periodo', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                    </label>
                    <label class="block">
                        <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">NC emitida</span>
                        <div class="grid grid-cols-[auto_76px_minmax(0,1fr)_auto_minmax(0,1.4fr)] gap-2 items-center">
                            <span class="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black text-slate-700">N/C</span>
                            <select id="select-debitos-nc-tipo" onchange="window.actualizarCampoImportacionDebitos('ncTipo', this.value); window.cambiarVista('debitos')" class="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                                <option value="A" ${ncTipo === 'A' ? 'selected' : ''}>A</option>
                                <option value="B" ${ncTipo === 'B' ? 'selected' : ''}>B</option>
                            </select>
                            <input id="input-debitos-nc-punto" type="text" inputmode="numeric" maxlength="4" value="${ncPunto}" oninput="window.actualizarCampoImportacionDebitos('ncPunto', this.value); this.value = this.value.replace(/\\D/g, '').slice(0, 4)" onchange="window.actualizarCampoImportacionDebitos('ncPunto', this.value); window.cambiarVista('debitos')" placeholder="0004" class="w-full bg-slate-50 border ${(ncPunto || ncNumero) && !ncValida ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-orange-500'} rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                            <span class="text-slate-400 font-black">-</span>
                            <input id="input-debitos-nc-numero" type="text" inputmode="numeric" maxlength="8" value="${ncNumero}" oninput="window.actualizarCampoImportacionDebitos('ncNumero', this.value); this.value = this.value.replace(/\\D/g, '').slice(0, 8)" onchange="window.actualizarCampoImportacionDebitos('ncNumero', this.value); window.cambiarVista('debitos')" placeholder="00000086" class="w-full bg-slate-50 border ${(ncPunto || ncNumero) && !ncValida ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-orange-500'} rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                        </div>
                        <span class="block text-[10px] ${state.debitosImportacionNC && !ncValida ? 'text-red-600' : 'text-slate-400'} font-semibold mt-1">Podés escribir 2 y 343; se completa como N/C ${ncTipo}0002-00000343.</span>
                    </label>
                    <label for="input-debitos-csv" class="${puedeEditar ? 'cursor-pointer bg-orange-600 hover:bg-orange-700' : 'cursor-not-allowed bg-slate-300'} text-white font-black px-3.5 py-2.5 rounded-xl transition shadow-sm inline-flex items-center justify-center gap-1.5 text-xs w-full">
                    <span class="material-symbols-rounded" style="font-size:16px;">file_upload</span> Seleccionar Excel o CSV
                </label>
                    <input type="file" id="input-debitos-csv" accept=".csv,.xlsx,.xls" class="hidden" onchange="window.procesarArchivoDebitosCSV(event)" ${puedeEditar ? '' : 'disabled'}>
                    <button id="btn-crear-lote-debitos" onclick="window.crearLoteDebitos()" class="w-full ${modoSimulacion ? 'bg-blue-700 hover:bg-blue-800' : 'bg-slate-900 hover:bg-slate-800'} text-white font-black text-xs py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed" ${puedeEditar && preview && preview.errores.length === 0 && ncValida ? '' : 'disabled'}>
                        ${modoSimulacion ? 'Crear simulación local' : 'Crear lote e importar prestaciones'}
                    </button>
                </div>
            </div>

            <div class="xl:col-span-2">
                ${preview ? resumenPreview : `
                    <div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
                        <span class="material-symbols-rounded text-slate-300" style="font-size:48px;">csv</span>
                        <p class="text-sm font-bold text-slate-600 mt-2">Todavía no hay archivo cargado</p>
                        <p class="text-xs text-slate-400 mt-1">Completá la NC y seleccioná un Excel o CSV de Markey para validar encabezados y previsualizar la importación.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}
