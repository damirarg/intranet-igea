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

function escaparHTML(valor) {
    return String(valor || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function sanitizarHTMLNovedad(valor) {
    const documento = new DOMParser().parseFromString(`<div>${valor || ''}</div>`, 'text/html');
    const permitidos = new Set(['DIV', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U']);
    const limpiar = nodo => [...nodo.childNodes].forEach(hijo => {
        if (hijo.nodeType !== Node.ELEMENT_NODE) return;
        limpiar(hijo);
        if (!permitidos.has(hijo.tagName)) hijo.replaceWith(...hijo.childNodes);
        else [...hijo.attributes].forEach(atributo => hijo.removeAttribute(atributo.name));
    });
    const raiz = documento.body.firstElementChild;
    limpiar(raiz);
    return raiz.innerHTML;
}

function fechaDesdeValor(valor) {
    if (!valor) return null;
    if (typeof valor.toDate === 'function') return valor.toDate();
    if (Number.isFinite(valor.seconds)) return new Date(valor.seconds * 1000);
    if (valor instanceof Date) return valor;
    if (/^\d{4}-\d{2}-\d{2}/.test(String(valor))) return new Date(`${String(valor).slice(0, 10)}T12:00:00`);
    const partes = String(valor).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return partes ? new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]), 12) : null;
}

function formatearFechaBreve(valor) {
    const fecha = fechaDesdeValor(valor);
    if (!fecha || Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatearFechaHora(valor) {
    const fecha = fechaDesdeValor(valor);
    if (!fecha || Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' · ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function fechaISOHoy() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
}

function itemParaVos({ icono, color, etiqueta, titulo, detalle, vista, externo = '' }) {
    const accion = externo
        ? `href="${externo}" target="_blank" rel="noopener noreferrer"`
        : vista ? `href="#" onclick="event.preventDefault(); cambiarVista('${vista}')"` : '';
    const etiquetaElemento = externo || vista ? 'a' : 'div';
    return `
        <${etiquetaElemento} ${accion} class="inicio-tarea group">
            <span class="inicio-tarea-icono ${color}"><span class="material-symbols-rounded">${icono}</span></span>
            <span class="min-w-0 flex-1">
                <span class="inicio-tarea-etiqueta">${escaparHTML(etiqueta)}</span>
                <strong>${escaparHTML(titulo)}</strong>
                <small>${escaparHTML(detalle)}</small>
            </span>
            ${externo || vista ? '<span class="material-symbols-rounded inicio-tarea-flecha">arrow_forward</span>' : ''}
        </${etiquetaElemento}>`;
}

function accesoFrecuente({ icono, titulo, vista, color, externo = '' }) {
    const accion = externo
        ? `href="${externo}" target="_blank" rel="noopener noreferrer"`
        : `href="#" onclick="event.preventDefault(); cambiarVista('${vista}')"`;
    return `<a ${accion} class="inicio-acceso"><span class="material-symbols-rounded ${color}">${icono}</span><span>${escaparHTML(titulo)}</span><span class="material-symbols-rounded">chevron_right</span></a>`;
}

export function renderizarInicio() {
    let nombreSaludo = state.usuarioActualEmail; 
    const empleado = baseRecibos.find(emp => emp.email.toLowerCase().trim() === state.usuarioActualEmail.toLowerCase().trim());
    if (empleado && empleado.nombre) {
        let partesDelNombre = empleado.nombre.trim().split(/\s+/);
        nombreSaludo = partesDelNombre.pop();
    }

    const emailActual = String(state.usuarioActualEmail || '').toLowerCase().trim();
    const hoy = fechaISOHoy();
    const proximaGuardia = [...state.listaGuardiasFirebase]
        .filter(guardia => guardia.fecha >= hoy && (
            String(guardia.colaboradorEmail || '').toLowerCase().trim() === emailActual
            || (guardia.enfermeria || []).some(persona => String(persona.email || '').toLowerCase().trim() === emailActual)
        ))
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))[0];
    const capacitaciones = [...state.listaCapacitacionesFirebase].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    const procedimientos = state.listaDocumentosFirebase.filter(item => item.tipo === 'procedimiento');
    const capacitacionReciente = capacitaciones[0];
    const procedimientoReciente = procedimientos[0];

    const itemsPersonales = [];
    if (empleado?.urlCarpeta) {
        itemsPersonales.push(itemParaVos({ icono: 'receipt_long', color: 'text-indigo-600 bg-indigo-50', etiqueta: 'Tu legajo', titulo: 'Mis recibos', detalle: 'Consultá tus recibos de sueldo disponibles.', vista: 'recibos' }));
    }
    if (proximaGuardia) {
        const esEnfermeria = (proximaGuardia.enfermeria || []).some(persona => String(persona.email || '').toLowerCase().trim() === emailActual);
        const tipoGuardia = esEnfermeria ? 'Guardia de enfermería' : 'Guardia administrativa';
        itemsPersonales.push(itemParaVos({ icono: 'calendar_month', color: esEnfermeria ? 'text-violet-700 bg-violet-50' : 'text-sky-700 bg-sky-50', etiqueta: 'Próxima guardia', titulo: formatearFechaBreve(proximaGuardia.fecha), detalle: proximaGuardia.feriado ? `${tipoGuardia} · Feriado` : `${tipoGuardia} asignada.`, vista: state.tienePermisoGuardias || state.esAdminMaster ? 'guardias' : '' }));
    } else if (state.tienePermisoGuardias || state.esAdminMaster) {
        itemsPersonales.push(itemParaVos({ icono: 'calendar_month', color: 'text-sky-700 bg-sky-50', etiqueta: 'Guardias pasivas', titulo: 'Consultar cronograma', detalle: 'Revisá las próximas asignaciones.', vista: 'guardias' }));
    }
    if (capacitacionReciente) {
        itemsPersonales.push(itemParaVos({ icono: 'school', color: 'text-violet-700 bg-violet-50', etiqueta: 'Capacitación reciente', titulo: capacitacionReciente.titulo, detalle: `${capacitacionReciente.area || 'Toda la institución'}${capacitacionReciente.fecha ? ` · ${formatearFechaBreve(capacitacionReciente.fecha)}` : ''}`, vista: 'capacitaciones' }));
    }
    if (procedimientoReciente) {
        itemsPersonales.push(itemParaVos({ icono: 'rule', color: 'text-emerald-700 bg-emerald-50', etiqueta: 'Documentación operativa', titulo: procedimientoReciente.nombre, detalle: 'Accedé a la normativa y materiales vigentes.', vista: 'procedimientos' }));
    }

    const accesos = [
        { icono: 'rule', titulo: 'Procedimientos', vista: 'procedimientos', color: 'text-emerald-600' },
        { icono: 'school', titulo: 'Capacitaciones', vista: 'capacitaciones', color: 'text-violet-600' },
        empleado?.urlCarpeta
            ? { icono: 'receipt_long', titulo: 'Mis recibos', vista: 'recibos', color: 'text-indigo-600' }
            : { icono: 'badge', titulo: 'Directorio DPP', vista: 'dpp', color: 'text-blue-600' },
        { icono: 'beach_access', titulo: 'Absentify', externo: 'https://app.absentify.com', color: 'text-teal-600' }
    ];

    const actualizaciones = [
        ...capacitaciones.map(item => ({ tipo: 'Capacitación', titulo: item.titulo, fecha: item.fecha, vista: 'capacitaciones', icono: 'school', color: 'text-violet-600 bg-violet-50' })),
        ...state.listaDocumentosFirebase.map(item => ({ tipo: item.tipo === 'dpp' ? 'DPP' : 'Procedimiento', titulo: item.nombre, fecha: item.fechaAlta || item.fecha, vista: item.tipo === 'dpp' ? 'dpp' : 'procedimientos', icono: item.tipo === 'dpp' ? 'badge' : 'rule', color: item.tipo === 'dpp' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50' }))
    ].sort((a, b) => (fechaDesdeValor(b.fecha)?.getTime() || 0) - (fechaDesdeValor(a.fecha)?.getTime() || 0)).slice(0, 5);

    const actualizacionesHTML = actualizaciones.length ? actualizaciones.map(item => `
        <button onclick="cambiarVista('${item.vista}')" class="inicio-novedad">
            <span class="inicio-novedad-icono ${item.color}"><span class="material-symbols-rounded">${item.icono}</span></span>
            <span class="min-w-0 flex-1"><small>${escaparHTML(item.tipo)}${item.fecha ? ` · ${formatearFechaBreve(item.fecha)}` : ''}</small><strong>${escaparHTML(item.titulo)}</strong></span>
            <span class="material-symbols-rounded">chevron_right</span>
        </button>`).join('') : '<p class="inicio-vacio">Las nuevas publicaciones aparecerán en este espacio.</p>';

    const novedadesInstitucionales = [...new Map((state.listaNovedadesFirebase || []).map(item => [item.id, item])).values()]
        .filter(item => !item.archivada && (state.esAdminMaster || (item.destinatariosEmails || []).map(email => String(email).toLowerCase().trim()).includes(emailActual)))
        .sort((a, b) => (fechaDesdeValor(b.fechaCreacion)?.getTime() || 0) - (fechaDesdeValor(a.fechaCreacion)?.getTime() || 0));
    const novedadesInstitucionalesHTML = novedadesInstitucionales.length ? novedadesInstitucionales.slice(0, 8).map(item => `
        <article class="inicio-comunicado">
            <div class="inicio-comunicado-meta"><span>${escaparHTML(formatearFechaHora(item.fechaCreacion))}</span>${state.esAdminMaster && !state.verComoEmail ? `<span class="inicio-comunicado-acciones"><button onclick="window.editarNovedadInicio('${item.id}')" title="Editar novedad"><span class="material-symbols-rounded">edit</span></button><button onclick="window.archivarNovedadInicioFirebase('${item.id}', true)" title="Archivar novedad"><span class="material-symbols-rounded">archive</span></button><button onclick="window.eliminarNovedadInicioFirebase('${item.id}')" title="Eliminar novedad"><span class="material-symbols-rounded">delete</span></button></span>` : ''}</div>
            <p>${item.contenidoHtml ? sanitizarHTMLNovedad(item.contenidoHtml) : escaparHTML(item.mensaje)}</p>
        </article>`).join('') : '<p class="inicio-vacio">No hay novedades institucionales para mostrar.</p>';

    return `
        <div class="relative w-full min-h-48 md:h-52 rounded-2xl overflow-hidden mb-5 shadow-sm flex items-center px-6 py-5 md:px-9 border border-slate-200 shrink-0">
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
        
        <div class="inicio-tablero pb-8">
            <section class="inicio-bloque inicio-bloque-principal">
                <div class="inicio-bloque-cabecera"><div><span>Resumen personal</span><h3>Para vos</h3></div><span class="material-symbols-rounded">person_check</span></div>
                <div class="inicio-tareas">
                    ${itemsPersonales.slice(0, 4).join('') || '<p class="inicio-vacio">No tenés novedades personales pendientes.</p>'}
                </div>
            </section>

            <section class="inicio-bloque">
                <div class="inicio-bloque-cabecera"><div><span>Navegación rápida</span><h3>Accesos frecuentes</h3></div><span class="material-symbols-rounded">bolt</span></div>
                <div class="inicio-accesos">${accesos.map(accesoFrecuente).join('')}</div>
            </section>

            <section class="inicio-bloque inicio-bloque-novedades">
                <div class="inicio-bloque-cabecera"><div><span>Comunicaciones</span><h3>Novedades</h3></div>${state.esAdminMaster && !state.verComoEmail ? '<button onclick="window.abrirModalNovedadInicio()" class="inicio-publicar-novedad"><span class="material-symbols-rounded">add</span> Publicar</button>' : '<span class="material-symbols-rounded">campaign</span>'}</div>
                <div class="inicio-comunicados">${novedadesInstitucionalesHTML}</div>
            </section>

            <section class="inicio-bloque inicio-bloque-novedades">
                <div class="inicio-bloque-cabecera"><div><span>Portal IGEA</span><h3>Actualizaciones recientes</h3></div><span class="material-symbols-rounded">update</span></div>
                <div class="inicio-novedades">${actualizacionesHTML}</div>
            </section>
        </div>
    `;
}
