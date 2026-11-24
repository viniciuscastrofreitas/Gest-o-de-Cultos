import { AppData } from './types';
import { STORAGE_KEY } from './constants';

const DB_NAME = 'ChurchServiceDB';
const DB_VERSION = 1;
const STORE_NAME = 'reports';
const LOCAL_STORAGE_KEY = `${STORAGE_KEY}_local_v2`;

let dbInstance: IDBDatabase | null = null;
let dbConnectingPromise: Promise<IDBDatabase> | null = null;

// Sincronização e leitura imediata do localStorage (instantânea no carregamento)
export const getImmediateCachedData = (): AppData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.churchName === 'Clique aqui para nomear sua igreja') {
        parsed.churchName = 'Clique aqui';
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Falha ao ler cache síncrono do localStorage:", err);
  }
  return null;
};

// Salva imediatamente no localStorage para garantia total em caso de queda de energia ou fechamento rápido
const saveToLocalStorage = (data: AppData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Aviso: Quota de localStorage atingida ou restrita:", err);
  }
};

const getDB = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbConnectingPromise) {
    return dbConnectingPromise;
  }

  dbConnectingPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Reconectar se a conexão for fechada externamente
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      // Solicitar armazenamento persistente no celular para evitar limpeza automática
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
          if (persistent) {
            console.log("Armazenamento do celular configurado como persistente.");
          }
        }).catch(() => {});
      }

      dbConnectingPromise = null;
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbConnectingPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn("Abertura do IndexedDB bloqueada por outra aba.");
    };
  });

  return dbConnectingPromise;
};

export const initDB = async (): Promise<void> => {
  try {
    await getDB();
  } catch (err) {
    console.warn("IndexedDB indisponível, operando com LocalStorage:", err);
  }
};

export const saveData = async (data: AppData): Promise<void> => {
  const payload: AppData = {
    ...data,
    localUpdatedAt: data.localUpdatedAt ?? Date.now(),
  };

  // 1. Salva imediatamente no localStorage (Síncrono e ultra-rápido, sem risco de timeout)
  saveToLocalStorage(payload);

  // 2. Salva no IndexedDB como banco durável
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(payload, STORAGE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn("IndexedDB falhou ao salvar, dados preservados no localStorage:", err);
  }
};

const pickNewerData = (localData: AppData | null, idbData: AppData | undefined): { data: AppData | null; source: 'local' | 'idb' | 'none' } => {
  if (!localData && !idbData) return { data: null, source: 'none' };
  if (localData && (!idbData || !Array.isArray(idbData.history))) return { data: localData, source: 'local' };
  if (!localData && idbData) return { data: idbData, source: 'idb' };

  if (localData && idbData) {
    const localTs = localData.localUpdatedAt || 0;
    const idbTs = idbData.localUpdatedAt || 0;

    if (localTs > idbTs) {
      return { data: localData, source: 'local' };
    }
    if (idbTs > localTs) {
      return { data: idbData, source: 'idb' };
    }

    // Fallback para dados legados sem localUpdatedAt: nunca descartar registros extras do localStorage
    const localLen = localData.history?.length || 0;
    const idbLen = idbData.history?.length || 0;
    if (localLen > idbLen) {
      return { data: localData, source: 'local' };
    }
    return { data: idbData, source: 'idb' };
  }

  return { data: localData, source: 'local' };
};

export const loadData = async (): Promise<AppData | null> => {
  // 1. Tenta recuperar do localStorage primeiro para resposta instantânea
  const localData = getImmediateCachedData();

  // 2. Tenta recuperar do IndexedDB e escolhe a versão mais recente (nunca sobrescreve local mais novo)
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(STORAGE_KEY);
        
        getRequest.onsuccess = () => {
          const idbData = getRequest.result as AppData | undefined;
          const chosen = pickNewerData(localData, idbData);

          if (chosen.source === 'idb' && chosen.data) {
            saveToLocalStorage(chosen.data);
            resolve(chosen.data);
          } else if (chosen.source === 'local' && chosen.data) {
            // Atualiza o IndexedDB com o dado mais recente do localStorage
            try {
              const writeTx = db.transaction(STORE_NAME, 'readwrite');
              writeTx.objectStore(STORE_NAME).put(chosen.data, STORAGE_KEY);
            } catch {
              // ignora se falhar gravação de reparo
            }
            resolve(chosen.data);
          } else {
            resolve(localData);
          }
        };

        getRequest.onerror = () => {
          resolve(localData);
        };
      } catch {
        resolve(localData);
      }
    });
  } catch (err) {
    console.warn("Recorrendo ao localStorage por falha no IndexedDB:", err);
    return localData;
  }
};
