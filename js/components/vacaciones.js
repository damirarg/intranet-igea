export function renderizarVacaciones() {
    return `
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center shrink-0">
                    <span class="material-symbols-rounded">event_available</span>
                </div>
                <div>
                    <h3 class="text-lg font-black text-slate-800">Vacaciones y Licencias</h3>
                    <p class="text-sm text-slate-500 mt-1 max-w-2xl">Módulo interno en preparación. Por ahora sólo es visible para el administrador, así no se mezcla con Absentify ni confunde a los empleados.</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 text-xs">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p class="font-black text-slate-700">Próximo paso</p>
                            <p class="text-slate-500 mt-1">Definir reglas de días disponibles y aprobación.</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p class="font-black text-slate-700">Base</p>
                            <p class="text-slate-500 mt-1">Se apoyará en las fichas activas de RRHH.</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p class="font-black text-slate-700">Estado</p>
                            <p class="text-slate-500 mt-1">Laboratorio interno, sin impacto para usuarios.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
