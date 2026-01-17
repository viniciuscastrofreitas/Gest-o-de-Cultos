
import { AppData } from './types';
import { STORAGE_KEY } from './constants';
import { db, doc, setDoc, getDoc, auth } from './firebase';

const DB_NAME = 'ChurchServiceDB';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
          console.log(persistent ? "Armazenamento persistente ativado" : "Armazenamento persistente negado");
        });
      }
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
};

export const saveData = async (data: AppData): Promise<void> => {
  // Salva Localmente (Prioridade)
  const saveLocal = new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(data, STORAGE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });

  await saveLocal;

  // Sincroniza com Firebase se logado e online
  if (auth.currentUser && navigator.onLine) {
    try {
      const userDoc = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDoc, {
        ...data,
        lastSync: new Date().toISOString()
      }, { merge: true });
      console.log("Sincronizado com a nuvem.");
    } catch (e) {
      console.warn("Falha na sincronização cloud:", e);
    }
  }
};

export const loadData = (): Promise<AppData | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(STORAGE_KEY);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const loadFromCloud = async (): Promise<AppData | null> => {
  if (!auth.currentUser) return null;
  try {
    const userDoc = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userDoc);
    if (snap.exists()) {
      return snap.data() as AppData;
    }
  } catch (e) {
    console.error("Erro ao carregar da nuvem:", e);
  }
  return null;
};
