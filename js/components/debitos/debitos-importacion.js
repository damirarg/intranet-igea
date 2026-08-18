import { state } from '../../app-state.js';
import { cambiarVista } from '../../ui.js';
import { crearLoteDebitosFirestore } from './debitos-firestore.js';
import { escaparHTML, formatearMonedaAR, prepararFilasMarkey } from './debitos-utils.js';

function valorInput(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : '';
}

function guardarFormularioImportacionEnEstado() {
    state.debitosImportacionFinanciador = valorInput('input-debitos-financiador') || state.debitosImportacionFinanciador || '';
    state.debitosImportacionPeriodo = valorInput('input-debitos-periodo') || state.debitosImportacionPeriodo || '';
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
}

export function procesarArchivoDebitosCSV(event) {
    const archivo = event && event.target ? event.target.files[0] : null;
    if (!archivo) return;

    guardarFormularioImportacionEnEstado();
    state.debitosImportacionPreview = null;
    state.debitosImportacionArchivoNombre = archivo.name;

    window.Papa.parse(archivo, {
        header: true,
        skipEmptyLines: true,
        complete(resultados) {
            const filas = Array.isArray(resultados.data) ? resultados.data : [];
            const preview = prepararFilasMarkey(filas);

            preview.errores = [];
            if (preview.cantidadRegistros === 0) {
                preview.errores.push('El archivo no contiene registros importables.');
            }
            if (preview.importeTotalDebitado === 0) {
                preview.advertencias.push('El total debitado detectado es cero. Revisá si la columna de importe fue reconocida correctamente.');
            }

            state.debitosImportacionPreview = preview;
            cambiarVista('debitos');
        },
        error() {
            alert('No se pudo leer el archivo CSV de débitos.');
        }
    });
}

export function cancelarImportacionDebitos() {
    state.debitosImportacionPreview = null;
    state.debitosImportacionArchivoNombre = '';
    state.debitosImportacionFinanciador = '';
    state.debitosImportacionPeriodo = '';
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

    if (!financiador) return alert('Indicá la obra social, prepaga o convenio del lote.');
    if (!periodo) return alert('Indicá el período del lote.');

    const btn = document.getElementById('btn-crear-lote-debitos');
    const htmlOriginal = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current inline-block mr-1.5"></span> Importando...';
    }

    try {
        const loteId = await crearLoteDebitosFirestore({
            financiador,
            periodo,
            archivoNombre: state.debitosImportacionArchivoNombre,
            prestaciones: preview.prestaciones,
            importeTotalDebitado: preview.importeTotalDebitado
        });

        alert(`Lote importado correctamente.\n\nID: ${loteId}\nRegistros: ${preview.cantidadRegistros}`);
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

    const resumenPreview = preview ? `
        <div class="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h4 class="text-sm font-black text-slate-800">Previsualización del archivo</h4>
                    <p class="text-xs text-slate-500 mt-0.5">${escaparHTML(state.debitosImportacionArchivoNombre || 'Archivo CSV')}</p>
                </div>
                <button onclick="window.cancelarImportacionDebitos()" class="text-slate-400 hover:text-red-600 transition p-1" title="Cancelar importación">
                    <span class="material-symbols-rounded" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <span class="block text-[10px] font-black text-slate-400 uppercase">Prestaciones detectadas</span>
                    <strong class="text-lg text-slate-800">${preview.cantidadRegistros}</strong>
                </div>
                <div class="bg-orange-50 rounded-xl border border-orange-100 p-3">
                    <span class="block text-[10px] font-black text-orange-700 uppercase">Total debitado</span>
                    <strong class="text-lg text-orange-800">${formatearMonedaAR(preview.importeTotalDebitado)}</strong>
                </div>
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <span class="block text-[10px] font-black text-slate-400 uppercase">Columnas detectadas</span>
                    <strong class="text-lg text-slate-800">${preview.encabezados.length}</strong>
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
                            <th class="text-left p-2 font-black">Código</th>
                            <th class="text-left p-2 font-black">Concepto</th>
                            <th class="text-left p-2 font-black">Profesional</th>
                            <th class="text-right p-2 font-black">Imp. débito</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${preview.prestaciones.slice(0, 20).map(prestacion => {
                            const campos = prestacion.camposNormalizados;
                            return `
                                <tr class="border-t border-slate-100">
                                    <td class="p-2 font-semibold text-slate-700">${escaparHTML(campos.paciente || '-')}</td>
                                    <td class="p-2 text-slate-600">${escaparHTML(campos.codigo || '-')}</td>
                                    <td class="p-2 text-slate-600">${escaparHTML(campos.concepto || '-')}</td>
                                    <td class="p-2 text-slate-600">${escaparHTML(campos.profesional || '-')}</td>
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
                <p class="text-xs text-slate-500 mt-1 mb-4">Cada archivo genera un lote. Cada fila importable del archivo queda como prestación dentro de ese lote.</p>

                <div class="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-xs text-orange-900">
                    <p class="font-black mb-1">Flujo de importación</p>
                    <p class="font-semibold">1. Indicá financiador y período. 2. Seleccioná el CSV. 3. Revisá la previsualización. 4. Confirmá para guardar lote + prestaciones.</p>
                </div>

                <div class="space-y-3">
                    <label class="block">
                        <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">Financiador</span>
                        <input id="input-debitos-financiador" type="text" value="${financiador}" oninput="window.actualizarCampoImportacionDebitos('financiador', this.value)" placeholder="Obra social, prepaga o convenio" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                    </label>
                    <label class="block">
                        <span class="block text-[11px] font-black text-slate-500 uppercase mb-1">Período</span>
                        <input id="input-debitos-periodo" type="month" value="${periodo}" onchange="window.actualizarCampoImportacionDebitos('periodo', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none" ${puedeEditar ? '' : 'disabled'}>
                    </label>
                    <label for="input-debitos-csv" class="${puedeEditar ? 'cursor-pointer bg-orange-600 hover:bg-orange-700' : 'cursor-not-allowed bg-slate-300'} text-white font-black px-3.5 py-2.5 rounded-xl transition shadow-sm inline-flex items-center justify-center gap-1.5 text-xs w-full">
                        <span class="material-symbols-rounded" style="font-size:16px;">file_upload</span> Seleccionar CSV
                    </label>
                    <input type="file" id="input-debitos-csv" accept=".csv" class="hidden" onchange="window.procesarArchivoDebitosCSV(event)" ${puedeEditar ? '' : 'disabled'}>
                    <button id="btn-crear-lote-debitos" onclick="window.crearLoteDebitos()" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed" ${puedeEditar && preview && preview.errores.length === 0 ? '' : 'disabled'}>
                        Crear lote e importar prestaciones
                    </button>
                </div>
            </div>

            <div class="xl:col-span-2">
                ${preview ? resumenPreview : `
                    <div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
                        <span class="material-symbols-rounded text-slate-300" style="font-size:48px;">csv</span>
                        <p class="text-sm font-bold text-slate-600 mt-2">Todavía no hay archivo cargado</p>
                        <p class="text-xs text-slate-400 mt-1">Seleccioná un CSV de Markey para validar encabezados y previsualizar la importación.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}
