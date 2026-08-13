import { state } from '../app-state.js';

export function renderizarPermisos() {
    let filasPermisos = state.listaPermisosFirebase.map(p => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
            <td class="p-3.5 font-semibold text-slate-800 text-xs flex items-center gap-2">
                <span class="material-symbols-rounded text-purple-600" style="font-size:18px;">account_circle</span>
                ${p.email}
            </td>
            <td class="p-3.5 text-xs text-slate-600 font-medium">
                <span class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200 inline-flex items-center gap-1 font-semibold">
                    <span class="material-symbols-rounded" style="font-size: 14px;">request_quote</span> Gestión Saldos
                </span>
            </td>
            <td class="p-3.5 text-right">
                <button onclick="window.revocarPermisoFirebase('${p.id}')" class="text-slate-400 hover:text-red-600 transition p-1" title="Revocar Permiso">
                    <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                </button>
            </td>
        </tr>
    `).join('');

    if (state.listaPermisosFirebase.length === 0) {
        filasPermisos = `
            <tr>
                <td colspan="3" class="p-8 text-center text-slate-400 text-xs italic">
                    No hay usuarios adicionales autorizados. Asigná accesos usando el formulario superior.
                </td>
            </tr>
        `;
    }

    let docsOrdenadosAdmin = [...state.listaDocumentosFirebase].sort((a, b) => (parseInt(a.orden) || 99) - (parseInt(b.orden) || 99));

    let filasDocumentosAdmin = docsOrdenadosAdmin.map(d => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
            <td class="p-3 text-xs font-black text-blue-600 text-center">${d.orden || '-'}</td>
            <td class="p-3 text-xs font-bold ${d.tipo === 'dpp' ? 'text-blue-600' : 'text-emerald-600'}">
                ${d.tipo === 'dpp' ? 'DPP' : 'PROCEDIMIENTO'}
            </td>
            <td class="p-3 text-xs font-semibold text-slate-800">${d.nombre}</td>
            <td class="p-3 text-xs text-slate-500">${d.area || d.fecha || '-'}</td>
            <td class="p-3 text-xs text-slate-400 truncate max-w-[200px]" title="${d.url}">${d.url}</td>
            <td class="p-3 text-right flex items-center justify-end gap-1">
                <button onclick="window.abrirModalEditarDoc('${d.id}')" class="text-slate-400 hover:text-blue-600 p-1.5 transition rounded-lg hover:bg-blue-50" title="Editar este documento o sus anexos">
                    <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
                </button>
                <button onclick="window.eliminarDocumentoFirebase(event, '${d.id}')" class="text-slate-400 hover:text-red-600 p-1.5 transition rounded-lg hover:bg-red-50" title="Eliminar este documento">
                    <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                </button>
            </td>
        </tr>
    `).join('');

    return `
        <!-- Formulario para Publicar Nuevo Documento (DPP o Procedimiento) -->
        <div class="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 shrink-0">
            <h4 class="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <span class="material-symbols-rounded text-blue-600">cloud_upload</span> Publicar Nuevo Documento (DPP / Procedimientos)
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase">Tipo Documento</label>
                    <select id="select-tipo-doc" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="dpp">Directorio DPP</option>
                        <option value="procedimiento">Procedimiento Interno</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase">Posición / Orden</label>
                    <input type="number" id="input-orden-doc" min="1" placeholder="Ej: 1" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase">Nombre del Puesto / Norma</label>
                    <input type="text" id="input-nombre-doc" placeholder="Ej: Coordinadora de Asistentes" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase">Área / Fecha de Versión</label>
                    <input type="text" id="input-area-doc" placeholder="Ej: Asistencial / 12-08-2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase">Enlace Google Drive</label>
                    <input type="url" id="input-url-doc" placeholder="https://docs.google.com/..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>
            </div>
            <div class="mt-4 flex justify-end">
                <button id="btn-publicar-doc" onclick="window.guardarNuevoDocumentoFirebase()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-200 flex items-center gap-1.5">
                    <span class="material-symbols-rounded" style="font-size: 16px;">add_circle</span> Publicar Documento
                </button>
            </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 shrink-0">
            <div class="p-4 bg-slate-50 border-b border-slate-200">
                <h4 class="font-bold text-slate-700 text-sm">Documentos Publicados en el Portal (${state.listaDocumentosFirebase.length})</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr class="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50/50">
                            <th class="p-3 text-center">Posición</th>
                            <th class="p-3">Tipo</th>
                            <th class="p-3">Nombre / Título</th>
                            <th class="p-3">Área / Fecha</th>
                            <th class="p-3">Enlace Drive</th>
                            <th class="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${filasDocumentosAdmin}</tbody>
                </table>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 mb-8">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <h4 class="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <span class="material-symbols-rounded text-purple-600">person_add</span> Otorgar Nuevo Acceso
                </h4>
                
                <div class="space-y-4 flex-1">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Correo del Colaborador</label>
                        <input type="email" id="input-email-permiso" placeholder="ejemplo@hotmail.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Módulo Autorizado</label>
                        <select id="select-modulo-permiso" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none">
                            <option value="saldos" selected>Gestión de Saldos / Cobranzas</option>
                        </select>
                    </div>
                </div>

                <button id="btn-otorgar-permiso" onclick="window.otorgarPermisoFirebase()" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition shadow-md shadow-purple-200 text-xs mt-6 flex items-center justify-center gap-2">
                    <span class="material-symbols-rounded" style="font-size: 16px;">key</span> Guardar Permiso
                </button>
            </div>

            <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div class="p-4 bg-slate-50 border-b border-slate-200">
                    <h4 class="font-bold text-slate-700 text-sm">Usuarios con Accesos Especiales (${state.listaPermisosFirebase.length})</h4>
                </div>
                <div class="overflow-x-auto flex-1">
                    <table class="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr class="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50/50">
                                <th class="p-3.5">Usuario / Correo</th>
                                <th class="p-3.5">Módulo Habilitado</th>
                                <th class="p-3.5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>${filasPermisos}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}