import { state } from '../../app-state.js';
import { db } from '../../firebase-config.js';
import {
    collection,
    doc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function crearLoteDebitosFirestore({ financiador, periodo, archivoNombre, prestaciones, importeTotalDebitado }) {
    if (!state.puedeEditarDebitos && !state.esAdminMaster) {
        throw new Error('No tenés permisos de edición para importar débitos.');
    }

    const loteRef = doc(collection(db, 'debitos_lotes'));
    const prestacionesRef = collection(db, 'debitos_prestaciones');
    const usuario = state.usuarioActualEmail || '';

    let batch = writeBatch(db);
    let operaciones = 0;

    batch.set(loteRef, {
        financiador,
        periodo,
        archivoNombre,
        cantidadRegistros: prestaciones.length,
        importeTotalDebitado,
        usuarioImportador: usuario,
        fechaImportacion: serverTimestamp(),
        estadoImportacion: 'importado'
    });
    operaciones++;

    async function commitSiHaceFalta() {
        if (operaciones < 450) return;
        await batch.commit();
        batch = writeBatch(db);
        operaciones = 0;
    }

    for (const prestacion of prestaciones) {
        const prestacionRef = doc(prestacionesRef);
        batch.set(prestacionRef, {
            ...prestacion,
            loteId: loteRef.id,
            financiador,
            periodo,
            usuarioImportador: usuario,
            fechaImportacion: serverTimestamp()
        });
        operaciones++;
        await commitSiHaceFalta();
    }

    if (operaciones > 0) await batch.commit();

    return loteRef.id;
}
