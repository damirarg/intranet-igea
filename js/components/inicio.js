import { state, baseRecibos } from '../app-state.js';

let intervaloRelojInicio = null;

const CLIMA_BAHIA_BLANCA = {
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    estacion: 'Bahía Blanca Aero'
};

function detalleObservacionSMN(observaciones) {
    const valor = nombre => observaciones.find(item => item.properties?.name === nombre)?.properties;
    const nubosidad = Number(valor('cloud_cover_total')?.value);
    const tiempoPresente = String(valor('present_weather')?.description || '').toLowerCase();

    if (/thunder|storm|torment/.test(tiempoPresente)) return { descripcion: 'Tormenta', icono: 'thunderstorm', tema: 'tormenta' };
    if (/rain|drizzle|shower|lluv|lloviz/.test(tiempoPresente)) return { descripcion: 'Lluvia', icono: 'rainy', tema: 'lluvia' };
    if (/snow|nieve/.test(tiempoPresente)) return { descripcion: 'Nieve', icono: 'weather_snowy', tema: 'nieve' };
    if (/fog|mist|niebla|neblina/.test(tiempoPresente)) return { descripcion: 'Con niebla', icono: 'foggy', tema: 'niebla' };
    if (Number.isFinite(nubosidad) && nubosidad >= 85) return { descripcion: 'Nublado', icono: 'cloud', tema: 'nublado' };
    if (Number.isFinite(nubosidad) && nubosidad >= 35) return { descripcion: 'Parcialmente nublado', icono: 'partly_cloudy_day', tema: 'parcial' };
    return { descripcion: 'Despejado', icono: 'sunny', tema: 'soleado' };
}

function actualizarRelojInicio() {
    const elementoHora = document.getElementById('inicio-hora');
    const elementoFecha = document.getElementById('inicio-fecha');
    if (!elementoHora || !elementoFecha) return;

    const ahora = new Date();
    elementoHora.textContent = new Intl.DateTimeFormat('es-AR', {
        timeZone: CLIMA_BAHIA_BLANCA.zonaHoraria,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(ahora);
    elementoFecha.textContent = new Intl.DateTimeFormat('es-AR', {
        timeZone: CLIMA_BAHIA_BLANCA.zonaHoraria,
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(ahora);
}

async function cargarClimaInicio() {
    const temperatura = document.getElementById('inicio-temperatura');
    const descripcion = document.getElementById('inicio-clima-descripcion');
    const rango = document.getElementById('inicio-clima-rango');
    const fuente = document.getElementById('inicio-clima-fuente');
    const icono = document.getElementById('inicio-clima-icono');
    const widget = document.getElementById('inicio-clima-widget');
    if (!temperatura || !descripcion || !rango || !fuente || !icono || !widget) return;

    try {
        const respuesta = await fetch('/api/clima-bahia-blanca');
        if (!respuesta.ok) throw new Error(`Clima no disponible (${respuesta.status})`);
        const datos = await respuesta.json();
        const primera = datos.features?.[0]?.properties;
        if (!primera?.reportId) throw new Error('El SMN no devolvió observaciones recientes');

        const observaciones = datos.features.filter(item => item.properties?.reportId === primera.reportId);
        const buscar = nombre => observaciones.find(item => item.properties?.name === nombre)?.properties;
        const medicionTemperatura = buscar('air_temperature');
        const maxima = buscar('maximum_temperature_at_height_and_over_period_specified');
        const minima = buscar('minimum_temperature_at_height_and_over_period_specified');
        if (!Number.isFinite(medicionTemperatura?.value)) throw new Error('La observación no incluye temperatura');

        const detalle = detalleObservacionSMN(observaciones);
        const horaObservacion = new Intl.DateTimeFormat('es-AR', {
            timeZone: CLIMA_BAHIA_BLANCA.zonaHoraria,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(new Date(medicionTemperatura.reportTime));
        const horaActual = Number(new Intl.DateTimeFormat('en-US', {
            timeZone: CLIMA_BAHIA_BLANCA.zonaHoraria,
            hour: 'numeric',
            hourCycle: 'h23'
        }).format(new Date()));
        const esNoche = horaActual < 7 || horaActual >= 20;

        temperatura.textContent = `${Number(medicionTemperatura.value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}°`;
        descripcion.textContent = detalle.descripcion;
        rango.textContent = Number.isFinite(maxima?.value) && Number.isFinite(minima?.value)
            ? `Máx. ${Number(maxima.value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}° · Mín. ${Number(minima.value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}°`
            : CLIMA_BAHIA_BLANCA.estacion;
        fuente.textContent = `SMN ${horaObservacion}`;
        widget.dataset.clima = esNoche ? 'noche' : detalle.tema;
        icono.textContent = esNoche ? 'dark_mode' : detalle.icono;
    } catch (error) {
        console.warn('No se pudo cargar el clima de Bahía Blanca:', error);
        temperatura.textContent = '--°';
        descripcion.textContent = 'Clima no disponible';
        rango.textContent = 'Bahía Blanca';
        fuente.textContent = 'SMN';
        icono.textContent = 'cloud_off';
        widget.dataset.clima = 'neutral';
    }
}

export function inicializarInicio() {
    if (intervaloRelojInicio) clearInterval(intervaloRelojInicio);
    actualizarRelojInicio();
    intervaloRelojInicio = setInterval(actualizarRelojInicio, 30000);
    cargarClimaInicio();
}

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

    return `
        <div class="relative w-full min-h-48 md:h-56 rounded-3xl overflow-hidden mb-6 md:mb-8 shadow-sm flex items-center px-6 py-5 md:px-10 border border-slate-200 shrink-0">
            <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-20">
                <source src="./assets/helice-adn.mp4" type="video/mp4">
            </video>
            <div class="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
            <div class="relative z-10 w-full flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-8">
                <div>
                <h3 class="text-2xl md:text-4xl font-bold text-slate-800 mb-1 md:mb-2 tracking-tight">Hola, ${nombreSaludo}</h3>
                <p class="text-slate-600 text-xs md:text-lg font-medium">Centralizá y gestioná tu documentación operativa y legajo personal.</p>
                </div>

                <section id="inicio-clima-widget" class="inicio-clima" data-clima="neutral" aria-label="Hora y clima actual en Bahía Blanca">
                    <div class="inicio-clima-lluvia" aria-hidden="true">
                        <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                    </div>
                    <div class="inicio-clima-hora">
                        <span id="inicio-hora">--:--</span>
                        <span id="inicio-fecha">Cargando fecha...</span>
                    </div>
                    <div class="inicio-clima-separador" aria-hidden="true"></div>
                    <span id="inicio-clima-icono" class="material-symbols-rounded inicio-clima-icono" aria-hidden="true">cloud</span>
                    <div class="inicio-clima-estado">
                        <div><strong id="inicio-temperatura">--°</strong><span id="inicio-clima-descripcion">Consultando clima...</span></div>
                        <small><span id="inicio-clima-rango">Bahía Blanca</span> · <a id="inicio-clima-fuente" href="https://www.smn.gob.ar/" target="_blank" rel="noopener noreferrer">SMN</a></small>
                    </div>
                </section>
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

            <div class="bg-white p-5 md:p-6 rounded-3xl border-t-4 border-t-violet-500 border-x border-b border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-center" onclick="cambiarVista('capacitaciones')">
                <div class="w-10 h-10 md:w-12 md:h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-rounded icon-large">school</span>
                </div>
                <h4 class="font-bold text-base md:text-lg text-slate-800 mb-1 leading-tight">Capacitaciones</h4>
                <p class="text-slate-500 leading-relaxed text-xs">Materiales de formación institucional.</p>
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
            ${tarjetaPermisosHTML}
        </div>
    `;
}
