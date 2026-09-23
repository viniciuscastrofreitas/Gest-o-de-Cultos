/**
 * Utilitário centralizado para classificação canônica dos louvores.
 * 
 * Regras definidas:
 * - Coletânea Principal / Geral (Hinos 00 a 794)
 *   - Clamor Geral: 01 a 56
 *   - Principais (Geral): 00 e 57 a 794 ("00 - Aquilo que fui não sou mais" pertence ao geral)
 * 
 * - Coletânea CIAS: hinos iniciados por "(CIAS)"
 *   - Clamor CIAS: (CIAS) 01 a 13 (Permanecem EXCLUSIVAMENTE nas estatísticas das CIAS, nunca no Clamor)
 *   - Demais CIAS: (CIAS) 14 a 241
 * 
 * - Avulsos: Qualquer louvor que não pertença à Coletânea Geral (00 a 794)
 *   e nem às CIAS (01 a 241). Ex: louvores avulsos cadastrados sem número ou com números fora dessas faixas.
 */

export type SongCategory = 'principais' | 'cias' | 'clamor' | 'avulsos';

/**
 * Verifica se um texto na lista de louvores é um marcador/organizador de grupo
 * (ex: "GRUPO DE LOUVOR", "GRUPO DE SENHORAS", "GRUPO DE JOVENS", etc.)
 * Esses nomes são usados para estruturar/dividir a ordem do culto
 * e NÃO devem ser contabilizados como louvores cantados, repetições, rankings ou estatísticas.
 */
export const isGroupHeaderOrMarker = (song: string): boolean => {
  if (!song) return false;
  const trimmed = song.trim();

  // Se tem número no início ou prefixo (CIAS) numerado, é um hino real numerado (ex: "666 - O QUE ME DÁS"), não é marcador
  if (/^\(?CIAS\)?\s*\d+/i.test(trimmed) || /^\d+\s*[-–]/i.test(trimmed)) {
    return false;
  }

  const normalized = trimmed
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Marcadores de grupo canônicos
  const markers = [
    'GRUPO DE LOUVOR',
    'GRUPO DE SENHORAS',
    'GRUPO DE JOVENS',
    'GRUPO DE CRIANCAS',
    'GRUPO DE ADOLESCENTES',
    'GRUPO DE VAROES',
    'GRUPO DE HOMENS',
    'GRUPO DE INTERMEDIARIOS',
    'GRUPO DOS JOVENS',
    'GRUPO DAS SENHORAS',
    'GRUPO DAS CRIANCAS',
    'GRUPO DOS VAROES',
    'GRUPO INSTRUMENTAL',
    'GRUPO DE INSTRUMENTISTAS'
  ];

  if (markers.includes(normalized)) return true;

  // Cobre variações com traços ou pontuação de cabeçalho: "--- GRUPO DE JOVENS ---", "GRUPO DE JOVENS:"
  const stripped = normalized.replace(/^[-–—=*#\s]+|[-–—=*#\s:]+$/g, '');
  if (markers.includes(stripped)) return true;

  // Cobre qualquer início "GRUPO DE ...", "GRUPO DOS ...", "GRUPO DAS ..." sem conter dígitos numéricos
  if (/^GRUPO\s+(DE|DOS|DAS)\s+/i.test(normalized) && !/\d+/.test(normalized)) {
    return true;
  }

  return false;
};

export const extractSongNumber = (song: string): number | null => {
  if (!song) return null;
  // Procura padrão de número logo no início ou após prefixo (CIAS)
  // Ex: "00 - ...", "01 - ...", "782 - ...", "(CIAS) 05 - ...", "(CIAS) 198 - ..."
  const clean = song.trim();
  const match = clean.match(/(?:^\(CIAS\)\s*|^)(\d+)/i) || clean.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Retorna true se for louvor de Clamor da Coletânea Geral (01 a 56).
 * NOTA: Louvores de clamor das CIAS ficam estritamente dentro das CIAS.
 * O hino 00 pertence à categoria Geral (Principais), não ao Clamor.
 */
export const isClamorSong = (song: string): boolean => {
  if (!song || isGroupHeaderOrMarker(song)) return false;
  const trimmed = song.trim();
  // Os de clamor da CIAS não devem entrar nas estatísticas do Clamor (ficam só nas CIAS)
  if (trimmed.startsWith('(CIAS)')) return false;
  const num = extractSongNumber(trimmed);
  if (num === null) return false;
  // Clamor Geral é de 01 a 56 (o 00 pertence aos Principais/Geral)
  return num >= 1 && num <= 56;
};

/**
 * Retorna true se for um louvor CIAS (qualquer hino oficial de CIAS, inclusive Clamor CIAS).
 */
export const isCiasSong = (song: string): boolean => {
  if (!song || isGroupHeaderOrMarker(song)) return false;
  return song.trim().startsWith('(CIAS)');
};

/**
 * Retorna true se for Louvor Avulso (não é da coletânea geral 00-794 nem das CIAS 01-241).
 * Marcadores de grupo NÃO são louvores avulsos.
 */
export const isAvulsoSong = (song: string): boolean => {
  if (!song || isGroupHeaderOrMarker(song)) return false;
  const trimmed = song.trim();
  const num = extractSongNumber(trimmed);

  if (trimmed.startsWith('(CIAS)')) {
    // Se for CIAS mas não tiver número ou número fora de 1 a 241, é avulso
    return num === null || num < 1 || num > 241;
  }

  // Coletânea principal/geral tem números de 0 a 794 (00 a 794)
  // Se não tem número, ou se o número for < 0 ou > 794, é avulso
  return num === null || num < 0 || num > 794;
};

/**
 * Retorna true se for hino da Coletânea Principal/Geral (excluindo Clamor Geral e Avulsos).
 * Inclui:
 * - Hino 00 ("00 - Aquilo que fui não sou mais")
 * - Hinos de 57 a 794
 * Sem prefixo (CIAS).
 */
export const isPrincipalSong = (song: string): boolean => {
  if (!song || isGroupHeaderOrMarker(song)) return false;
  const trimmed = song.trim();
  if (trimmed.startsWith('(CIAS)')) return false;
  const num = extractSongNumber(trimmed);
  if (num === null) return false;
  return num === 0 || (num >= 57 && num <= 794);
};

/**
 * Verifica se um hino corresponde ao filtro de categoria selecionado pelo usuário.
 * Filtros suportados:
 * - 'all': Todos os louvores (exceto marcadores de grupo organizacionais)
 * - 'principais': Hinos da Coletânea Geral (00 e 57 a 794)
 * - 'cias': Todos os louvores das CIAS (INCLUINDO o Clamor das CIAS)
 * - 'clamor': Hinos de Clamor exclusivamente da Coletânea Geral (01 a 56)
 * - 'avulsos': Hinos avulsos (fora da coletânea geral e fora de CIAS)
 */
export const matchesCategory = (
  song: string,
  category: 'all' | 'principais' | 'cias' | 'clamor' | 'avulsos'
): boolean => {
  if (!song || isGroupHeaderOrMarker(song)) return false;
  if (category === 'all') return true;

  const isCias = isCiasSong(song);
  const isClamor = isClamorSong(song);
  const isAvulso = isAvulsoSong(song);

  switch (category) {
    case 'avulsos':
      return isAvulso;

    case 'cias':
      // Todos os louvores das CIAS (inclusive o clamor das CIAS) pertencem à categoria 'cias'.
      return isCias && !isAvulso;

    case 'clamor':
      // Clamor estritamente da Coletânea Geral (01 a 56). CIAS fica só nas CIAS.
      return isClamor;

    case 'principais':
      // Hinos da Coletânea Geral (00 e 57 a 794)
      return isPrincipalSong(song);

    default:
      return true;
  }
};
