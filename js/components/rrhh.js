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

function nombreEmpleado(empleado = {}) {
    const apellidos = String(empleado.apellidos || '').trim();
    const nombres = String(empleado.nombres || '').trim();

    if (apellidos && nombres) return `${apellidos}, ${nombres}`;
    if (apellidos) return apellidos;
    if (nombres) return nombres;
    return empleado.nombreCompleto || '';
}

function valorApellidosEmpleado(empleado = null) {
    if (!empleado) return '';
    return escaparHTML(empleado.apellidos || '');
}

function valorNombresEmpleado(empleado = null) {
    if (!empleado) return '';
    return escaparHTML(empleado.nombres || '');
}

const areasRRHHIniciales = [
    { id: 'administracion', nombre: 'Administración', activa: true, orden: 1, subareas: [
        { valor: 'admision', texto: 'Admisión' },
        { valor: 'coordinacion', texto: 'Coordinación' },
        { valor: 'atencion_telefonica', texto: 'Atención Telefónica' },
        { valor: 'tesoreria', texto: 'Tesorería' },
        { valor: 'facturacion', texto: 'Facturación' }
    ]},
    { id: 'asistencial', nombre: 'Asistencial', activa: true, orden: 2, subareas: [
        { valor: 'coordinacion', texto: 'Coordinación' },
        { valor: 'coordinacion_asistentes_endoscopia', texto: 'Coordinación de Asistentes de Endoscopía' },
        { valor: 'asistentes_endoscopia', texto: 'Asistentes de Endoscopía' }
    ]}
];

function areasRRHH() {
    return state.listaAreasRRHHFirebase?.length ? state.listaAreasRRHHFirebase : areasRRHHIniciales;
}

function etiquetaArea(area = '') {
    return areasRRHH().find(item => item.id === area)?.nombre || area || '-';
}

function etiquetaSubarea(area = '', subarea = '') {
    if (subarea === 'tesoreria_facturacion') return 'Tesorería y Facturación';

    const opciones = areasRRHH().find(item => item.id === area)?.subareas || [];
    const encontrada = opciones.find(opcion => opcion.valor === subarea);
    return encontrada ? encontrada.texto : '-';
}

function renderizarOpcionesSubarea(area = '', subareaSeleccionada = '') {
    const opciones = (areasRRHH().find(item => item.id === area)?.subareas || []).filter(opcion => opcion.activa !== false || opcion.valor === subareaSeleccionada);

    return `
        <option value="">Seleccionar subárea</option>
        ${opciones.map(opcion => `
            <option value="${opcion.valor}" ${opcion.valor === subareaSeleccionada ? 'selected' : ''}>${opcion.texto}</option>
        `).join('')}
    `;
}

export function renderizarListaAreasRRHH() {
    const contenedor = document.getElementById('lista-areas-rrhh');
    if (!contenedor) return;
    contenedor.innerHTML = areasRRHH().map(area => `
        <section class="border border-slate-200 rounded-2xl overflow-hidden ${area.activa === false ? 'opacity-65' : ''}">
            <div class="flex items-center gap-2 p-3 bg-slate-50">
                <input id="nombre-area-rrhh-${area.id}" value="${escaparHTML(area.nombre)}" class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold">
                <button onclick="window.actualizarAreaRRHHFirebase('${area.id}')" class="w-8 h-8 inline-flex items-center justify-center text-cyan-700 hover:bg-cyan-100 rounded-lg" title="Guardar nombre"><span class="material-symbols-rounded" style="font-size:17px">save</span></button>
                <button onclick="window.alternarAreaRRHHFirebase('${area.id}', ${area.activa === false})" class="w-8 h-8 inline-flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-lg" title="${area.activa === false ? 'Restaurar' : 'Archivar'}"><span class="material-symbols-rounded" style="font-size:17px">${area.activa === false ? 'unarchive' : 'archive'}</span></button>
            </div>
            <div class="p-3 space-y-2">
                ${(area.subareas || []).map(subarea => `
                    <div class="flex items-center gap-2 ${subarea.activa === false ? 'opacity-50' : ''}">
                        <span class="material-symbols-rounded text-slate-300" style="font-size:16px">subdirectory_arrow_right</span>
                        <input id="nombre-subarea-rrhh-${area.id}-${subarea.valor}" value="${escaparHTML(subarea.texto)}" class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold">
                        <button onclick="window.actualizarSubareaRRHHFirebase('${area.id}','${subarea.valor}')" class="w-7 h-7 inline-flex items-center justify-center text-cyan-700 hover:bg-cyan-50 rounded-lg" title="Guardar"><span class="material-symbols-rounded" style="font-size:15px">save</span></button>
                        <button onclick="window.alternarSubareaRRHHFirebase('${area.id}','${subarea.valor}',${subarea.activa === false})" class="w-7 h-7 inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg" title="${subarea.activa === false ? 'Restaurar' : 'Archivar'}"><span class="material-symbols-rounded" style="font-size:15px">${subarea.activa === false ? 'unarchive' : 'archive'}</span></button>
                    </div>`).join('')}
                <div class="flex items-center gap-2 pt-1">
                    <input id="nueva-subarea-rrhh-${area.id}" placeholder="Nueva subárea" class="flex-1 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-1.5 text-xs">
                    <button onclick="window.agregarSubareaRRHHFirebase('${area.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700">Agregar</button>
                </div>
            </div>
        </section>`).join('');
}

export function abrirModalAreasRRHH() {
    if (!state.esAdminMaster || state.verComoEmail) return;
    document.getElementById('modal-areas-rrhh').classList.remove('hidden');
    renderizarListaAreasRRHH();
}

export function cerrarModalAreasRRHH() {
    document.getElementById('modal-areas-rrhh').classList.add('hidden');
}

function etiquetaMotivoSalida(motivo = '') {
    const motivos = {
        renuncia: 'Renuncia',
        despido: 'Despido',
        fallecimiento: 'Fallecimiento'
    };

    return motivos[motivo] || '-';
}

function formatearFecha(fechaISO = '') {
    if (!fechaISO) return '-';
    const [anio, mes, dia] = String(fechaISO).split('-');
    if (!anio || !mes || !dia) return fechaISO;
    return `${dia}/${mes}/${anio}`;
}

function calcularAntiguedad(fechaIngreso = '', fechaCorte = '') {
    if (!fechaIngreso) return '-';

    const inicio = new Date(`${fechaIngreso}T00:00:00`);
    const fin = fechaCorte ? new Date(`${fechaCorte}T00:00:00`) : new Date();

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) return '-';

    let anios = fin.getFullYear() - inicio.getFullYear();
    let meses = fin.getMonth() - inicio.getMonth();

    if (fin.getDate() < inicio.getDate()) meses--;

    if (meses < 0) {
        anios--;
        meses += 12;
    }

    const partes = [];
    if (anios > 0) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
    if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);

    return partes.length ? partes.join(' y ') : 'Menos de 1 mes';
}

function calcularEdad(fechaNacimiento = '') {
    if (!fechaNacimiento) return '-';

    const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
    const hoy = new Date();

    if (Number.isNaN(nacimiento.getTime()) || hoy < nacimiento) return '-';

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }

    return edad >= 0 ? `${edad} ${edad === 1 ? 'año' : 'años'}` : '-';
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

export function alternarArchivadosRRHH() {
    state.verEmpleadosArchivadosRRHH = !state.verEmpleadosArchivadosRRHH;
    window.cambiarVista('rrhh');
}

export function actualizarSubareasRRHH() {
    const selectArea = document.getElementById('input-area-empleado-rrhh');
    const selectSubarea = document.getElementById('input-subarea-empleado-rrhh');
    if (!selectArea || !selectSubarea) return;

    selectSubarea.innerHTML = renderizarOpcionesSubarea(selectArea.value, selectSubarea.value);
}

export function renderizarRRHH() {
    const empleadoEditando = state.empleadoRRHHEditandoId
        ? state.listaEmpleadosRRHHFirebase.find(e => e.id === state.empleadoRRHHEditandoId)
        : null;
    const puedeEditar = state.puedeEditarRRHH;

    const totalActivos = state.listaEmpleadosRRHHFirebase.filter(e => !e.archivado).length;
    const totalArchivados = state.listaEmpleadosRRHHFirebase.filter(e => e.archivado).length;
    const empleadosVisibles = state.listaEmpleadosRRHHFirebase.filter(e => state.verEmpleadosArchivadosRRHH ? e.archivado : !e.archivado);
    const empleadosOrdenados = [...empleadosVisibles].sort((a, b) => {
        const nombreA = nombreEmpleado(a).toLowerCase();
        const nombreB = nombreEmpleado(b).toLowerCase();
        return nombreA.localeCompare(nombreB, 'es');
    });

    const filas = empleadosOrdenados.length ? empleadosOrdenados.map(e => {
        const nombreVisible = nombreEmpleado(e);
        const busqueda = [
            e.apellidos,
            e.nombres,
            e.nombreCompleto,
            e.dni,
            e.cuil,
            e.fechaNacimiento,
            e.area,
            e.subarea,
            e.fechaIngreso,
            e.fechaSalida,
            e.motivoSalida,
            e.emailIntranet,
            e.obraSocial,
            e.telefono,
            e.contactoEmergenciaNombre
        ].filter(Boolean).join(' ');
        const antiguedad = calcularAntiguedad(e.fechaIngreso, e.archivado ? e.fechaSalida : '');
        const edad = calcularEdad(e.fechaNacimiento);

        return `
            <details name="empleados-rrhh" data-empleado-rrhh data-busqueda="${escaparHTML(busqueda)}" class="grupo-empleado-rrhh bg-white border border-slate-200 rounded-xl shadow-sm hover:border-cyan-200 transition overflow-hidden">
                <summary class="flex items-center justify-between gap-3 p-4 cursor-pointer select-none list-none">
                    <div>
                        <h4 class="text-sm font-black text-slate-800">${escaparHTML(nombreVisible || 'Sin nombre')}</h4>
                        <p class="text-[11px] text-slate-500 font-semibold mt-0.5">DNI ${escaparHTML(e.dni || '-')} · CUIL ${escaparHTML(e.cuil || '-')}</p>
                        <div class="flex flex-wrap gap-1.5 mt-2">
                            <span class="bg-cyan-50 text-cyan-700 border border-cyan-100 px-2 py-0.5 rounded-lg text-[10px] font-black">${escaparHTML(etiquetaArea(e.area))}</span>
                            <span class="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg text-[10px] font-black">${escaparHTML(etiquetaSubarea(e.area, e.subarea))}</span>
                            <span class="bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-lg text-[10px] font-black">Nacimiento ${escaparHTML(formatearFecha(e.fechaNacimiento))}</span>
                            <span class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg text-[10px] font-black">Edad ${escaparHTML(edad)}</span>
                            <span class="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black">Ingreso ${escaparHTML(formatearFecha(e.fechaIngreso))}</span>
                            <span class="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg text-[10px] font-black">Antigüedad ${escaparHTML(antiguedad)}</span>
                            ${e.archivado ? `<span class="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-lg text-[10px] font-black">Archivada</span>` : ''}
                        </div>
                    </div>
                    <span class="material-symbols-rounded flecha-empleado-rrhh text-slate-400 shrink-0">expand_more</span>
                </summary>

                <div class="border-t border-slate-100 p-4 bg-slate-50/40">
                    ${puedeEditar ? `<div class="flex justify-end gap-1 mb-3">
                        <button onclick="window.editarEmpleadoRRHH('${e.id}')" class="inline-flex items-center gap-1 text-cyan-700 hover:bg-cyan-50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition" title="Editar ficha"><span class="material-symbols-rounded" style="font-size:16px;">edit</span> Editar</button>
                        <button onclick="window.eliminarEmpleadoRRHHFirebase('${e.id}')" class="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition" title="Eliminar ficha"><span class="material-symbols-rounded" style="font-size:16px;">delete</span> Eliminar</button>
                    </div>` : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div class="bg-purple-50 border border-purple-100 rounded-xl p-3 md:col-span-2">
                        <p class="text-[10px] uppercase font-black text-purple-500 tracking-wide">Usuario de intranet asociado</p>
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                            <p class="font-bold text-purple-800">${escaparHTML(e.emailIntranet || 'Sin usuario asociado')}</p>
                            ${puedeEditar ? `<button onclick="window.prepararUsuarioDesdeEmpleadoRRHH('${e.id}')" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-[11px] font-black transition inline-flex items-center justify-center gap-1.5">
                                <span class="material-symbols-rounded" style="font-size:16px;">${e.emailIntranet ? 'link' : 'person_add'}</span>
                                ${e.emailIntranet ? 'Cambiar asociación' : 'Crear/asociar usuario'}
                            </button>` : ''}
                        </div>
                    </div>
                    ${e.archivado ? `
                        <div class="bg-rose-50 border border-rose-100 rounded-xl p-3 md:col-span-2">
                            <p class="text-[10px] uppercase font-black text-rose-500 tracking-wide">Salida</p>
                            <p class="font-bold text-rose-800 mt-1">${escaparHTML(formatearFecha(e.fechaSalida))} · ${escaparHTML(etiquetaMotivoSalida(e.motivoSalida))}</p>
                        </div>
                    ` : ''}
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
                </div>
            </details>
        `;
    }).join('') : `
        <div class="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm italic">
            ${state.verEmpleadosArchivadosRRHH ? 'No hay empleados archivados.' : 'Todavía no hay empleados activos cargados en RRHH.'}
        </div>
    `;

    return `
        <div class="grid grid-cols-1 ${puedeEditar ? 'xl:grid-cols-[420px_1fr]' : ''} gap-5 pb-8">
            ${puedeEditar ? `<section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 h-fit">
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
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Apellido/s</label>
                        <input id="input-apellidos-empleado-rrhh" value="${valorApellidosEmpleado(empleadoEditando)}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre/s</label>
                        <input id="input-nombres-empleado-rrhh" value="${valorNombresEmpleado(empleadoEditando)}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha de ingreso</label>
                        <input type="date" id="input-fecha-ingreso-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'fechaIngreso')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Área</label>
                        <select id="input-area-empleado-rrhh" onchange="window.actualizarSubareasRRHH()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            <option value="">Seleccionar área</option>
                            ${areasRRHH().filter(area => area.activa !== false || area.id === empleadoEditando?.area).map(area => `<option value="${area.id}" ${empleadoEditando && empleadoEditando.area === area.id ? 'selected' : ''}>${escaparHTML(area.nombre)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Subárea</label>
                        <select id="input-subarea-empleado-rrhh" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            ${renderizarOpcionesSubarea(empleadoEditando && empleadoEditando.area, empleadoEditando && empleadoEditando.subarea)}
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
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha de nacimiento</label>
                        <input type="date" id="input-fecha-nacimiento-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'fechaNacimiento')}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
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
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha de salida</label>
                        <input type="date" id="input-fecha-salida-empleado-rrhh" value="${valorEmpleado(empleadoEditando, 'fechaSalida')}" class="w-full bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Motivo de salida</label>
                        <select id="input-motivo-salida-empleado-rrhh" class="w-full bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none">
                            <option value="">Sin salida</option>
                            <option value="renuncia" ${empleadoEditando && empleadoEditando.motivoSalida === 'renuncia' ? 'selected' : ''}>Renuncia</option>
                            <option value="despido" ${empleadoEditando && empleadoEditando.motivoSalida === 'despido' ? 'selected' : ''}>Despido</option>
                            <option value="fallecimiento" ${empleadoEditando && empleadoEditando.motivoSalida === 'fallecimiento' ? 'selected' : ''}>Fallecimiento</option>
                        </select>
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
            </section>` : ''}

            <section class="min-w-0">
                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-base font-black text-slate-800">${state.verEmpleadosArchivadosRRHH ? 'Empleados archivados' : 'Base de empleados'} (${empleadosOrdenados.length})</h3>
                            <p class="text-xs text-slate-500 mt-1">Activos: ${totalActivos} · Archivados: ${totalArchivados}</p>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            ${state.esAdminMaster && !state.verComoEmail ? `<button onclick="window.abrirModalAreasRRHH()" class="bg-cyan-50 text-cyan-800 border border-cyan-100 hover:bg-cyan-100 px-3 py-2.5 rounded-xl text-xs font-black transition inline-flex items-center justify-center gap-1.5"><span class="material-symbols-rounded" style="font-size:16px">account_tree</span> Configurar áreas</button>` : ''}
                            <button onclick="window.alternarArchivadosRRHH()" class="${state.verEmpleadosArchivadosRRHH ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} px-3 py-2.5 rounded-xl text-xs font-black transition inline-flex items-center justify-center gap-1.5">
                                <span class="material-symbols-rounded" style="font-size:16px;">inventory_2</span>
                                ${state.verEmpleadosArchivadosRRHH ? 'Ver activos' : 'Ver archivados'}
                            </button>
                            <div class="relative w-full md:w-80">
                                <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style="font-size:18px;">search</span>
                                <input id="input-buscar-empleado-rrhh" oninput="window.filtrarEmpleadosRRHH()" placeholder="Buscar empleado..." class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-2.5">
                    ${filas}
                </div>
            </section>
        </div>
    `;
}
