import { state } from '../app-state.js';

function escaparHTML(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function valorEmpleado(empleado, campo) {
    return escaparHTML(empleado && empleado[campo] ? empleado[campo] : '');
}

function etiquetaArea(area = '') {
    const areas = {
        administracion: 'Administración',
        asistencial: 'Asistencial'
    };

    return areas[area] || '-';
}

function formatearFecha(fechaISO = '') {
    if (!fechaISO) return '-';
    const [anio, mes, dia] = String(fechaISO).split('-');
    if (!anio || !mes || !dia) return fechaISO;
    return `${dia}/${mes}/${anio}`;
}

function normalizarBusqueda(valor = '') {
    return String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function filtrarEmpleadosRRHH() {
    const input = document.getElementById('input-buscar-empleado-rrhh');
    const filtro = normalizarBusqueda(input ? input.value : '');

    document.querySelectorAll('[data-empleado-rrhh]').forEach(card => {
        const texto = normalizarBusqueda(card.dataset.busqueda || '');
        card.classList.toggle('hidden', filtro && !texto.includes(filtro));
    });
}

export function renderizarRRHH() {
    const empleadoEditando = state.empleadoRRHHEditandoId
        ? state.listaEmpleadosRRHHFirebase.find(e => e.id === state.empleadoRRHHEditandoId)
        : null;

    const empleadosOrdenados = [...state.listaEmpleadosRRHHFirebase].sort((a, b) => {
        const nombreA = (a.nombreCompleto || '').toLowerCase();
        const nombreB = (b.nombreCompleto || '').toLowerCase();
        return nombreA.localeCompare(nombreB, 'es');
    });

    const filas = empleadosOrdenados.length ? empleadosOrdenados.map(e => {
        const busqueda = [
            e.nombreCompleto,
            e.dni,
            e.cuil,
            e.area,
            e.fechaIngreso,
            e.emailIntranet,
            e.obraSocial,
            e.telefono,
            e.contactoEmergenciaNombre
        ].filter(Boolean).join(' ');

        return `
            <article data-empleado-rrhh data-busqueda="${escaparHTML(busqueda)}" class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-cyan-200 transition">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h4 class="text-sm font-black text-slate-800">${escaparHTML(e.nombreCompleto || 'Sin nombre')}</h4>
                        <p class="text-[11px] text-slate-500 font-semibold mt-0.5">DNI ${escaparHTML(e.dni || '-')} · CUIL ${escaparHTML(e.cuil || '-')}</p>
                        <div class="flex flex-wrap gap-1.5 mt-2">
                            <span class="bg-cyan-50 text-cyan-700 border border-cyan-100 px-2 py-0.5 rounded-lg text-[10px] font-black">${escaparHTML(etiquetaArea(e.area))}</span>
                            <span class="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black">Ingreso ${escaparHTML(formatearFecha(e.fechaIngreso))}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="window.editarEmpleadoRRHH('${e.id}')" class="text-slate-400 hover:text-cyan-700 p-1 rounded-lg transition" title="Editar ficha">
                            <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
                        </button>
                        <button onclick="window.eliminarEmpleadoRRHHFirebase('${e.id}')" class="text-slate-400 hover:text-red-600 p-1 rounded-lg transition" title="Eliminar ficha">
                            <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                    <div class="bg-purple-50 border border-purple-100 rounded-xl p-3 md:col-span-2">
                        <p class="text-[10px] uppercase font-black text-purple-500 tracking-wide">Usuario de intranet asociado</p>
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                            <p class="font-bold text-purple-800">${escaparHTML(e.emailIntranet || 'Sin usuario asociado')}</p>
                            <button onclick="window.prepararUsuarioDesdeEmpleadoRRHH('${e.id}')" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-[11px] font-black transition inline-flex items-center justify-center gap-1.5">
                                <span class="material-symbols-rounded" style="font-size:16px;">${e.emailIntranet ? 'link' : 'person_add'}</span>
                                ${e.emailIntranet ? 'Cambiar asociación' : 'Crear/asociar usuario'}
                            </button>
                        </div>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="text-[10px] uppercase font-black text-slate-400 tracking-wide">Obra social</p>
                        <p class="font-bold text-slate-700 mt-1">${escaparHTML(e.obraSocial || '-')}</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="text-[10px] uppercase font-black text-slate-400 tracking-wide">Teléfono</p>
                        <p class="font-bold text-slate-700 mt-1">${escaparHTML(e.telefono || '-')}</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3 md:col-span-2">
                        <p class="text-[10px] uppercase font-black text-slate-400 tracking-wide">Domicilio</p>
                        <p class="font-bold text-slate-700 mt-1 whitespace-normal">${escaparHTML(e.domicilio || '-')}</p>
                    </div>
                    <div class="bg-red-50 border border-red-100 rounded-xl p-3 md:col-span-2">
                        <p class="text-[10px] uppercase font-black text-red-400 tracking-wide">Contacto de emergencia</p>
                        <p class="font-bold text-red-800 mt-1">${escaparHTML(e.contactoEmergenciaNombre || '-')} · ${escaparHTML(e.contactoEmergenciaTelefono || '-')}</p>
                    </div>
                    ${e.notas ? `
                        <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 md:col-span-2">
                            <p class="text-[10px] uppercase font-black text-amber-500 tracking-wide">Notas internas</p>
                            <p class="font-semibold text-amber-800 mt-1 whitespace-pre-wrap">${escaparHTML(e.notas)}</p>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;
    }).join('') : `
        <div class="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm italic">
            Todavía no hay empleados cargados en RRHH.
        </div>
    `;

    return `
        <div class="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 pb-8">
            <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 h-fit">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 class="text-base font-black text-slate-800">${empleadoEditando ? 'Editar ficha' : 'Nueva ficha'}</h3>
                        <p class="text-xs text-slate-500 mt-1">Datos internos de RRHH.</p>
                    </div>
                    ${empleadoEditando ? `
                        <button onclick="window.cancelarEdicionEmpleadoRRHH()" class="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-2 rounded-xl transition">Cancelar</button>
                    ` : ''}
                </div>

                <input type="hidden" id="input-id-empleado-rrhh" value="${empleadoEditando ? escaparHTML(empleadoEditando.id) : ''}">

                <datalist id="lista-usuarios-intranet-rrhh">
                    ${state.listaUsuariosFirebase.map(u => `
                        <option value="${escaparHTML(u.email || '')}">${escaparHTML(u.nombre || u.displayName || u.email || '')}</option>
                    `).join('')}
                </datalist>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre completo</label>
                        <input id="input-nombre-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'nombreCompleto')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha de ingreso</label>
                        <input type="date" id="input-fecha-ingreso-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'fechaIngreso')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Área</label>
                        <select id="input-area-empleado-rrhh" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            <option value="">Seleccionar área</option>
                            <option value="administracion" ${empleadoEditando && empleadoEditando.area === 'administracion' ? 'selected' : ''}>Administración</option>
                            <option value="asistencial" ${empleadoEditando && empleadoEditando.area === 'asistencial' ? 'selected' : ''}>Asistencial</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">DNI</label>
                        <input id="input-dni-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'dni')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">CUIL</label>
                        <input id="input-cuil-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'cuil')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Obra social</label>
                        <input id="input-obra-social-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'obraSocial')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Domicilio</label>
                        <input id="input-domicilio-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'domicilio')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Teléfono</label>
                        <input id="input-telefono-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'telefono')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Usuario de intranet asociado</label>
                        <input type="email" list="lista-usuarios-intranet-rrhh" id="input-email-intranet-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'emailIntranet')}" placeholder="correo@ejemplo.com" class="w-full bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Contacto emergencia</label>
                        <input id="input-contacto-emergencia-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'contactoEmergenciaNombre')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Teléfono emergencia</label>
                        <input id="input-telefono-emergencia-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'contactoEmergenciaTelefono')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Notas internas</label>
                        <textarea id="input-notas-empleado-rrhh" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none">${valorEmpleado(empleadoEditando, 'notas')}</textarea>
                    </div>
                </div>

                <button onclick="window.guardarEmpleadoRRHHFirebase()" class="mt-4 w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-cyan-100 flex items-center justify-center gap-1.5">
                    <span class="material-symbols-rounded" style="font-size:16px;">save</span> ${empleadoEditando ? 'Guardar cambios' : 'Guardar ficha'}
                </button>
            </section>

            <section class="min-w-0">
                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-base font-black text-slate-800">Base de empleados (${empleadosOrdenados.length})</h3>
                            <p class="text-xs text-slate-500 mt-1">Información confidencial exclusiva de RRHH.</p>
                        </div>
                        <div class="relative w-full md:w-80">
                            <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style="font-size:18px;">search</span>
                            <input id="input-buscar-empleado-rrhh" oninput="window.filtrarEmpleadosRRHH()" placeholder="Buscar empleado..." class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                    ${filas}
                </div>
            </section>
        </div>
    `;
}
