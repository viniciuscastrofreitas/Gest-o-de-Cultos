import { AppData, PraiseLearningItem, ServiceRecord } from '../types';
import { DEFAULT_WORKERS_LIST } from '../constants';
import { normalizeServiceDescription, parseLocalDate, toLocalDateString } from './dateUtils';

export const normalizeHistoryRecords = (records: ServiceRecord[]): ServiceRecord[] => {
  return records.map((r) => {
    const cleanDate = toLocalDateString(r.date);
    return {
      ...r,
      date: cleanDate,
      description: normalizeServiceDescription(cleanDate, r.description),
    };
  });
};

const toMillis = (iso?: string | null): number => {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
};

const recordContentMatches = (a: ServiceRecord, b: ServiceRecord): boolean => {
  return (
    a.date === b.date &&
    a.description === b.description &&
    JSON.stringify(a.songs) === JSON.stringify(b.songs) &&
    JSON.stringify(a.roles) === JSON.stringify(b.roles) &&
    JSON.stringify(a.attendance || {}) === JSON.stringify(b.attendance || {})
  );
};

const arraysEqual = <T,>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export interface MergeCloudResult {
  merged: AppData;
  changedFromLocal: boolean;
  shouldPushToCloud: boolean;
}

export const mergeAppData = (
  local: AppData,
  remote: Partial<AppData> | null | undefined,
  remoteUpdatedAt?: string | null
): MergeCloudResult => {
  const localDeleted = Array.isArray(local.deletedIds) ? local.deletedIds : [];
  const remoteDeleted = Array.isArray(remote?.deletedIds) ? remote.deletedIds : [];

  const mergedDeletedIds = Array.from(new Set([...localDeleted, ...remoteDeleted])).slice(0, 300);
  const deletedSet = new Set(mergedDeletedIds);

  const normalizedLocalHistory = normalizeHistoryRecords(local.history || []).filter(
    (r) => !deletedSet.has(r.id)
  );

  // Se ainda não há dados na nuvem, mantém exatamente o local e envia para a nuvem se houver dados
  if (!remote) {
    const hasMeaningfulLocalData =
      normalizedLocalHistory.length > 0 ||
      (local.customSongs?.length || 0) > 0 ||
      (local.learningList?.length || 0) > 0 ||
      mergedDeletedIds.length > 0 ||
      Boolean(local.pendingCloudSync);

    return {
      merged: {
        ...local,
        history: normalizedLocalHistory,
        deletedIds: mergedDeletedIds,
      },
      changedFromLocal: false,
      shouldPushToCloud: hasMeaningfulLocalData,
    };
  }

  const normalizedRemoteHistory = Array.isArray(remote.history)
    ? normalizeHistoryRecords(remote.history)
    : [];

  let shouldPushToCloud = Boolean(local.pendingCloudSync);

  // Se a nuvem ainda tem algum registro que foi excluído localmente, precisamos enviar a exclusão
  for (const r of normalizedRemoteHistory) {
    if (deletedSet.has(r.id)) {
      shouldPushToCloud = true;
      break;
    }
  }

  const localMap = new Map<string, ServiceRecord>();
  for (const item of normalizedLocalHistory) {
    localMap.set(item.id, item);
  }

  const remoteMap = new Map<string, ServiceRecord>();
  for (const item of normalizedRemoteHistory) {
    if (!deletedSet.has(item.id)) {
      remoteMap.set(item.id, item);
    }
  }

  const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);
  const mergedHistoryList: ServiceRecord[] = [];
  let historyDiffersFromLocal = false;

  for (const id of allIds) {
    const lItem = localMap.get(id);
    const rItem = remoteMap.get(id);

    if (lItem && !rItem) {
      // Relatório salvo localmente que ainda não foi para a nuvem: NUNCA apagar!
      mergedHistoryList.push(lItem);
      shouldPushToCloud = true;
    } else if (!lItem && rItem) {
      // Relatório vindo da nuvem (ex.: salvo em outro aparelho)
      mergedHistoryList.push(rItem);
      historyDiffersFromLocal = true;
    } else if (lItem && rItem) {
      const lTime = toMillis(lItem.updatedAt);
      const rTime = toMillis(rItem.updatedAt);

      if (lTime > rTime) {
        mergedHistoryList.push(lItem);
        if (!recordContentMatches(lItem, rItem)) {
          shouldPushToCloud = true;
        }
      } else if (rTime > lTime) {
        mergedHistoryList.push(rItem);
        if (!recordContentMatches(lItem, rItem)) {
          historyDiffersFromLocal = true;
        }
      } else if (recordContentMatches(lItem, rItem)) {
        mergedHistoryList.push(lItem);
      } else if (local.pendingCloudSync) {
        mergedHistoryList.push(lItem);
        shouldPushToCloud = true;
      } else {
        mergedHistoryList.push(rItem);
        historyDiffersFromLocal = true;
      }
    }
  }

  // Preserva ordenação por data decrescente (mais recentes no topo)
  mergedHistoryList.sort((a, b) => {
    const timeA = parseLocalDate(a.date)?.getTime() || 0;
    const timeB = parseLocalDate(b.date)?.getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    // Em datas iguais (ex.: DOM e EBD), mantém DOM antes ou ordem mais recentemente editada
    const updDiff = toMillis(b.updatedAt) - toMillis(a.updatedAt);
    if (updDiff !== 0) return updDiff;
    return (b.description || '').localeCompare(a.description || '');
  });

  // Merge learningList por música, mantendo updatedAt mais recente
  const localLearning = local.learningList || [];
  const remoteLearning = Array.isArray(remote.learningList) ? remote.learningList : [];
  const learningMap = new Map<string, PraiseLearningItem>();
  for (const item of remoteLearning) {
    learningMap.set(item.song, item);
  }
  for (const item of localLearning) {
    const existing = learningMap.get(item.song);
    if (!existing) {
      learningMap.set(item.song, item);
      shouldPushToCloud = true;
    } else if (toMillis(item.updatedAt) > toMillis(existing.updatedAt)) {
      learningMap.set(item.song, item);
      shouldPushToCloud = true;
    }
  }
  const mergedLearningList = Array.from(learningMap.values());

  const localMeta = local.metaUpdatedAt || {};
  const remoteMeta = remote.metaUpdatedAt || {};

  // Merge customSongs com carimbo independente
  const localCustomSongs = local.customSongs || [];
  const remoteCustomSongs = Array.isArray(remote.customSongs) ? remote.customSongs : [];
  const localSongsTs = localMeta.customSongs || 0;
  const remoteSongsTs = remoteMeta.customSongs || 0;
  let mergedCustomSongs = localCustomSongs;

  if (localSongsTs > remoteSongsTs) {
    mergedCustomSongs = localCustomSongs;
    if (!arraysEqual(localCustomSongs, remoteCustomSongs)) {
      shouldPushToCloud = true;
    }
  } else if (remoteSongsTs > localSongsTs) {
    mergedCustomSongs = remoteCustomSongs;
  } else {
    mergedCustomSongs = Array.from(new Set([...remoteCustomSongs, ...localCustomSongs]));
    if (localCustomSongs.some((s) => !remoteCustomSongs.includes(s))) {
      shouldPushToCloud = true;
    }
  }

  // Merge customWorkers com carimbo independente (salvar culto não sobrescreve obreiros adicionados em outro aparelho)
  const localWorkers = local.customWorkers || DEFAULT_WORKERS_LIST;
  const remoteWorkers = Array.isArray(remote.customWorkers) ? remote.customWorkers : [];
  const localWorkersTs = localMeta.customWorkers || 0;
  const remoteWorkersTs = remoteMeta.customWorkers || 0;
  let mergedWorkers = localWorkers;

  if (localWorkersTs > remoteWorkersTs) {
    mergedWorkers = localWorkers;
    if (!arraysEqual(localWorkers, remoteWorkers)) {
      shouldPushToCloud = true;
    }
  } else if (remoteWorkersTs > localWorkersTs && remoteWorkers.length > 0) {
    mergedWorkers = remoteWorkers;
  } else if (remoteWorkers.length > 0) {
    mergedWorkers = Array.from(new Set([...remoteWorkers, ...localWorkers]));
    if (localWorkers.some((w) => !remoteWorkers.includes(w))) {
      shouldPushToCloud = true;
    }
  }

  // Merge praiseCollection com carimbo independente
  const localCollection = local.praiseCollection || [];
  const remoteCollection = Array.isArray(remote.praiseCollection) ? remote.praiseCollection : [];
  const localCollectionTs = localMeta.praiseCollection || 0;
  const remoteCollectionTs = remoteMeta.praiseCollection || 0;
  let mergedCollection = localCollection;

  if (localCollectionTs > remoteCollectionTs) {
    mergedCollection = localCollection;
    if (!arraysEqual(localCollection, remoteCollection)) {
      shouldPushToCloud = true;
    }
  } else if (remoteCollectionTs > localCollectionTs && remoteCollection.length > 0) {
    mergedCollection = remoteCollection;
  } else if (remoteCollection.length > 0) {
    const extraLocalSongs = localCollection.filter((s) => !remoteCollection.includes(s));
    if (extraLocalSongs.length > 0) {
      mergedCollection = [...remoteCollection, ...extraLocalSongs].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      shouldPushToCloud = true;
    } else {
      mergedCollection = remoteCollection;
    }
  }

  // Merge churchName com carimbo independente
  const normalizeChurchName = (name?: string) => {
    if (!name || name === 'Clique aqui para nomear sua igreja') return 'Clique aqui';
    return name;
  };
  const localChurch = normalizeChurchName(local.churchName);
  const remoteChurch = normalizeChurchName(remote.churchName);
  const localChurchTs = localMeta.churchName || 0;
  const remoteChurchTs = remoteMeta.churchName || 0;
  let mergedChurch = localChurch;

  if (localChurchTs > remoteChurchTs && localChurch !== 'Clique aqui') {
    mergedChurch = localChurch;
    if (localChurch !== remoteChurch) shouldPushToCloud = true;
  } else if (remoteChurchTs > localChurchTs && remote.churchName) {
    mergedChurch = remoteChurch;
  } else if (remote.churchName && remoteChurch !== 'Clique aqui' && localChurch === 'Clique aqui') {
    mergedChurch = remoteChurch;
  } else if (remote.churchName && !localChurchTs) {
    mergedChurch = remoteChurch;
  }

  const mergedMetaUpdatedAt = {
    churchName: Math.max(localChurchTs, remoteChurchTs),
    customSongs: Math.max(localSongsTs, remoteSongsTs),
    customWorkers: Math.max(localWorkersTs, remoteWorkersTs),
    praiseCollection: Math.max(localCollectionTs, remoteCollectionTs),
  };

  const changedFromLocal =
    historyDiffersFromLocal ||
    mergedHistoryList.length !== (local.history || []).length ||
    !arraysEqual(
      mergedLearningList.map((i) => `${i.song}:${i.status}:${i.updatedAt}`),
      localLearning.map((i) => `${i.song}:${i.status}:${i.updatedAt}`)
    ) ||
    !arraysEqual(mergedCustomSongs, localCustomSongs) ||
    !arraysEqual(mergedWorkers, localWorkers) ||
    !arraysEqual(mergedCollection, localCollection) ||
    mergedChurch !== localChurch ||
    !arraysEqual(mergedDeletedIds, localDeleted);

  return {
    merged: {
      history: mergedHistoryList,
      churchName: mergedChurch,
      customSongs: mergedCustomSongs,
      customWorkers: mergedWorkers,
      draft: local.draft, // Nunca sobrescrever o rascunho em preenchimento
      learningList: mergedLearningList,
      praiseCollection: mergedCollection,
      deletedIds: mergedDeletedIds,
      metaUpdatedAt: mergedMetaUpdatedAt,
      localUpdatedAt: changedFromLocal ? Date.now() : (local.localUpdatedAt || Date.now()),
      lastSyncedCloudAt: remoteUpdatedAt ?? local.lastSyncedCloudAt ?? null,
      pendingCloudSync: shouldPushToCloud,
    },
    changedFromLocal,
    shouldPushToCloud,
  };
};
