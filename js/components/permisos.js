import { state } from '../app-state.js';

const etiquetasModulos = {
    saldos: {
        icono: 'request_quote',
        texto: 'Gestión Saldos',
        clases: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    guardias: {
        icono: 'clinical_notes',
        texto: 'Guardias',
        clases: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    rrhh: {
        icono: 'groups',
        texto: 'RRHH',
        clases: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    },
    vacaciones: {
        icono: 'event_busy',
        texto: 'Ausencias',
        clases: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    debitos: {
        icono: 'price_check',
        texto: 'Débitos',
        clases: 'bg-orange-50 text-orange-700 border-orange-200'
    }
};

const modulosGestionables = ['saldos', 'guardias', 'rrhh', 'vacaciones', 'debitos'];

function renderizarBadgesModulos(modulos = []) {
    if (!Array.isArray(modulos) || modulos.length === 0) return '<span class="text-slate-400 italic">Sin módulos</span>';

    return modulos.map(modulo => {
        const meta = etiquetasModulos[modulo] || {
            icono: 'extension',
            texto: modulo,
            clases: 'bg-slate-50 text-slate-600 border-slate-200'
        };

        return `
            <span class="${meta.clases} px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 font-semibold mr-1.5 mb-1">
                <span class="material-symbols-rounded" style="font-size: 14px;">${meta.icono}</span> ${meta.texto}
            </span>
        `;
    }).join('');
}

function escaparHTML(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function obtenerNivelModulo(usuario, modulo) {
    const permisosPorModulo = usuario.permisosPorModulo || {};
    const nivel = permisosPorModulo[modulo];

    if (nivel === 'ver' || nivel === 'editar') return nivel;

    return Array.isArray(usuario.modulos) && usuario.modulos.includes(modulo) ? 'editar' : 'none';
}

function renderizarControlPermisos(email, usuario) {
    return modulosGestionables.map(modulo => {
        const meta = etiquetasModulos[modulo];
        const nivel = obtenerNivelModulo(usuario, modulo);

        return `
            <label class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
                <span class="inline-flex items-center gap-1.5 font-black text-slate-600">
                    <span class="material-symbols-rounded" style="font-size:15px;">${meta.icono}</span>
                    ${meta.texto}
                </span>
                <select onchange="window.guardarNivelPermisoModuloFirebase('${email}', '${modulo}', this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="none" ${nivel === 'none' ? 'selected' : ''}>Sin acceso</option>
                    <option value="ver" ${nivel === 'ver' ? 'selected' : ''}>Sólo ver</option>
                    <option value="editar" ${nivel === 'editar' ? 'selected' : ''}>Editar</option>
                </select>
            </label>
        `;
    }).join('');
}

export function renderizarPermisos() {
    const usuariosMap = new Map();

    state.listaUsuariosFirebase.forEach(u => {
        if (u.email) usuariosMap.set(u.email.toLowerCase().trim(), { ...u });
    });

    state.listaPermisosFirebase.forEach(p => {
        if (!p.email) return;

        const email = p.email.toLowerCase().trim();
        usuariosMap.set(email, {
            ...(usuariosMap.get(email) || {}),
            ...p,
            modulos: Array.isArray(p.modulos) ? p.modulos : [],
            activo: p.activo !== false
        });
    });

    const usuariosOrdenados = Array.from(usuariosMap.values()).sort((a, b) => {
        const nombreA = (a.nombre || a.displayName || a.email || '').toLowerCase();
        const nombreB = (b.nombre || b.displayName || b.email || '').toLowerCase();
        return nombreA.localeCompare(nombreB, 'es');
    });

    let filasPermisos = usuariosOrdenados.map(u => {
        const estaActivo = u.activo !== false;
        const modulos = Array.isArray(u.modulos) ? u.modulos : [];
        const email = (u.email || '').toLowerCase().trim();
        const empleadoRRHH = state.listaEmpleadosRRHHFirebase.find(e => (e.emailIntranet || '').toLowerCase().trim() === email);
        const nombre = (u.nombre || u.displayName || (empleadoRRHH && empleadoRRHH.nombreCompleto) || '').trim();
        const tieneNombreVisible = nombre && nombre.toLowerCase() !== email;
        const tituloUsuario = escaparHTML(tieneNombreVisible ? nombre : email);
        const emailUsuario = escaparHTML(email);
        const areaRRHH = empleadoRRHH && empleadoRRHH.area === 'administracion'
            ? 'Administración'
            : empleadoRRHH && empleadoRRHH.area === 'asistencial'
                ? 'Asistencial'
                : '';
        const botonEstadoHTML = estaActivo ? `
            <button onclick="window.cambiarEstadoUsuarioFirebase('${emailUsuario}', false)" class="text-slate-400 hover:text-red-600 transition p-1" title="Desactivar usuario">
                <span class="material-symbols-rounded" style="font-size: 18px;">person_off</span>
            </button>
        ` : `
            <button onclick="window.cambiarEstadoUsuarioFirebase('${emailUsuario}', true)" class="text-slate-400 hover:text-emerald-600 transition p-1" title="Reactivar usuario">
                <span class="material-symbols-rounded" style="font-size: 18px;">person_check</span>
            </button>
        `;

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition ${estaActivo ? '' : 'bg-slate-50 opacity-70'}">
            <td class="p-3.5 font-semibold text-slate-800 text-xs flex items-center gap-2">
                <span class="material-symbols-rounded ${estaActivo ? 'text-purple-600' : 'text-slate-400'}" style="font-size:18px;">account_circle</span>
                <span>
                    <span class="block font-black">${tituloUsuario}</span>
                    ${tieneNombreVisible ? `<span class="block text-[11px] text-slate-500 font-semibold">${emailUsuario}</span>` : ''}
                    ${empleadoRRHH ? `<span class="block text-[10px] text-cyan-700 font-black mt-1">Ficha RRHH${areaRRHH ? ` · ${areaRRHH}` : ''}</span>` : ''}
                    <span class="${estaActivo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'} ml-2 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase">${estaActivo ? 'Activo' : 'Desactivado'}</span>
                </span>
            </td>
            <td class="p-3.5 text-xs text-slate-600 font-medium">
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-2 min-w-[420px]">
                    ${renderizarControlPermisos(emailUsuario, u)}
                </div>
            </td>
            <td class="p-3.5 text-right">
                <button onclick="window.generarResetClaveUsuarioFirebase('${emailUsuario}')" class="text-slate-400 hover:text-blue-600 transition p-1" title="Generar link de recuperación">
                    <span class="material-symbols-rounded" style="font-size: 18px;">lock_reset</span>
                </button>
                <button onclick="window.actualizarNombreUsuarioFirebase('${emailUsuario}')" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Editar nombre">
                    <span class="material-symbols-rounded" style="font-size: 18px;">badge</span>
                </button>
                <button onclick="document.getElementById('input-email-actual-admin').value='${emailUsuario}'; document.getElementById('input-email-nuevo-admin').focus();" class="text-slate-400 hover:text-amber-600 transition p-1" title="Preparar cambio de correo">
                    <span class="material-symbols-rounded" style="font-size: 18px;">alternate_email</span>
                </button>
                ${botonEstadoHTML}
                <button onclick="window.revocarPermisoFirebase('${escaparHTML(u.id || email)}')" class="text-slate-400 hover:text-red-600 transition p-1" title="Revocar Permiso">
                    <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                </button>
            </td>
        </tr>
    `;
    }).join('');

    if (usuariosOrdenados.length === 0) {
        filasPermisos = `
            <tr>
                <td colspan="3" class="p-8 text-center text-slate-400 text-xs italic">
                    No hay usuarios cargados todavía. Creá usuarios usando el formulario superior.
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
        <div class="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 shrink-0">
            <div class="flex items-center justify-between gap-3 mb-5">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span class="material-symbols-rounded text-indigo-600">manage_accounts</span> Usuarios de la Intranet
                    </h4>
                    <p class="text-xs text-slate-500 mt-1">Alta de usuarios, recuperación de acceso y cambio de correo de login.</p>
                </div>
                <button id="btn-sincronizar-usuarios-admin" onclick="window.sincronizarUsuariosDesdePermisosFirebase()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5">
                    <span class="material-symbols-rounded" style="font-size: 16px;">sync</span> Sincronizar padrón
                </button>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h5 class="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">Crear usuario</h5>
                    <div class="space-y-3">
                        <input type="text" id="input-nombre-usuario-admin" placeholder="Nombre completo" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <input type="email" id="input-email-usuario-admin" placeholder="correo@ejemplo.com" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <input type="text" id="input-clave-usuario-admin" placeholder="Clave temporal opcional" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                            <label class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
                                <input type="checkbox" value="saldos" class="check-modulo-usuario w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500"> Saldos
                            </label>
                            <label class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
                                <input type="checkbox" value="guardias" class="check-modulo-usuario w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"> Guardias
                            </label>
                            <label class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
                                <input type="checkbox" value="debitos" class="check-modulo-usuario w-3.5 h-3.5 text-orange-600 rounded focus:ring-orange-500"> Débitos
                            </label>
                        </div>
                        <button id="btn-crear-usuario-admin" onclick="window.crearUsuarioIntranetFirebase()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5">
                            <span class="material-symbols-rounded" style="font-size: 16px;">person_add</span> Crear Usuario
                        </button>
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <h5 class="text-xs font-black text-blue-800 uppercase tracking-wide mb-3">Resetear contraseña</h5>
                    <div class="space-y-3">
                        <input type="email" id="input-email-reset-admin" placeholder="correo del usuario" class="w-full bg-white border border-blue-100 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <p class="text-[11px] text-blue-700 leading-relaxed">Genera un link de recuperación y lo copia al portapapeles para enviarlo al usuario.</p>
                        <button id="btn-reset-usuario-admin" onclick="window.generarResetClaveUsuarioFirebase()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-blue-200 flex items-center justify-center gap-1.5">
                            <span class="material-symbols-rounded" style="font-size: 16px;">lock_reset</span> Generar Link
                        </button>
                    </div>
                </div>

                <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <h5 class="text-xs font-black text-amber-800 uppercase tracking-wide mb-3">Cambiar correo de login</h5>
                    <div class="space-y-3">
                        <input type="email" id="input-email-actual-admin" placeholder="correo actual" class="w-full bg-white border border-amber-100 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none">
                        <input type="email" id="input-email-nuevo-admin" placeholder="correo nuevo" class="w-full bg-white border border-amber-100 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none">
                        <button id="btn-cambiar-email-admin" onclick="window.cambiarEmailUsuarioFirebase()" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-amber-200 flex items-center justify-center gap-1.5">
                            <span class="material-symbols-rounded" style="font-size: 16px;">alternate_email</span> Cambiar Correo
                        </button>
                    </div>
                </div>
            </div>
        </div>

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

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col shrink-0 mb-8">
                <div class="p-4 bg-slate-50 border-b border-slate-200">
                    <h4 class="font-bold text-slate-700 text-sm">Usuarios de la Intranet (${usuariosOrdenados.length})</h4>
                </div>
                <div class="overflow-x-auto flex-1">
                    <table class="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr class="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50/50">
                                <th class="p-3.5">Usuario / Correo</th>
                                <th class="p-3.5">Permisos por módulo</th>
                                <th class="p-3.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${filasPermisos}</tbody>
                    </table>
                </div>
        </div>
    `;
}
