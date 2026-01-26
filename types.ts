
export interface ServiceRoles {
  gate: string;      // Portão
  praise: string;    // Louvor
  word: string;      // Palavra (Obreiro selecionado)
  scripture: string; // Texto Bíblico (Livro e versículo digitados)
}

export interface ServiceRecord {
  id: string;
  date: string;
  description: string; // EBD, DOM, ou Dia da Semana
  songs: string[];
  roles: ServiceRoles;
}

export interface ServiceDraft {
  date: string;
  description: string;
  songs: string[];
  roles: ServiceRoles;
}

export interface SongStats {
  song: string;
  count: number;
  lastDate: string | null;
  history: string[];
}

export type LearningStatus = 'not_started' | 'learning' | 'learned' | 'correcting';

export interface PraiseLearningItem {
  song: string;
  status: LearningStatus;
  updatedAt: string;
}

export interface AppData {
  history: ServiceRecord[];
  churchName?: string;
  customSongs?: string[];
  customWorkers?: string[];
  draft?: ServiceDraft;
  learningList?: PraiseLearningItem[];
}
