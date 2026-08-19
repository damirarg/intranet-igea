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

export function normalizarNumeroNC(valor = '') {
    const texto = String(valor || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/^NC\s+/, 'N/C ')
        .replace(/^N C\s+/, 'N/C ');

    const sinPrefijo = texto.replace(/^N\/C\s*/, '').trim();
    const match = sinPrefijo.match(/^([AB])\s*0*([0-9]{1,4})\s*-\s*0*([0-9]{1,8})$/);
    if (!match) return texto;

    return `N/C ${match[1]}${match[2].padStart(4, '0')}-${match[3].padStart(8, '0')}`;
}

export function esNumeroNCValido(valor = '') {
    return /^N\/C [AB][0-9]{4}-[0-9]{8}$/.test(normalizarNumeroNC(valor));
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

function textoNormalizado(valor = '') {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function derivarGestionInicialDebito({ estadoHistorico, importeRefacturado, cantidadRefacturada }) {
    const estado = textoNormalizado(estadoHistorico);
    const tieneRefacturacion = importeRefacturado > 0 || cantidadRefacturada > 0;

    if (estado.includes('refacturar') && tieneRefacturacion) {
        return { estado: 'refacturado', refacturable: true };
    }

    if (estado.includes('refacturar')) {
        return { estado: 'refacturable', refacturable: true };
    }

    if (tieneRefacturacion) {
        return { estado: 'refacturado', refacturable: true };
    }

    return { estado: 'debito_recibido', refacturable: null };
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
            const convenio = obtenerValorPorAlias(fila, ['Convenio', 'Financiador', 'Obra Social', 'Prepaga']);
            const nc = obtenerValorPorAlias(fila, ['NC', 'Nota Crédito', 'Nota Credito']);
            const fecha = obtenerValorPorAlias(fila, ['Fecha']);
            const estadoHistorico = obtenerValorPorAlias(fila, ['Estado']);
            const importeOriginal = parsearMontoDebito(obtenerValorPorAlias(fila, ['Importe']));
            const importePaciente = parsearMontoDebito(obtenerValorPorAlias(fila, ['$Paciente', 'Paciente $', 'Importe Paciente']));
            const cantidadRefacturada = parsearMontoDebito(obtenerValorPorAlias(fila, ['Cant. Refa', 'Cantidad Refa', 'Cant Refacturada', 'Cantidad Refacturada']));
            const importeRefacturado = parsearMontoDebito(obtenerValorPorAlias(fila, ['Imp. Refa', 'Importe Refa', 'Imp Refacturado', 'Importe Refacturado']));
            const periodoAnio = obtenerValorPorAlias(fila, ['Año', 'Anio']);
            const periodoMes = obtenerValorPorAlias(fila, ['Mes']);
            const gestionInicial = derivarGestionInicialDebito({ estadoHistorico, importeRefacturado, cantidadRefacturada });

            return {
                filaOrigen: index + 2,
                datosOriginalesMarkey: fila,
                camposNormalizados: {
                    convenio: String(convenio || '').trim(),
                    nc: String(nc || '').trim(),
                    fecha,
                    paciente: String(paciente || '').trim(),
                    codigo: String(codigo || '').trim(),
                    concepto: String(concepto || '').trim(),
                    profesional: String(profesional || '').trim(),
                    motivoDebito: String(motivoDebito || '').trim(),
                    factura: String(factura || '').trim(),
                    periodoAnio: String(periodoAnio || '').trim(),
                    periodoMes: String(periodoMes || '').trim(),
                    cantidadDebitada,
                    importeDebitado,
                    cantidadRefacturada,
                    importeRefacturado,
                    importeOriginal,
                    importePaciente,
                    estadoHistorico: String(estadoHistorico || '').trim()
                },
                gestion: {
                    estado: gestionInicial.estado,
                    refacturable: gestionInicial.refacturable,
                    importeRefacturado,
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

    const debitadasConRefa = prestaciones.filter(prestacion => {
        return textoNormalizado(prestacion.camposNormalizados.estadoHistorico).includes('debitada')
            && !textoNormalizado(prestacion.camposNormalizados.estadoHistorico).includes('refacturar')
            && (Number(prestacion.camposNormalizados.importeRefacturado) || 0) > 0;
    }).length;

    const aRefacturarSinImporte = prestaciones.filter(prestacion => {
        return textoNormalizado(prestacion.camposNormalizados.estadoHistorico).includes('refacturar')
            && (Number(prestacion.camposNormalizados.importeRefacturado) || 0) === 0;
    }).length;

    if (debitadasConRefa > 0) {
        advertencias.push(`${debitadasConRefa} fila${debitadasConRefa === 1 ? '' : 's'} figuran como debitadas pero tienen importe refacturado cargado.`);
    }

    if (aRefacturarSinImporte > 0) {
        advertencias.push(`${aRefacturarSinImporte} fila${aRefacturarSinImporte === 1 ? '' : 's'} figuran para refacturar pero no tienen importe refacturado.`);
    }

    return {
        encabezados,
        advertencias,
        prestaciones,
        cantidadRegistros: prestaciones.length,
        importeTotalDebitado
    };
}
