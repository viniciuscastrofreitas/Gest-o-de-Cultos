export const DAY_NAMES_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
export const DAY_NAMES_FULL = [
  'DOMINGO',
  'SEGUNDA-FEIRA',
  'TERÇA-FEIRA',
  'QUARTA-FEIRA',
  'QUINTA-FEIRA',
  'SEXTA-FEIRA',
  'SÁBADO',
] as const;

/**
 * Converte uma string de data (ex: '2026-11-21' ou ISO) em um objeto Date local ao meio-dia (12:00:00),
 * evitando deslocamentos de fuso horário (ex: UTC-3 voltando 1 dia).
 */
export const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();

  // Formato padrão YYYY-MM-DD (ou YYYY-MM-DDTHH:mm...)
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0, 0);
    if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return d;
    }
  }

  // Formato DD/MM/YYYY
  const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Normaliza a string de data para o formato YYYY-MM-DD local.
 */
export const toLocalDateString = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const KNOWN_DAY_DESCRIPTIONS = new Set<string>([
  ...DAY_NAMES_FULL,
  ...DAY_NAMES_SHORT,
  'EBD',
  'DOMINGO',
]);

/**
 * Garante que a descrição do culto (ex: 'SÁBADO', 'DOM', 'EBD') seja consistente
 * com o dia da semana real da data do relatório.
 */
export const normalizeServiceDescription = (dateStr: string, currentDescription?: string): string => {
  const d = parseLocalDate(dateStr);
  const current = (currentDescription || '').trim().toUpperCase();

  if (!d) return currentDescription || '';

  const dayIndex = d.getDay();

  if (dayIndex === 0) {
    // No domingo, preserva 'EBD' ou 'DOM' (ou 'DOMINGO')
    if (current === 'EBD') return 'EBD';
    if (current === 'DOM' || current === 'DOMINGO') return 'DOM';
    return 'DOM';
  }

  // De segunda a sábado, se estiver vazio ou for qualquer nome de dia da semana / EBD / DOM,
  // corrige para o dia da semana exato correspondente à data.
  if (!current || KNOWN_DAY_DESCRIPTIONS.has(current)) {
    return DAY_NAMES_FULL[dayIndex];
  }

  return currentDescription || DAY_NAMES_FULL[dayIndex];
};
