
import { AppData, ServiceRecord } from './types';
import { STORAGE_KEY } from './constants';

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
      // Solicitar armazenamento persistente se disponível
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

export const saveData = (data: AppData): Promise<void> => {
  return new Promise((resolve, reject) => {
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
