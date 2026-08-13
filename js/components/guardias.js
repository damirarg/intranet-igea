import { state, baseRecibos } from '../app-state.js';
import { cambiarVista } from '../ui.js';

const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function guardiasMesSiguiente() {
    state.guardiaMesActual++;
    if (state.guardiaMesActual > 11) {
        state.guardiaMesActual = 0;
        state.guardiaAnioActual++;
    }
    cambiarVista('guardias');
}

export function guardiasMesAnterior() {
    state.guardiaMesActual--;
    if (state.guardiaMesActual < 0) {
        state.guardiaMesActual = 11;
        state.guardiaAnioActual--;
    }
    cambiarVista('guardias');
}

export function renderizarGuardias() {
    const mes = state.guardiaMesActual;
    const anio = state.guardiaAnioActual;

    // Primer día del mes
    const primerDia = new Date(anio, mes, 1);
    // Index del primer día (0: Dom, 1: Lun, ..., 6: Sáb)
    let primerDiaIndex = primerDia.getDay();
    // Ajustar para que Lunes sea 0 y Domingo sea 6
    primerDiaIndex = primerDiaIndex === 0 ? 6 : primerDiaIndex - 1;

    // Cantidad de días del mes actual
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    // Cantidad de días del mes anterior (para rellenar celdas iniciales)
    const totalDiasMesAnterior = new Date(anio, mes, 0).getDate();

    let celdasHTML = [];

    // 1. Celdas del mes anterior (Relleno inactivo)
    for (let i = primerDiaIndex - 1; i >= 0; i--) {
        const diaAnterior = totalDiasMesAnterior - i;
        celdasHTML.push(`
            <div class="min-h-[85px] md:min-h-[115px] p-2 bg-slate-50/50 border border-slate-100 rounded-2xl opacity-30 select-none">
                <span class="text-[10px] md:text-xs font-semibold text-slate-400">${diaAnterior}</span>
            </div>
        `);
    }

    // 2. Celdas del mes actual
    for (let dia = 1; dia <= totalDias; dia++) {
        const diaStr = String(dia).padStart(2, '0');
        const mesStr = String(mes + 1).padStart(2, '0');
        const fechaKey = `${anio}-${mesStr}-${diaStr}`;

        // Obtener día de la semana de esta celda
        const fechaObj = new Date(anio, mes, dia);
        const diaSemanaIndex = fechaObj.getDay(); // 0: Dom, 6: Sáb
        const esFinDeSemana = (diaSemanaIndex === 0 || diaSemanaIndex === 6);

        // Buscar si hay una guardia asignada
        const guardia = state.listaGuardiasFirebase.find(g => g.fecha === fechaKey);
        
        let bgCelda = "bg-white border-slate-200 hover:border-sky-400 hover:shadow-md";
        let textDiaColor = "text-slate-600";

        if (esFinDeSemana) {
            bgCelda = "bg-slate-50 border-slate-200 hover:border-sky-400 hover:shadow-md";
            textDiaColor = "text-slate-800 font-bold";
        }

        // Si es hoy, resaltar
        const hoy = new Date();
        const esHoy = (hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio);
        if (esHoy) {
            bgCelda = "bg-sky-50/40 border-sky-400 ring-2 ring-sky-100 hover:shadow-md";
            textDiaColor = "text-sky-600 font-bold";
        }

        let contenidoGuardiaHTML = "";
        let badgeFeriadoHTML = "";

        if (guardia) {
            if (guardia.feriado) {
                badgeFeriadoHTML = `
                    <span class="bg-red-50 text-red-600 border border-red-200 text-[8px] md:text-[9px] font-black px-1 rounded flex items-center gap-0.5" title="Día Feriado">
                        🎉 Feriado
                    </span>
                `;
                bgCelda = "bg-red-50/30 border-red-200 hover:border-red-400 hover:shadow-md";
            }

            if (guardia.colaboradorEmail) {
                const emp = baseRecibos.find(e => e.email.toLowerCase().trim() === guardia.colaboradorEmail.toLowerCase().trim());
                let nombreMostrado = guardia.colaboradorNombre || "Asignado";
                if (emp && emp.nombre) {
                    let partes = emp.nombre.trim().split(/\s+/);
                    nombreMostrado = partes.pop(); // Solo primer nombre
                }

                contenidoGuardiaHTML = `
                    <div class="mt-2 bg-sky-100 border border-sky-300 text-sky-800 p-1 md:p-1.5 rounded-xl text-[10px] md:text-[11px] font-black tracking-tight text-center truncate shadow-3xs" title="${guardia.colaboradorNombre || guardia.colaboradorEmail}">
                        👤 ${nombreMostrado}
                    </div>
                `;
            }

            if (guardia.notes || (guardia.notas && guardia.notas.trim() !== "")) {
                let noteText = guardia.notas || guardia.notes || "";
                contenidoGuardiaHTML += `
                    <p class="text-[9px] text-slate-400 italic mt-1 truncate px-1 text-center" title="${noteText}">${noteText}</p>
                `;
            }
        }

        // Solo permitir clic si es administrador
        const clickAttr = state.esAdminMaster 
            ? `onclick="window.abrirModalGuardia('${fechaKey}')" class="min-h-[85px] md:min-h-[115px] p-2 border rounded-2xl cursor-pointer transition ${bgCelda}"` 
            : `class="min-h-[85px] md:min-h-[115px] p-2 border rounded-2xl transition ${bgCelda}"`;

        celdasHTML.push(`
            <div ${clickAttr}>
                <div class="flex items-center justify-between">
                    <span class="text-xs md:text-sm ${textDiaColor}">${dia}</span>
                    <div class="flex gap-1">
                        ${badgeFeriadoHTML}
                        ${esHoy ? '<span class="bg-sky-600 w-1.5 h-1.5 rounded-full" title="Hoy"></span>' : ''}
                    </div>
                </div>
                ${contenidoGuardiaHTML}
            </div>
        `);
    }

    // 3. Celdas del mes siguiente (Relleno inactivo para completar la grilla)
    const celdasTotales = celdasHTML.length;
    const celdasRestantes = celdasTotales <= 35 ? 35 - celdasTotales : 42 - celdasTotales;
    for (let i = 1; i <= celdasRestantes; i++) {
        celdasHTML.push(`
            <div class="min-h-[85px] md:min-h-[115px] p-2 bg-slate-50/50 border border-slate-100 rounded-2xl opacity-30 select-none">
                <span class="text-[10px] md:text-xs font-semibold text-slate-400">${i}</span>
            </div>
        `);
    }

    // Encabezado de días de la semana
    const encabezadoDiasHTML = diasSemana.map(d => `
        <div class="text-center font-bold text-slate-500 text-xs md:text-sm uppercase tracking-wider py-1.5 select-none">${d}</div>
    `).join('');

    return `
        <div class="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
            <div>
                <h3 class="font-bold text-slate-800 text-lg">Cronograma de Guardias Pasivas</h3>
                <p class="text-xs text-slate-500">Programación de turnos administrativos de fines de semana y feriados.</p>
            </div>
            
            <div class="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                <div class="flex items-center gap-1.5">
                    <button onclick="window.guardiasMesAnterior()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 w-8 h-8 rounded-xl flex items-center justify-center transition shadow-3xs">
                        <span class="material-symbols-rounded" style="font-size: 18px;">chevron_left</span>
                    </button>
                    <span class="font-bold text-slate-800 text-xs md:text-sm min-w-[110px] text-center select-none uppercase tracking-wide">
                        ${meses[mes]} ${anio}
                    </span>
                    <button onclick="window.guardiasMesSiguiente()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 w-8 h-8 rounded-xl flex items-center justify-center transition shadow-3xs">
                        <span class="material-symbols-rounded" style="font-size: 18px;">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-3xl p-3 md:p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
            <!-- Grilla Días Semana -->
            <div class="grid grid-cols-7 gap-2 border-b border-slate-100 pb-2 mb-2">
                ${encabezadoDiasHTML}
            </div>
            
            <!-- Grilla Días Mes -->
            <div class="grid grid-cols-7 gap-2 flex-1 overflow-y-auto pr-1 no-scrollbar select-none">
                ${celdasHTML.join('')}
            </div>
        </div>
    `;
}