import { state } from '../app-state.js';

export function renderizarDPP() {
    let dppFirebase = state.listaDocumentosFirebase.filter(d => d.tipo === 'dpp');
    dppFirebase.sort((a, b) => (parseInt(a.orden) || 99) - (parseInt(b.orden) || 99));

    if (dppFirebase.length === 0) {
        return `
            <div class="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200">
                <span class="material-symbols-rounded text-4xl mb-2 opacity-50">folder_open</span>
                <p class="text-sm font-medium">No hay documentos de DPP disponibles en la base de datos.</p>
            </div>
        `;
    }

    let filasHTML = dppFirebase.map(doc => {
        let btnBorrarHTML = state.esAdminMaster ? `
            <button onclick="window.eliminarDocumentoFirebase(event, '${doc.id}')" class="text-slate-400 hover:text-red-600 p-1 transition" title="Eliminar documento">
                <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
            </button>
        ` : '';

        let btnEditarHTML = state.esAdminMaster ? `
            <button onclick="event.stopPropagation(); abrirModalEditarDoc('${doc.id}')" class="text-slate-400 hover:text-blue-600 p-1 transition" title="Editar documento">
                <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
            </button>
        ` : '';

        return `
            <div class="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer group" onclick="abrirDocumento('${doc.nombre}', '${doc.url}')">
                <div class="flex items-center gap-3 md:gap-4">
                    <div class="bg-blue-50 text-blue-600 p-2.5 md:p-3 rounded-xl group-hover:bg-blue-100 transition">
                        <span class="material-symbols-rounded">person_pin</span>
                    </div>
                    <div>
                        <span class="font-bold text-slate-800 block text-sm md:text-lg">${doc.nombre}</span>
                        <span class="text-xs md:text-sm font-medium text-slate-500">${doc.area || 'General'}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${btnEditarHTML}
                    ${btnBorrarHTML}
                    <span class="material-symbols-rounded text-slate-400 group-hover:text-blue-600 transition">open_in_new</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden shrink-0">
            <div class="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <p class="text-xs md:text-sm text-slate-600 font-medium">Seleccioná un perfil de la lista para visualizar el documento oficial.</p>
            </div>
            <div>${filasHTML}</div>
        </div>
    `;
}