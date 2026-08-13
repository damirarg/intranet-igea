import { state, baseRecibos } from '../app-state.js';

export function renderizarRecibos() {
    const mailLogueado = state.usuarioActualEmail.toLowerCase().trim();
    const empleado = baseRecibos.find(emp => emp.email.toLowerCase().trim() === mailLogueado);

    if (empleado) {
        if (!empleado.urlCarpeta || empleado.urlCarpeta === "") {
            return `
                <div class="bg-amber-50 p-6 md:p-8 rounded-3xl border border-amber-200 text-center flex flex-col items-center shrink-0">
                    <span class="material-symbols-rounded text-amber-500 text-5xl mb-3">info</span>
                    <h3 class="text-lg md:text-xl font-bold text-amber-800 mb-2">Sección no disponible</h3>
                    <p class="text-xs md:text-sm text-amber-700 font-medium max-w-md">Tu usuario cuenta con acceso operativo al portal, pero esta sección de legajo digital de sueldos está destinada al personal interno.</p>
                </div>
            `;
        }

        return `
            <div class="w-full flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
                <iframe src="${empleado.urlCarpeta}" class="w-full h-full relative z-10 border-0 bg-white" allow="autoplay"></iframe>
            </div>
        `;
    } else {
        return `
            <div class="bg-red-50 p-6 md:p-8 rounded-3xl border border-red-100 text-center flex flex-col items-center shrink-0">
                <span class="material-symbols-rounded text-red-400 text-5xl mb-3">error</span>
                <h3 class="text-lg md:text-xl font-bold text-red-800 mb-2">Legajo no vinculado</h3>
                <p class="text-xs md:text-sm text-red-600 font-medium">El correo <strong>${state.usuarioActualEmail}</strong> no tiene una carpeta de recibos asociada en el sistema.</p>
            </div>
        `;
    }
}