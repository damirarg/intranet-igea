import { state } from '../app-state.js';
import { abrirDocumento } from '../ui.js';

export function seleccionarMaterialDidactico(selectElement) {
    let selectedOption = selectElement.options[selectElement.selectedIndex];
    let url = selectedOption.value;
    let titulo = selectedOption.text;
    let esImagen = selectedOption.getAttribute('data-imagen') === 'true';

    if (url) {
        abrirDocumento(titulo, url, esImagen);
        selectElement.selectedIndex = 0;
    }
}

export function renderizarProcedimientos() {
    let procFirebase = state.listaDocumentosFirebase.filter(d => d.tipo === 'procedimiento');
    procFirebase.sort((a, b) => (parseInt(a.orden) || 99) - (parseInt(b.orden) || 99));

    if (procFirebase.length === 0) {
        return `
            <div class="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200">
                <span class="material-symbols-rounded text-4xl mb-2 opacity-50">folder_open</span>
                <p class="text-sm font-medium">No hay procedimientos guardados en la base de datos.</p>
            </div>
        `;
    }

    let itemsHTML = procFirebase.map((doc) => {
        let desplegableHTML = "";
        if (doc.materialesDidacticos && doc.materialesDidacticos.length > 0) {
            let opcionesHTML = doc.materialesDidacticos.map(mat => `
                <option value="${mat.url}" data-imagen="${mat.esImagen}">${mat.nombre}</option>
            `).join('');

            desplegableHTML = `
                <div class="relative shrink-0">
                    <select onchange="window.seleccionarMaterialDidactico(this)" 
                        class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition shadow-sm cursor-pointer outline-none appearance-none pr-8">
                        <option value="" selected disabled>Material Didáctico ▾</option>
                        ${opcionesHTML}
                    </select>
                    <span class="material-symbols-rounded absolute right-2 top-2.5 pointer-events-none text-white" style="font-size: 16px;">school</span>
                </div>
            `;
        }

        let btnBorrarHTML = state.esAdminMaster ? `
            <button onclick="window.eliminarDocumentoFirebase(event, '${doc.id}')" class="text-slate-400 hover:text-red-600 p-2 transition" title="Eliminar procedimiento">
                <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
            </button>
        ` : '';

        let btnEditarHTML = state.esAdminMaster ? `
            <button onclick="event.stopPropagation(); abrirModalEditarDoc('${doc.id}')" class="text-slate-400 hover:text-blue-600 p-2 transition" title="Editar procedimiento">
                <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
            </button>
        ` : '';

        return `
            <div class="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 group">
                <div class="flex items-center gap-4 cursor-pointer flex-1" onclick="abrirDocumento('${doc.nombre}', '${doc.url}')">
                    <div class="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-100 transition shrink-0">
                        <span class="material-symbols-rounded">description</span>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 text-base md:text-lg">${doc.nombre}</h4>
                        <p class="text-xs md:text-sm text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <span class="material-symbols-rounded" style="font-size: 14px;">update</span> Actualizado: ${doc.fecha || 'Reciente'}
                        </p>
                    </div>
                </div>
                
                <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
                    <button onclick="abrirDocumento('${doc.nombre}', '${doc.url}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0">
                        <span class="material-symbols-rounded" style="font-size: 16px;">visibility</span> Ver Procedimiento
                    </button>
                    ${desplegableHTML}
                    ${btnEditarHTML}
                    ${btnBorrarHTML}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="space-y-4 shrink-0">${itemsHTML}</div>`;
}