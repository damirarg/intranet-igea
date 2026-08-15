import { state, baseRecibos } from './app-state.js';
import { renderizarInicio } from './components/inicio.js';
import { renderizarDPP } from './components/dpp.js';
import { renderizarProcedimientos } from './components/procedimientos.js';
import { renderizarRecibos } from './components/recibos.js';
import { renderizarSugerencias } from './components/sugerencias.js';
import { renderizarSaldos, parsearMontoNumerico } from './components/saldos.js';
import { renderizarPermisos } from './components/permisos.js';
import { renderizarGuardias } from './components/guardias.js';
import { renderizarRRHH } from './components/rrhh.js';
import { renderizarVacaciones } from './components/vacaciones.js';

export function abrirModalClave() {
    document.getElementById('modal-clave').classList.remove('hidden');
    document.getElementById('input-nueva-clave').value = ''; 
}

export function cerrarModalClave() {
    document.getElementById('modal-clave').classList.add('hidden');
}

export function abrirModalEditarDoc(docId) {
    state.docActualEditarId = docId;
    const docFind = state.listaDocumentosFirebase.find(d => d.id === docId);
    if (!docFind) return;

    document.getElementById('input-edit-orden').value = docFind.orden || 1;
    document.getElementById('input-edit-nombre').value = docFind.nombre || '';
    document.getElementById('input-edit-area').value = docFind.area || docFind.fecha || '';
    document.getElementById('input-edit-url').value = docFind.url || '';

    // Cargar anexos existentes en memoria
    state.anexosEditMemoria = docFind.materialesDidacticos ? [...docFind.materialesDidacticos] : [];
    
    const secAnexos = document.getElementById('seccion-edit-anexos');
    if (docFind.tipo === 'procedimiento') {
        secAnexos.classList.remove('hidden');
        renderizarListaAnexosEdit();
    } else {
        secAnexos.classList.add('hidden');
    }

    document.getElementById('modal-editar-doc').classList.remove('hidden');
}

export function renderizarListaAnexosEdit() {
    const cont = document.getElementById('lista-anexos-edit');
    if (!cont) return;

    if (state.anexosEditMemoria.length === 0) {
        cont.innerHTML = `<p class="text-[11px] text-slate-400 italic">No hay anexos agregados a este procedimiento.</p>`;
        return;
    }

    cont.innerHTML = state.anexosEditMemoria.map((mat, idx) => `
        <div class="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
            <span class="font-semibold text-slate-700 truncate max-w-[200px]">${mat.nombre} (${mat.esImagen ? 'Imagen' : 'Doc'})</span>
            <button type="button" onclick="window.eliminarAnexoDeLista(${idx})" class="text-slate-400 hover:text-red-600 transition p-1">
                <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
            </button>
        </div>
    `).join('');
}

function normalizarUrlGoogleDrive(url) {
    if (!url) return '';
    let limpia = url.trim();
    if (limpia.includes('drive.google.com') || limpia.includes('docs.google.com')) {
        if (limpia.endsWith('/preview')) return limpia;
        let base = limpia.split('?')[0];
        if (base.endsWith('/view')) base = base.slice(0, -5);
        if (base.endsWith('/edit')) base = base.slice(0, -5);
        if (base.endsWith('/sharing')) base = base.slice(0, -8);
        if (!base.endsWith('/preview')) {
            if (base.endsWith('/')) base = base.slice(0, -1);
            base = base + '/preview';
        }
        return base;
    }
    return limpia;
}

export function agregarAnexoALista() {
    const nom = document.getElementById('input-nuevo-anexo-nombre').value.trim();
    const tipo = document.getElementById('select-nuevo-anexo-tipo').value;
    let urlRaw = document.getElementById('input-nuevo-anexo-url').value.trim();

    if (!nom || !urlRaw) return alert("Ingresá nombre y URL del anexo.");

    let urlPreview = normalizarUrlGoogleDrive(urlRaw);

    state.anexosEditMemoria.push({
        nombre: nom,
        url: urlPreview,
        esImagen: tipo === 'img'
    });

    document.getElementById('input-nuevo-anexo-nombre').value = '';
    document.getElementById('input-nuevo-anexo-url').value = '';
    renderizarListaAnexosEdit();
}

export function eliminarAnexoDeLista(index) {
    state.anexosEditMemoria.splice(index, 1);
    renderizarListaAnexosEdit();
}

export function cerrarModalEditarDoc() {
    document.getElementById('modal-editar-doc').classList.add('hidden');
    state.docActualEditarId = null;
    state.anexosEditMemoria = [];
}

export function abrirModalSugerencia() {
    document.getElementById('modal-sugerencia').classList.remove('hidden');
    document.getElementById('texto-sugerencia').value = '';
    document.getElementById('check-anonimo').checked = false;
    window.seleccionarColorPostit('yellow');
}

export function cerrarModalSugerencia() {
    document.getElementById('modal-sugerencia').classList.add('hidden');
}

export function abrirModalGestion(docId) {
    state.saldoActualGestionId = docId;
    const cuenta = state.listaSaldosFirebase.find(c => c.id === docId);
    if (!cuenta) return;

    document.getElementById('nombre-paciente-gestion').textContent = cuenta.paciente;
    document.getElementById('saldo-paciente-gestion').textContent = cuenta.saldo;
    document.getElementById('texto-nueva-gestion').value = '';

    let historialHTML = '';
    if (cuenta.gestiones && cuenta.gestiones.length > 0) {
        let gestionesConIndex = cuenta.gestiones.map((g, idx) => ({ ...g, indexOriginal: idx })).reverse();
        
        historialHTML = gestionesConIndex.map(g => {
            let btnEditarHTML = state.esAdminMaster ? `
                <button onclick="window.editarGestionFirebase('${docId}', ${g.indexOriginal})" class="text-slate-400 hover:text-blue-600 transition p-1" title="Editar este mensaje">
                    <span class="material-symbols-rounded" style="font-size: 16px;">edit</span>
                </button>
            ` : '';

            return `
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group">
                    <div class="text-[10px] text-slate-500 font-bold mb-1 flex items-center justify-between">
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-rounded text-rose-500" style="font-size: 14px;">event</span> ${g.fecha}
                        </span>
                        ${btnEditarHTML}
                    </div>
                    <div class="text-sm text-slate-700 font-medium">${g.texto}</div>
                </div>
            `;
        }).join('');
    } else {
        historialHTML = '<p class="text-xs text-slate-400 italic text-center mt-4">Aún no hay anotaciones para este paciente.</p>';
    }
    document.getElementById('historial-gestiones').innerHTML = historialHTML;

    document.getElementById('modal-gestion').classList.remove('hidden');
}

export function cerrarModalGestion() {
    document.getElementById('modal-gestion').classList.add('hidden');
    state.saldoActualGestionId = null;
}

export function abrirModalCobro(docId) {
    state.saldoActualCobroId = docId;
    const cuenta = state.listaSaldosFirebase.find(c => c.id === docId);
    if (!cuenta) return;

    document.getElementById('nombre-paciente-cobro').textContent = cuenta.paciente;
    document.getElementById('deuda-actual-cobro').textContent = cuenta.saldo;
    
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('input-fecha-cobro').value = hoy;
    document.getElementById('input-monto-cobro').value = parsearMontoNumerico(cuenta.saldo);

    document.getElementById('modal-cobro').classList.remove('hidden');
}

export function cerrarModalCobro() {
    document.getElementById('modal-cobro').classList.add('hidden');
    state.saldoActualCobroId = null;
}

export function abrirModalGuardia(fechaString) {
    if (!state.esAdminMaster && !state.tienePermisoGuardias) return;

    state.guardiaDiaSeleccionado = fechaString;
    
    // Formatear la fecha para mostrarla amigablemente
    const partes = fechaString.split('-');
    const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const fechaFormateada = fechaObj.toLocaleDateString('es-AR', opciones);
    document.getElementById('fecha-seleccionada-guardia').textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    
    // Rellenar select de colaboradores
    const selectColab = document.getElementById('select-colaborador-guardia');
    selectColab.innerHTML = '<option value="" selected disabled>Seleccionar Colaborador...</option>' + 
        baseRecibos.map(emp => `<option value="${emp.email}">${emp.nombre}</option>`).join('');
        
    // Buscar si ya existe guardia cargada
    const guardiaExistente = state.listaGuardiasFirebase.find(g => g.fecha === fechaString);
    const btnEliminar = document.getElementById('btn-eliminar-guardia');
    const textoMedicos = document.getElementById('texto-medicos-guardia');
    
    if (guardiaExistente) {
        selectColab.value = guardiaExistente.colaboradorEmail || '';
        document.getElementById('check-feriado-guardia').checked = guardiaExistente.feriado === true;
        document.getElementById('texto-notes-guardia').value = guardiaExistente.notas || guardiaExistente.notes || '';
        if (textoMedicos) {
            textoMedicos.value = Array.isArray(guardiaExistente.medicos)
                ? guardiaExistente.medicos.map(m => [m.nombre, m.especialidad, m.contacto].filter(Boolean).join(' | ')).join('\n')
                : '';
        }
        if (btnEliminar) btnEliminar.classList.remove('hidden');
    } else {
        selectColab.selectedIndex = 0;
        document.getElementById('check-feriado-guardia').checked = false;
        document.getElementById('texto-notes-guardia').value = '';
        if (textoMedicos) textoMedicos.value = '';
        if (btnEliminar) btnEliminar.classList.add('hidden');
    }
    
    document.getElementById('modal-guardia').classList.remove('hidden');
}

export function cerrarModalGuardia() {
    document.getElementById('modal-guardia').classList.add('hidden');
    state.guardiaDiaSeleccionado = null;
}

export function cambiarVista(vista) {
    state.seccionActual = vista;
    state.viendoDocumento = false; 

    const btnInicioHeader = document.getElementById('btn-inicio-header');
    const contenido = document.getElementById('contenido-seccion');
    const titulo = document.getElementById('titulo-seccion');

    if (vista === 'inicio') {
        btnInicioHeader.classList.add('hidden');
        titulo.textContent = "Inicio";
        contenido.innerHTML = renderizarInicio();
    } else {
        btnInicioHeader.classList.remove('hidden');
        if (vista === 'dpp') { titulo.textContent = "Directorio de Perfiles"; contenido.innerHTML = renderizarDPP(); }
        if (vista === 'procedimientos') { titulo.textContent = "Procedimientos Internos"; contenido.innerHTML = renderizarProcedimientos(); }
        if (vista === 'recibos') { titulo.textContent = "Legajo Digital"; contenido.innerHTML = renderizarRecibos(); }
        if (vista === 'sugerencias') { titulo.textContent = "Buzón de Sugerencias"; contenido.innerHTML = renderizarSugerencias(); }
        if (vista === 'saldos') { titulo.textContent = "Control Operativo"; contenido.innerHTML = renderizarSaldos(); }
        if (vista === 'permisos') { titulo.textContent = "Administración de Permisos"; contenido.innerHTML = renderizarPermisos(); }
        if (vista === 'guardias') { titulo.textContent = "Cronograma de Guardias"; contenido.innerHTML = renderizarGuardias(); }
        if (vista === 'rrhh') { titulo.textContent = "Recursos Humanos"; contenido.innerHTML = renderizarRRHH(); }
        if (vista === 'vacaciones') { titulo.textContent = "Vacaciones y Licencias"; contenido.innerHTML = renderizarVacaciones(); }
    }
}

export function abrirDocumento(titulo, url, esImagen = false) {
    state.viendoDocumento = true;
    document.getElementById('titulo-seccion').textContent = titulo;
    document.getElementById('btn-inicio-header').classList.remove('hidden');
    
    let urlPreview = normalizarUrlGoogleDrive(url);
    
    document.getElementById('contenido-seccion').innerHTML = `
        <div class="w-full flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
            <iframe src="${urlPreview}" class="w-full h-full relative z-10 border-0 bg-white" allow="autoplay"></iframe>
        </div>
    `;
}

export function volverAtras() { 
    cambiarVista('inicio'); 
}
