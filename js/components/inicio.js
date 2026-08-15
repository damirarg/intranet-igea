import { state, baseRecibos } from '../app-state.js';

export function renderizarInicio() {
    let nombreSaludo = state.usuarioActualEmail; 
    const empleado = baseRecibos.find(emp => emp.email.toLowerCase().trim() === state.usuarioActualEmail.toLowerCase().trim());
    if (empleado && empleado.nombre) {
        let partesDelNombre = empleado.nombre.trim().split(/\s+/);
        nombreSaludo = partesDelNombre.pop();
    }

    let tarjetaSaldosHTML = (state.tienePermisoSaldos || state.esAdminMaster) ? `
        <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-rose-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('saldos')">
            <div class="w-10 h-10 md:w-12 md:h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <span class="material-symbols-rounded icon-large">request_quote</span>
            </div>
            <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Gestión Saldos</h4>
            <p class="text-slate-500 leading-relaxed text-xs">Control de cuentas particulares.</p>
        </div>
    ` : '';

    let tarjetaPermisosHTML = state.esAdminMaster ? `
        <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-purple-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('permisos')">
            <div class="w-10 h-10 md:w-12 md:h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <span class="material-symbols-rounded icon-large">admin_panel_settings</span>
            </div>
            <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Panel Permisos</h4>
            <p class="text-slate-500 leading-relaxed text-xs">Administración de accesos y documentos.</p>
        </div>
    ` : '';

    let tarjetaRRHHHTML = (state.tienePermisoRRHH || state.esAdminMaster) ? `
        <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-cyan-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('rrhh')">
            <div class="w-10 h-10 md:w-12 md:h-12 bg-cyan-50 text-cyan-700 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-cyan-700 group-hover:text-white transition-colors">
                <span class="material-symbols-rounded icon-large">groups</span>
            </div>
            <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">RRHH</h4>
            <p class="text-slate-500 leading-relaxed text-xs">Base interna de empleados.</p>
        </div>
    ` : '';

    let tarjetaGuardiasHTML = (state.tienePermisoGuardias || state.esAdminMaster) ? `
        <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-sky-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('guardias')">
            <div class="w-10 h-10 md:w-12 md:h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <span class="material-symbols-rounded icon-large">calendar_month</span>
            </div>
            <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Guardias Pasivas</h4>
            <p class="text-slate-500 leading-relaxed text-xs">Calendario y asignación de turnos.</p>
        </div>
    ` : '';

    let tarjetaVacacionesHTML = state.esAdminMaster ? `
        <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-teal-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('vacaciones')">
            <div class="w-10 h-10 md:w-12 md:h-12 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                <span class="material-symbols-rounded icon-large">event_available</span>
            </div>
            <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Vacaciones</h4>
            <p class="text-slate-500 leading-relaxed text-xs">Módulo interno en preparación.</p>
        </div>
    ` : '';

    return `
        <div class="relative w-full h-36 md:h-56 rounded-3xl overflow-hidden mb-6 md:mb-8 shadow-sm flex items-center px-6 md:px-10 border border-slate-200 shrink-0">
            <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-20">
                <source src="./assets/helice-adn.mp4" type="video/mp4">
            </video>
            <div class="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
            <div class="relative z-10">
                <h3 class="text-2xl md:text-4xl font-bold text-slate-800 mb-1 md:mb-2 tracking-tight">Hola, ${nombreSaludo}</h3>
                <p class="text-slate-600 text-xs md:text-lg font-medium">Centralizá y gestioná tu documentación operativa y legajo personal.</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 shrink-0 pb-10">
            <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-blue-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('dpp')">
                <div class="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-rounded icon-large">badge</span>
                </div>
                <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Directorio DPP</h4>
                <p class="text-slate-500 leading-relaxed text-xs">Descripciones de perfil y puestos.</p>
            </div>

            <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-emerald-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('procedimientos')">
                <div class="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-rounded icon-large">rule</span>
                </div>
                <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Procedimientos</h4>
                <p class="text-slate-500 leading-relaxed text-xs">Normativa vigente y protocolos.</p>
            </div>

            <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-indigo-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('recibos')">
                <div class="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-rounded icon-large">receipt_long</span>
                </div>
                <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Mis Recibos</h4>
                <p class="text-slate-500 leading-relaxed text-xs">Carpeta privada de sueldos.</p>
            </div>

            <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-amber-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('sugerencias')">
                <div class="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-rounded icon-large">sticky_note_2</span>
                </div>
                <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Sugerencias</h4>
                <p class="text-slate-500 leading-relaxed text-xs">Mural de ideas y propuestas.</p>
            </div>

            <a href="https://app.absentify.com" target="_blank" class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-teal-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center">
                <div class="w-10 h-10 md:w-12 md:h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-rounded icon-large">beach_access</span>
                </div>
                <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Absentify ↗</h4>
                <p class="text-slate-500 leading-relaxed text-xs">Gestión de vacaciones y licencias.</p>
            </a>

            ${tarjetaSaldosHTML}
            ${tarjetaGuardiasHTML}
            ${tarjetaRRHHHTML}
            ${tarjetaVacacionesHTML}
            ${tarjetaPermisosHTML}
        </div>
    `;
}
