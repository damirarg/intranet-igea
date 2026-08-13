import { state } from '../app-state.js';
import { cambiarVista } from '../ui.js';

export function alternarVistaArchivadas(estado) {
    state.verArchivadas = estado;
    cambiarVista('sugerencias');
}

export function seleccionarColorPostit(color) {
    state.colorPostitSeleccionado = color;
    ['yellow', 'emerald', 'sky', 'rose'].forEach(c => {
        const btn = document.getElementById(`color-${c}`);
        if (btn) btn.className = `w-8 h-8 rounded-full bg-${c}-200 border-2 ${c === color ? `border-${c}-500 scale-110` : 'border-transparent'} transition`;
    });
}

export function renderizarSugerencias() {
    if (!state.esAdminMaster) state.verArchivadas = false;

    let sugerenciasFiltradas = state.listaSugerencias.filter(sug => {
        let estaArchivada = sug.archivada === true;
        return state.verArchivadas ? estaArchivada : !estaArchivada;
    });

    let postitsHTML = "";
    if (sugerenciasFiltradas.length === 0) {
        postitsHTML = `
            <div class="col-span-full bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-center">
                <span class="material-symbols-rounded text-slate-300 text-5xl mb-2">sticky_note_2</span>
                <h4 class="text-slate-600 font-bold mb-1">${state.verArchivadas ? 'No hay sugerencias archivadas' : '¡El mural está listo!'}</h4>
                <p class="text-xs text-slate-400">${state.verArchivadas ? 'Las sugerencias archivadas por la administración aparecerán acá.' : 'Sé el primero en dejar una sugerencia usando el botón superior.'}</p>
            </div>
        `;
    } else {
        postitsHTML = sugerenciasFiltradas.map(sug => {
            let colorBg = "bg-yellow-100 border-yellow-300 text-yellow-900";
            if (sug.color === 'emerald') colorBg = "bg-emerald-100 border-emerald-300 text-emerald-900";
            if (sug.color === 'sky') colorBg = "bg-sky-100 border-sky-300 text-sky-900";
            if (sug.color === 'rose') colorBg = "bg-rose-100 border-rose-300 text-rose-900";

            let userKey = state.usuarioActualEmail ? state.usuarioActualEmail.toLowerCase().replace(/\./g, '_') : "";
            let votosMap = sug.votosMap || {};
            let miVotoUnico = votosMap[userKey];

            let cantMeGusta = 0, cantBuenaIdea = 0, cantMeEncanta = 0;
            Object.values(votosMap).forEach(voto => {
                if (voto === 'meGusta') cantMeGusta++;
                if (voto === 'buenaIdea') cantBuenaIdea++;
                if (voto === 'meEncanta') cantMeEncanta++;
            });

            let esAutor = sug.emailAutor && state.usuarioActualEmail && sug.emailAutor.toLowerCase() === state.usuarioActualEmail.toLowerCase();
            let btnEliminarHTML = esAutor ? `
                <button onclick="window.eliminarSugerenciaFirebase('${sug.id}')" title="Eliminar mi sugerencia" class="text-slate-400 hover:text-red-600 transition">
                    <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
                </button>
            ` : '';

            let btnArchivarHTML = state.esAdminMaster ? `
                <button onclick="window.archivarSugerenciaFirebase('${sug.id}', ${!sug.archivada})" title="${sug.archivada ? 'Desarchivar' : 'Archivar'}" class="text-slate-400 hover:text-amber-600 transition">
                    <span class="material-symbols-rounded" style="font-size: 16px;">${sug.archivada ? 'unarchive' : 'archive'}</span>
                </button>
            ` : '';

            return `
                <div class="${colorBg} p-5 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col justify-between h-60 transform hover:-rotate-1 relative group shrink-0">
                    <div class="flex justify-between items-start gap-2 mb-2">
                        <p class="text-xs md:text-sm font-medium leading-relaxed overflow-y-auto no-scrollbar flex-1 max-h-28">${sug.texto}</p>
                        <div class="flex items-center gap-1 shrink-0">
                            ${btnArchivarHTML}
                            ${btnEliminarHTML}
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center gap-1.5 mb-3 pt-2 border-t border-black/10">
                            <button title="Me gusta" onclick="window.reaccionarFirebase('${sug.id}', 'meGusta')" 
                                class="${miVotoUnico === 'meGusta' ? 'bg-amber-400/80 ring-2 ring-amber-500 font-bold' : 'bg-white/60 hover:bg-white'} text-[11px] px-2 py-1 rounded-lg transition flex items-center gap-1 border border-black/5">
                                👍 <span>${cantMeGusta}</span>
                            </button>
                            <button title="Buena idea" onclick="window.reaccionarFirebase('${sug.id}', 'buenaIdea')" 
                                class="${miVotoUnico === 'buenaIdea' ? 'bg-amber-400/80 ring-2 ring-amber-500 font-bold' : 'bg-white/60 hover:bg-white'} text-[11px] px-2 py-1 rounded-lg transition flex items-center gap-1 border border-black/5">
                                💡 <span>${cantBuenaIdea}</span>
                            </button>
                            <button title="Me encanta" onclick="window.reaccionarFirebase('${sug.id}', 'meEncanta')" 
                                class="${miVotoUnico === 'meEncanta' ? 'bg-amber-400/80 ring-2 ring-amber-500 font-bold' : 'bg-white/60 hover:bg-white'} text-[11px] px-2 py-1 rounded-lg transition flex items-center gap-1 border border-black/5">
                                ❤️ <span>${cantMeEncanta}</span>
                            </button>
                        </div>
                        <div class="flex justify-between items-center text-[10px] opacity-75">
                            <span class="font-bold">${sug.autor}</span>
                            <span>${sug.fecha}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    let selectorPestanasHTML = state.esAdminMaster ? `
        <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button onclick="window.alternarVistaArchivadas(false)" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${!state.verArchivadas ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}">Activas</button>
            <button onclick="window.alternarVistaArchivadas(true)" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${state.verArchivadas ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}">Archivadas</button>
        </div>
    ` : '';

    return `
        <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <div>
                <h3 class="font-bold text-slate-800 text-lg">Mural Colaborativo de Ideas</h3>
                <p class="text-xs text-slate-500">Espacio para proponer mejoras operativas y organizacionales.</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                ${selectorPestanasHTML}
                <button onclick="abrirModalSugerencia()" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md shadow-amber-100 flex items-center gap-1.5">
                    <span class="material-symbols-rounded" style="font-size: 18px;">add_comment</span> + Nueva Idea
                </button>
            </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 shrink-0 pb-10">
            ${postitsHTML}
        </div>
    `;
}