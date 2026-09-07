// 1. Ratios de Sharpe: Muestra SIEMPRE el Ratio de Sharpe en porcentaje (multiplicado por 100 y con el símbolo %, ej. 256,45%).
// 2. Separador de Decimales y Miles: Formateo numérico regional en español (Decimales con COMA, Miles con PUNTO).
//    Todos los números en pantalla deben mostrar exactamente DOS (2) DECIMALES.

export const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '.')) : value;
  if (isNaN(num)) return '0,00';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatCurrency = (value: number | string): string => {
  return `$ ${formatNumber(value)}`;
};

export const formatSharpe = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '.')) : value;
  if (isNaN(num)) return '0,00%';
  // Sharpe se multiplica por 100
  return `${formatNumber(num * 100)}%`;
};

export const formatPercentage = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '.')) : value;
  if (isNaN(num)) return '0,00%';
  return `${formatNumber(num * 100)}%`;
};

// 3. Fechas: Formateo uniforme dd/mm/aaaa en toda la interfaz
export const formatDate = (dateStr: string): string => {
  const normalized = dateStr.replace(/-/g, '/');
  const parts = normalized.split('/');
  let parsed: Date;

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      // DD/MM/YYYY
      parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  } else {
    parsed = new Date(normalized);
  }

  if (isNaN(parsed.getTime())) return dateStr;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

// Normalización de entrada: Limpia internamente cualquier entrada de datos independientemente de si usa puntos o comas
export const normalizeInputNumber = (val: string): number => {
  if (!val) return 0;
  // Eliminamos los separadores de miles (.) y convertimos la coma decimal (,) a punto (.)
  let clean = val.trim().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};
