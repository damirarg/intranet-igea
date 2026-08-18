export function escaparHTML(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function parsearMontoDebito(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

    const texto = String(valor || '')
        .replace(/\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const numero = Number.parseFloat(texto);
    return Number.isFinite(numero) ? numero : 0;
}

export function formatearMonedaAR(monto) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto || 0);
}

function normalizarEncabezado(valor = '') {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\$/g, 'pesos')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function obtenerValorPorAlias(fila, aliases) {
    const mapa = new Map();

    Object.keys(fila || {}).forEach(clave => {
        mapa.set(normalizarEncabezado(clave), fila[clave]);
    });

    for (const alias of aliases) {
        const valor = mapa.get(normalizarEncabezado(alias));
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
    }

    return '';
}

export function prepararFilasMarkey(filas = []) {
    const encabezados = Array.from(new Set(filas.flatMap(fila => Object.keys(fila || {}).filter(Boolean))));
    const encabezadosNormalizados = encabezados.map(normalizarEncabezado);
    const advertencias = [];

    const tienePaciente = encabezadosNormalizados.some(h => ['paciente', 'enfarazonsocial'].includes(h));
    const tieneDebito = encabezadosNormalizados.some(h => ['imp debito', 'importe debito', 'imp deb', 'debito', 'impdebito'].includes(h));

    if (!tienePaciente) advertencias.push('No se detectó una columna clara de paciente.');
    if (!tieneDebito) advertencias.push('No se detectó una columna clara de importe debitado.');

    const prestaciones = filas
        .map((fila, index) => {
            const importeDebitado = parsearMontoDebito(obtenerValorPorAlias(fila, ['Imp. Débito', 'Imp. Debito', 'Importe Débito', 'Importe Debito', 'Débito', 'Debito']));
            const cantidadDebitada = parsearMontoDebito(obtenerValorPorAlias(fila, ['Cant. Débito', 'Cant. Debito', 'Cantidad Débito', 'Cantidad Debito']));
            const paciente = obtenerValorPorAlias(fila, ['Paciente', 'enfaRazonSocial']);
            const codigo = obtenerValorPorAlias(fila, ['Código', 'Codigo']);
            const concepto = obtenerValorPorAlias(fila, ['Concepto']);
            const profesional = obtenerValorPorAlias(fila, ['Profesional']);
            const motivoDebito = obtenerValorPorAlias(fila, ['Motivo Débito', 'Motivo Debito']);
            const factura = obtenerValorPorAlias(fila, ['Factura Cob.', 'Factura Cob', 'Factura']);
            const periodoAnio = obtenerValorPorAlias(fila, ['Año', 'Anio']);
            const periodoMes = obtenerValorPorAlias(fila, ['Mes']);

            return {
                filaOrigen: index + 2,
                datosOriginalesMarkey: fila,
                camposNormalizados: {
                    paciente: String(paciente || '').trim(),
                    codigo: String(codigo || '').trim(),
                    concepto: String(concepto || '').trim(),
                    profesional: String(profesional || '').trim(),
                    motivoDebito: String(motivoDebito || '').trim(),
                    factura: String(factura || '').trim(),
                    periodoAnio: String(periodoAnio || '').trim(),
                    periodoMes: String(periodoMes || '').trim(),
                    cantidadDebitada,
                    importeDebitado
                },
                gestion: {
                    estado: 'debito_recibido',
                    refacturable: null,
                    importeRefacturado: 0,
                    importeRecuperado: 0,
                    importePerdido: 0,
                    observaciones: ''
                },
                trazabilidad: []
            };
        })
        .filter(prestacion => {
            const campos = prestacion.camposNormalizados;
            return campos.paciente || campos.codigo || campos.concepto || campos.importeDebitado !== 0;
        });

    const importeTotalDebitado = prestaciones.reduce((total, prestacion) => {
        return total + (prestacion.camposNormalizados.importeDebitado || 0);
    }, 0);

    return {
        encabezados,
        advertencias,
        prestaciones,
        cantidadRegistros: prestaciones.length,
        importeTotalDebitado
    };
}
