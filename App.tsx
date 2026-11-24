
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { INITIAL_PRAISE_LIST, DEFAULT_WORKERS_LIST } from './constants';
import { AppData, ServiceRecord, SongStats, ServiceDraft, PraiseLearningItem } from './types';
import ServiceForm from './components/ServiceForm';
import HistoryList from './components/HistoryList';
import RankingList from './components/RankingList';
import { RepetitionChart } from './components/RepetitionChart';
import BackupRestore from './components/BackupRestore';
import UnplayedList from './components/UnplayedList';
import WorkerStats from './components/WorkerStats';
import WorkerRanking from './components/WorkerRanking';
import PraiseLearningList from './components/PraiseLearningList';
import WorkerManager from './components/WorkerManager';
import CollectionsManager from './components/CollectionsManager';
import AttendanceAnalytics from './components/AttendanceAnalytics';
import AuthForm from './components/AuthForm';
import { initDB, saveData, loadData, getImmediateCachedData } from './db';
import { supabase } from './supabase';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineBanner } from './components/OfflineBanner';
import { isGroupHeaderOrMarker } from './utils/praiseCategories';
import { parseLocalDate, toLocalDateString, normalizeServiceDescription } from './utils/dateUtils';
import { mergeAppData, normalizeHistoryRecords } from './utils/syncMerge';

const computePersistentSignature = (data: {
  history: ServiceRecord[];
  churchName?: string;
  customSongs?: string[];
  customWorkers?: string[];
  learningList?: PraiseLearningItem[];
  praiseCollection?: string[];
  deletedIds?: string[];
}) =>
  JSON.stringify({
    history: data.history,
    churchName: data.churchName || '',
    customSongs: data.customSongs || [],
    customWorkers: data.customWorkers || [],
    learningList: data.learningList || [],
    praiseCollection: data.praiseCollection || [],
    deletedIds: data.deletedIds || [],
  });

const getTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getSpecialServiceInfo = (dateString: string) => {
  const d = parseLocalDate(dateString);
  if (!d) return null;
  const day = d.getDay();
  if (day === 1) return { name: 'Glorificação', color: 'text-indigo-400' };
  if (day === 3) return { name: 'Senhoras', color: 'text-rose-400' };
  if (day === 4) return { name: 'Oração', color: 'text-amber-400' };
  return null;
};

const App: React.FC = () => {
  // 1. CARREGAMENTO INSTANTÂNEO DIRETO DO DISCO DO CELULAR (0ms de espera)
  const cachedInitial = getImmediateCachedData();

  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'attendance' | 'unplayed' | 'learning' | 'praise-ranking' | 'repetition' | 'workers' | 'suggestions' | 'manage-workers' | 'collections' | 'settings'>('new');
  const [history, setHistory] = useState<ServiceRecord[]>(() => normalizeHistoryRecords(cachedInitial?.history || []));
  const [churchName, setChurchName] = useState<string>(() => {
    const cached = cachedInitial?.churchName;
    if (!cached || cached === 'Clique aqui para nomear sua igreja') {
      return 'Clique aqui';
    }
    return cached;
  });
  const [isEditingChurchName, setIsEditingChurchName] = useState(false);
  const [customSongs, setCustomSongs] = useState<string[]>(() => cachedInitial?.customSongs || []);
  const [praiseCollection, setPraiseCollection] = useState<string[]>(() => {
    if (cachedInitial?.praiseCollection && cachedInitial.praiseCollection.length > 0) {
      return cachedInitial.praiseCollection;
    }
    return [...new Set([...INITIAL_PRAISE_LIST, ...(cachedInitial?.customSongs || [])])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  });
  const [customWorkers, setCustomWorkers] = useState<string[]>(() => cachedInitial?.customWorkers || DEFAULT_WORKERS_LIST);
  const [learningList, setLearningList] = useState<PraiseLearningItem[]>(() => cachedInitial?.learningList || []);
  const [deletedIds, setDeletedIds] = useState<string[]>(() => cachedInitial?.deletedIds || []);
  const [pendingCloudSync, setPendingCloudSync] = useState<boolean>(() => Boolean(cachedInitial?.pendingCloudSync));

  // Se já temos registros salvos na memória do celular, o app abre IMEDIATAMENTE!
  const [isLoading, setIsLoading] = useState(() => !cachedInitial || !Array.isArray(cachedInitial.history));
  const [loadingStatus] = useState('Abrindo aplicativo...');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local' | 'error'>('local');

  const [hasCheckedCloud, setHasCheckedCloud] = useState(false);
  const lastCloudUpdateRef = useRef<string | null>(cachedInitial?.lastSyncedCloudAt ?? null);
  const syncTimeoutRef = useRef<number | null>(null);
  const userRef = useRef<any>(null);
  const isOfflineRef = useRef<boolean>(!navigator.onLine);
  const isSyncingRef = useRef<boolean>(false);
  const queuedSyncRef = useRef<boolean>(false);
  const hasCheckedCloudRef = useRef<boolean>(false);
  const applyingExternalUpdateRef = useRef<boolean>(false);

  const todaySpecial = useMemo(() => getSpecialServiceInfo(getTodayDate()), []);

  const emptyRoles = { gate: '', praise: '', word: '', scripture: '' };

  const [draft, setDraft] = useState<ServiceDraft>(() => {
    const today = getTodayDate();
    if (cachedInitial?.draft) {
      return {
        ...cachedInitial.draft,
        date: today,
        description: normalizeServiceDescription(today, cachedInitial.draft.description),
      };
    }
    return {
      date: today,
      description: normalizeServiceDescription(today, ''),
      songs: [],
      roles: { ...emptyRoles },
      attendance: {}
    };
  });

  const latestDataRef = useRef<AppData>({
    history: normalizeHistoryRecords(cachedInitial?.history || []),
    churchName:
      !cachedInitial?.churchName || cachedInitial.churchName === 'Clique aqui para nomear sua igreja'
        ? 'Clique aqui'
        : cachedInitial.churchName,
    customSongs: cachedInitial?.customSongs || [],
    customWorkers: cachedInitial?.customWorkers || DEFAULT_WORKERS_LIST,
    draft,
    learningList: cachedInitial?.learningList || [],
    praiseCollection:
      cachedInitial?.praiseCollection && cachedInitial.praiseCollection.length > 0
        ? cachedInitial.praiseCollection
        : [...new Set([...INITIAL_PRAISE_LIST, ...(cachedInitial?.customSongs || [])])].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          ),
    deletedIds: cachedInitial?.deletedIds || [],
    metaUpdatedAt: cachedInitial?.metaUpdatedAt || {},
    localUpdatedAt: cachedInitial?.localUpdatedAt || Date.now(),
    lastSyncedCloudAt: cachedInitial?.lastSyncedCloudAt ?? null,
    pendingCloudSync: Boolean(cachedInitial?.pendingCloudSync),
  });

  const lastLocalCloudSignatureRef = useRef<string>(computePersistentSignature(latestDataRef.current));
  const lastWakeSyncAtRef = useRef<number>(0);

  const syncWithCloud = useCallback(async (): Promise<boolean> => {
    const currentUser = userRef.current;
    if (!currentUser || isOfflineRef.current) {
      setSyncStatus('local');
      return false;
    }

    if (isSyncingRef.current) {
      queuedSyncRef.current = true;
      return false;
    }

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const MAX_CONCURRENCY_RETRIES = 3;

      for (let attempt = 0; attempt < MAX_CONCURRENCY_RETRIES; attempt++) {
        const pullTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao consultar nuvem')), 8000)
        );

        const queryPromise = supabase
          .from('user_data')
          .select('json_data, updated_at')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        const { data, error }: any = await Promise.race([queryPromise, pullTimeoutPromise]);
        if (error) throw error;

        // Lê sempre o snapshot local mais recente (inclusive edições feitas durante a consulta)
        const freshLocal: AppData = { ...latestDataRef.current };
        const remoteJson = data?.json_data || null;
        const remoteUpdatedAt: string | null = data?.updated_at || null;

        const mergeResult = mergeAppData(freshLocal, remoteJson, remoteUpdatedAt);

        if (mergeResult.changedFromLocal) {
          applyingExternalUpdateRef.current = true;
          latestDataRef.current = mergeResult.merged;
          lastLocalCloudSignatureRef.current = computePersistentSignature(mergeResult.merged);

          setHistory(mergeResult.merged.history);
          if (mergeResult.merged.churchName) setChurchName(mergeResult.merged.churchName);
          setCustomSongs(mergeResult.merged.customSongs || []);
          setCustomWorkers(mergeResult.merged.customWorkers || DEFAULT_WORKERS_LIST);
          setLearningList(mergeResult.merged.learningList || []);
          setPraiseCollection(mergeResult.merged.praiseCollection || []);
          setDeletedIds(mergeResult.merged.deletedIds || []);

          await saveData(mergeResult.merged);
        }

        if (!mergeResult.shouldPushToCloud) {
          if (remoteUpdatedAt) {
            lastCloudUpdateRef.current = remoteUpdatedAt;
          }
          if (latestDataRef.current.pendingCloudSync) {
            latestDataRef.current = {
              ...latestDataRef.current,
              lastSyncedCloudAt: remoteUpdatedAt ?? latestDataRef.current.lastSyncedCloudAt ?? null,
              pendingCloudSync: false,
            };
            setPendingCloudSync(false);
            await saveData(latestDataRef.current);
          }
          setSyncStatus('synced');
          break;
        }

        const pushTimestamp = new Date().toISOString();
        const pushMutationTs = mergeResult.merged.localUpdatedAt;
        const pushPayload = {
          history: mergeResult.merged.history,
          churchName: mergeResult.merged.churchName,
          customSongs: mergeResult.merged.customSongs,
          customWorkers: mergeResult.merged.customWorkers,
          learningList: mergeResult.merged.learningList,
          praiseCollection: mergeResult.merged.praiseCollection,
          deletedIds: mergeResult.merged.deletedIds || [],
          metaUpdatedAt: mergeResult.merged.metaUpdatedAt || {},
        };

        const pushTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao enviar para nuvem')), 12000)
        );

        let writeSucceeded = false;

        if (remoteUpdatedAt) {
          // Controle de concorrência otimista: só atualiza se nenhum outro aparelho alterou a nuvem no meio tempo
          const updatePromise = supabase
            .from('user_data')
            .update({ json_data: pushPayload, updated_at: pushTimestamp })
            .eq('user_id', currentUser.id)
            .eq('updated_at', remoteUpdatedAt)
            .select('updated_at');

          const { data: updatedRows, error: pushError }: any = await Promise.race([updatePromise, pushTimeoutPromise]);
          if (pushError) throw pushError;

          if (Array.isArray(updatedRows) && updatedRows.length > 0) {
            writeSucceeded = true;
            lastCloudUpdateRef.current = updatedRows[0]?.updated_at || pushTimestamp;
          } else if (attempt === MAX_CONCURRENCY_RETRIES - 1) {
            // Fallback seguro na última tentativa após re-mesclagem
            const upsertPromise = supabase
              .from('user_data')
              .upsert(
                { user_id: currentUser.id, json_data: pushPayload, updated_at: pushTimestamp },
                { onConflict: 'user_id' }
              );
            const { error: upsertErr }: any = await Promise.race([upsertPromise, pushTimeoutPromise]);
            if (upsertErr) throw upsertErr;
            writeSucceeded = true;
            lastCloudUpdateRef.current = pushTimestamp;
          }
        } else {
          // Primeira gravação da conta na nuvem
          const insertPromise = supabase
            .from('user_data')
            .insert({ user_id: currentUser.id, json_data: pushPayload, updated_at: pushTimestamp });

          const { error: insertError }: any = await Promise.race([insertPromise, pushTimeoutPromise]);
          if (!insertError) {
            writeSucceeded = true;
            lastCloudUpdateRef.current = pushTimestamp;
          } else if (insertError.code === '23505') {
            // Outro aparelho criou a linha exatamente no mesmo instante -> re-buscar e mesclar
            writeSucceeded = false;
          } else {
            throw insertError;
          }
        }

        if (writeSucceeded) {
          if (latestDataRef.current.localUpdatedAt === pushMutationTs) {
            latestDataRef.current = {
              ...latestDataRef.current,
              lastSyncedCloudAt: lastCloudUpdateRef.current,
              pendingCloudSync: false,
            };
            setPendingCloudSync(false);
            await saveData(latestDataRef.current);
            setSyncStatus('synced');
          } else {
            queuedSyncRef.current = true;
          }
          break;
        }

        // Outro aparelho atualizou a nuvem durante o envio: aguarda brevemente e refaz pull + merge
        await new Promise((r) => setTimeout(r, 250));
      }

      hasCheckedCloudRef.current = true;
      lastWakeSyncAtRef.current = Date.now();
      setHasCheckedCloud(true);
      return true;
    } catch (e) {
      console.warn('Sem conexão estável com a nuvem no momento. Dados preservados localmente.', e);
      setSyncStatus(latestDataRef.current.pendingCloudSync ? 'error' : 'local');
      return false;
    } finally {
      isSyncingRef.current = false;
      if (queuedSyncRef.current && userRef.current && !isOfflineRef.current) {
        queuedSyncRef.current = false;
        void syncWithCloud();
      }
    }
  }, []);

  const commitPersistentMutation = useCallback(
    (nextPartial: Partial<AppData>, immediateSync = true) => {
      const nextSnapshot: AppData = {
        ...latestDataRef.current,
        ...nextPartial,
        localUpdatedAt: Date.now(),
        pendingCloudSync: true,
      };
      latestDataRef.current = nextSnapshot;
      lastLocalCloudSignatureRef.current = computePersistentSignature(nextSnapshot);
      setPendingCloudSync(true);

      // Grava imediatamente no localStorage (síncrono) e no IndexedDB
      void saveData(nextSnapshot);

      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      if (immediateSync && userRef.current && !isOfflineRef.current) {
        void syncWithCloud();
      } else if (!userRef.current || isOfflineRef.current) {
        setSyncStatus('local');
      }
    },
    [syncWithCloud]
  );

  useEffect(() => {
    const handleOnline = () => {
      isOfflineRef.current = false;
      setIsOffline(false);
      if (userRef.current && (latestDataRef.current.pendingCloudSync || !hasCheckedCloudRef.current)) {
        void syncWithCloud();
      }
    };
    const handleOffline = () => {
      isOfflineRef.current = true;
      setIsOffline(true);
      setSyncStatus('local');
    };
    const handleFlushBeforeHide = () => {
      // Garante persistência local síncrona ao minimizar/fechar o app no celular
      latestDataRef.current = {
        ...latestDataRef.current,
        localUpdatedAt: Date.now(),
      };
      void saveData(latestDataRef.current);

      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
        if (userRef.current && !isOfflineRef.current) {
          void syncWithCloud();
        }
      } else if (latestDataRef.current.pendingCloudSync && userRef.current && !isOfflineRef.current) {
        void syncWithCloud();
      }
    };
    const handleWakeSync = () => {
      if (!userRef.current || isOfflineRef.current) return;
      const now = Date.now();
      if (now - lastWakeSyncAtRef.current < 4000) return;
      lastWakeSyncAtRef.current = now;
      void syncWithCloud();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlushBeforeHide();
      } else if (document.visibilityState === 'visible') {
        handleWakeSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handleFlushBeforeHide);
    window.addEventListener('focus', handleWakeSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Recupera sessão com segurança sem quebrar se o token estiver expirado
    supabase.auth
      .getSession()
      .then((res) => {
        if (res.error) {
          if (res.error.message?.includes('Refresh Token') || res.error.message?.includes('refresh_token')) {
            supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
          userRef.current = null;
          setUser(null);
          return;
        }
        const sessionUser = res.data?.session?.user ?? null;
        userRef.current = sessionUser;
        setUser(sessionUser);
      })
      .catch((err) => {
        if (err?.message?.includes('Refresh Token')) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        userRef.current = null;
        setUser(null);
      });

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      userRef.current = newUser;
      setUser(newUser);
      if (!newUser) {
        hasCheckedCloudRef.current = false;
        setHasCheckedCloud(false);
        setSyncStatus('local');
        lastCloudUpdateRef.current = null;
      } else {
        setShowAuthModal(false);
      }
    });

    const setup = async () => {
      try {
        await initDB();
        const data = await loadData();

        if (data) {
          const loadedTs = data.localUpdatedAt || 0;
          const currentTs = latestDataRef.current.localUpdatedAt || 0;

          // Só aplica dados do IndexedDB se não forem mais antigos que edições já feitas nesta sessão
          if (!cachedInitial || loadedTs >= currentTs) {
            applyingExternalUpdateRef.current = true;
            const normalizedHistory = Array.isArray(data.history)
              ? normalizeHistoryRecords(data.history)
              : latestDataRef.current.history;
            const normalizedChurch =
              !data.churchName || data.churchName === 'Clique aqui para nomear sua igreja'
                ? 'Clique aqui'
                : data.churchName;
            const loadedCustomSongs = data.customSongs ?? latestDataRef.current.customSongs;
            const loadedWorkers = data.customWorkers ?? latestDataRef.current.customWorkers;
            const loadedLearning = data.learningList ?? latestDataRef.current.learningList;
            const loadedCollection =
              data.praiseCollection && data.praiseCollection.length > 0
                ? data.praiseCollection
                : latestDataRef.current.praiseCollection;
            const loadedDeletedIds = data.deletedIds ?? latestDataRef.current.deletedIds ?? [];
            const loadedPending = Boolean(data.pendingCloudSync);
            const loadedLastSynced = data.lastSyncedCloudAt ?? lastCloudUpdateRef.current;

            const today = getTodayDate();
            const normalizedDraft = data.draft
              ? {
                  ...data.draft,
                  date: today,
                  description: normalizeServiceDescription(today, data.draft.description),
                }
              : latestDataRef.current.draft;

            latestDataRef.current = {
              history: normalizedHistory,
              churchName: normalizedChurch,
              customSongs: loadedCustomSongs,
              customWorkers: loadedWorkers,
              draft: normalizedDraft,
              learningList: loadedLearning,
              praiseCollection: loadedCollection,
              deletedIds: loadedDeletedIds,
              metaUpdatedAt: data.metaUpdatedAt ?? latestDataRef.current.metaUpdatedAt ?? {},
              localUpdatedAt: data.localUpdatedAt || currentTs || Date.now(),
              lastSyncedCloudAt: loadedLastSynced,
              pendingCloudSync: loadedPending,
            };
            lastLocalCloudSignatureRef.current = computePersistentSignature(latestDataRef.current);
            if (loadedLastSynced) lastCloudUpdateRef.current = loadedLastSynced;

            setHistory(normalizedHistory);
            setChurchName(normalizedChurch);
            if (loadedCustomSongs) setCustomSongs(loadedCustomSongs);
            if (loadedWorkers) setCustomWorkers(loadedWorkers);
            if (loadedLearning) setLearningList(loadedLearning);
            if (loadedCollection) setPraiseCollection(loadedCollection);
            setDeletedIds(loadedDeletedIds);
            setPendingCloudSync(loadedPending);
            if (normalizedDraft) setDraft(normalizedDraft);
          }
        }
      } catch (e) {
        console.warn('Aviso ao carregar DB local:', e);
      } finally {
        setIsLoading(false);
      }
    };
    setup();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handleFlushBeforeHide);
      window.removeEventListener('focus', handleWakeSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      authSub.unsubscribe();
    };
  }, [syncWithCloud]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`db-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new && payload.new.updated_at !== lastCloudUpdateRef.current) {
            void syncWithCloud();
          }
        }
      )
      .subscribe();

    // Sincronização periódica silenciosa (45s) enquanto aberto para garantir atualização entre múltiplos celulares
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !isOfflineRef.current) {
        void syncWithCloud();
      }
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [user, syncWithCloud]);

  useEffect(() => {
    if (user && !isLoading && !hasCheckedCloud && !isOffline) {
      void syncWithCloud();
    }
  }, [user, isLoading, hasCheckedCloud, isOffline, syncWithCloud]);

  // Efeito dedicado APENAS ao rascunho em preenchimento (não dispara upload na nuvem a cada tecla)
  useEffect(() => {
    if (isLoading) return;
    latestDataRef.current = {
      ...latestDataRef.current,
      draft,
      localUpdatedAt: Date.now(),
    };
    void saveData(latestDataRef.current);
  }, [draft, isLoading]);

  // Efeito secundário para mudanças vindas de setters diretos (ex.: nome da igreja, aprendizado, obreiros, coletânea)
  useEffect(() => {
    if (isLoading) return;

    const prevSnapshot = latestDataRef.current;
    const nowMs = Date.now();
    const nextMetaUpdatedAt = { ...(prevSnapshot.metaUpdatedAt || {}) };

    if (!applyingExternalUpdateRef.current) {
      if (prevSnapshot.churchName !== churchName) nextMetaUpdatedAt.churchName = nowMs;
      if (JSON.stringify(prevSnapshot.customSongs || []) !== JSON.stringify(customSongs)) {
        nextMetaUpdatedAt.customSongs = nowMs;
      }
      if (JSON.stringify(prevSnapshot.customWorkers || []) !== JSON.stringify(customWorkers)) {
        nextMetaUpdatedAt.customWorkers = nowMs;
      }
      if (JSON.stringify(prevSnapshot.praiseCollection || []) !== JSON.stringify(praiseCollection)) {
        nextMetaUpdatedAt.praiseCollection = nowMs;
      }
    }

    const currentSnapshot: AppData = {
      ...prevSnapshot,
      history,
      churchName,
      customSongs,
      customWorkers,
      learningList,
      praiseCollection,
      deletedIds,
      metaUpdatedAt: nextMetaUpdatedAt,
    };

    const sig = computePersistentSignature(currentSnapshot);
    latestDataRef.current = currentSnapshot;

    if (sig === lastLocalCloudSignatureRef.current) {
      applyingExternalUpdateRef.current = false;
      return;
    }

    lastLocalCloudSignatureRef.current = sig;

    if (applyingExternalUpdateRef.current) {
      applyingExternalUpdateRef.current = false;
      return;
    }

    const updatedSnapshot: AppData = {
      ...currentSnapshot,
      localUpdatedAt: nowMs,
      pendingCloudSync: true,
    };
    latestDataRef.current = updatedSnapshot;
    setPendingCloudSync(true);
    void saveData(updatedSnapshot);

    if (userRef.current && !isOfflineRef.current) {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      setSyncStatus('syncing');
      syncTimeoutRef.current = window.setTimeout(() => {
        syncTimeoutRef.current = null;
        void syncWithCloud();
      }, 1000);
    } else {
      setSyncStatus('local');
    }
  }, [history, churchName, customSongs, customWorkers, learningList, praiseCollection, deletedIds, isLoading, syncWithCloud]);

  const fullSongList = useMemo(() => {
    if (praiseCollection && praiseCollection.length > 0) return praiseCollection;
    return [...new Set([...INITIAL_PRAISE_LIST, ...customSongs])].sort((a, b) => a.localeCompare(b));
  }, [customSongs, praiseCollection]);

  const onRenameSongInHistory = (oldName: string, newName: string) => {
    const nowIso = new Date().toISOString();
    const nextHistory = latestDataRef.current.history.map((record) => {
      if (!record.songs.includes(oldName)) return record;
      return {
        ...record,
        songs: record.songs.map((s) => (s === oldName ? newName : s)),
        updatedAt: nowIso,
      };
    });
    setHistory(nextHistory);
    commitPersistentMutation({ history: nextHistory }, true);
  };

  const songStats = useMemo(() => {
    const stats: Record<string, SongStats> = {};
    history.forEach(record => {
      record.songs.forEach(song => {
        if (isGroupHeaderOrMarker(song)) return;
        if (!stats[song]) stats[song] = { song, count: 0, lastDate: null, history: [] };
        stats[song].count++;
        stats[song].history.push(record.date);
      });
    });
    Object.keys(stats).forEach(s => {
      stats[s].history.sort((a, b) => b.localeCompare(a));
      stats[s].lastDate = stats[s].history[0];
    });
    return stats;
  }, [history]);

  const saveRecord = (data: Omit<ServiceRecord, 'id'>) => {
    const cleanDate = toLocalDateString(data.date);
    const nowIso = new Date().toISOString();
    const normalizedRecord: Omit<ServiceRecord, 'id'> = {
      ...data,
      date: cleanDate,
      description: normalizeServiceDescription(cleanDate, data.description),
      updatedAt: nowIso,
    };

    let nextHistory: ServiceRecord[];
    let nextDeletedIds = latestDataRef.current.deletedIds || [];

    if (editingId) {
      nextHistory = latestDataRef.current.history.map((r) =>
        r.id === editingId ? { ...normalizedRecord, id: editingId } : r
      );
      setEditingId(null);
    } else {
      const newId = crypto.randomUUID();
      nextHistory = [{ ...normalizedRecord, id: newId }, ...latestDataRef.current.history];
      if (nextDeletedIds.includes(newId)) {
        nextDeletedIds = nextDeletedIds.filter((d) => d !== newId);
      }
    }

    const today = getTodayDate();
    const freshDraft: ServiceDraft = {
      date: today,
      description: normalizeServiceDescription(today, ''),
      songs: [],
      roles: { ...emptyRoles },
      attendance: {},
    };

    setHistory(nextHistory);
    setDeletedIds(nextDeletedIds);
    setDraft(freshDraft);

    // Salva imediatamente no aparelho e inicia envio imediato para a nuvem (sem esperar debounce de 2s)
    commitPersistentMutation(
      {
        history: nextHistory,
        deletedIds: nextDeletedIds,
        draft: freshDraft,
      },
      true
    );
  };

  const handleDeleteRecord = (id: string) => {
    const nextHistory = latestDataRef.current.history.filter((r) => r.id !== id);
    const nextDeletedIds = [id, ...(latestDataRef.current.deletedIds || []).filter((d) => d !== id)].slice(0, 300);
    setHistory(nextHistory);
    setDeletedIds(nextDeletedIds);
    commitPersistentMutation(
      {
        history: nextHistory,
        deletedIds: nextDeletedIds,
      },
      true
    );
  };

  const handleUpdateHistory = (newHistory: ServiceRecord[]) => {
    const nowIso = new Date().toISOString();
    const prevMap = new Map<string, ServiceRecord>(
      latestDataRef.current.history.map((r): [string, ServiceRecord] => [r.id, r])
    );
    const normalized = normalizeHistoryRecords(newHistory).map((r) => {
      const prev = prevMap.get(r.id);
      const changed =
        !prev ||
        prev.date !== r.date ||
        prev.description !== r.description ||
        JSON.stringify(prev.attendance || {}) !== JSON.stringify(r.attendance || {}) ||
        JSON.stringify(prev.songs) !== JSON.stringify(r.songs) ||
        JSON.stringify(prev.roles) !== JSON.stringify(r.roles);
      return changed ? { ...r, updatedAt: nowIso } : r;
    });
    setHistory(normalized);
    commitPersistentMutation({ history: normalized }, true);
  };

  const handleRestoreBackup = (
    restoredHistory: ServiceRecord[],
    restoredCustomSongs: string[],
    restoredLearningList: PraiseLearningItem[],
    restoredPraiseCollection: string[]
  ) => {
    const nowIso = new Date().toISOString();
    const normalized = normalizeHistoryRecords(restoredHistory).map((r) => ({
      ...r,
      updatedAt: nowIso,
    }));
    const restoredIds = new Set(normalized.map((r) => r.id));
    const removedIds = latestDataRef.current.history.filter((r) => !restoredIds.has(r.id)).map((r) => r.id);
    const nextDeletedIds = Array.from(
      new Set([
        ...removedIds,
        ...(latestDataRef.current.deletedIds || []).filter((d) => !restoredIds.has(d)),
      ])
    ).slice(0, 300);

    setHistory(normalized);
    setCustomSongs(restoredCustomSongs);
    setLearningList(restoredLearningList || []);
    setPraiseCollection(restoredPraiseCollection || []);
    setDeletedIds(nextDeletedIds);

    const nowMs = Date.now();
    commitPersistentMutation(
      {
        history: normalized,
        customSongs: restoredCustomSongs,
        learningList: restoredLearningList || [],
        praiseCollection: restoredPraiseCollection || [],
        deletedIds: nextDeletedIds,
        metaUpdatedAt: {
          ...(latestDataRef.current.metaUpdatedAt || {}),
          customSongs: nowMs,
          praiseCollection: nowMs,
        },
      },
      true
    );
  };

  const handleGuaranteeLocalSave = async (): Promise<boolean> => {
    try {
      const snapshot: AppData = {
        ...latestDataRef.current,
        localUpdatedAt: Date.now(),
      };
      latestDataRef.current = snapshot;
      await saveData(snapshot);
      return true;
    } catch {
      return false;
    }
  };

  const handleRegisterGap = (date: string, type: 'missing_service' | 'missing_ebd' | 'missing_dom') => {
    setEditingId(null);
    const cleanDate = toLocalDateString(date);
    let initialDescription = '';
    if (type === 'missing_ebd') initialDescription = 'EBD';
    else if (type === 'missing_dom') initialDescription = 'DOM';
    else initialDescription = normalizeServiceDescription(cleanDate, '');
    
    setDraft({
      date: cleanDate,
      description: initialDescription,
      songs: [],
      roles: { ...emptyRoles },
      attendance: {}
    });
    setActiveTab('new');
  };

  const menuItems = [
    { id: 'new', icon: 'add_circle', label: 'Novo Culto' },
    { id: 'history', icon: 'history', label: 'Histórico' },
    { id: 'attendance', icon: 'groups', label: 'Frequência' },
    { id: 'unplayed', icon: 'assignment_late', label: 'Hinos Restantes' },
    { id: 'learning', icon: 'school', label: 'Aprendizado' },
    { id: 'praise-ranking', icon: 'trending_up', label: 'Ranking Hinos' },
    { id: 'repetition', icon: 'insights', label: 'Taxa de Repetição' },
    { id: 'collections', icon: 'library_books', label: 'Coletâneas' },
    { id: 'workers', icon: 'emoji_events', label: 'Ranking Obreiros' },
    { id: 'suggestions', icon: 'assignment_ind', label: 'Sugestão Escala' },
    { id: 'manage-workers', icon: 'person_add', label: 'Gerenciar Obreiros' },
    { id: 'settings', icon: 'settings', label: 'Backup / Nuvem' },
  ] as const;

  const handleTabChange = (id: typeof activeTab) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  const AppBrand = () => {
    const isLocalSafe = syncStatus === 'local' || isOffline;
    const hasPendingUpload = Boolean(user && pendingCloudSync && syncStatus !== 'syncing');
    const statusIcon =
      syncStatus === 'syncing'
        ? 'sync'
        : hasPendingUpload
        ? 'cloud_upload'
        : syncStatus === 'synced'
        ? 'cloud_done'
        : isLocalSafe
        ? 'verified'
        : 'cloud_off';
    const statusColor =
      syncStatus === 'syncing'
        ? 'text-amber-400 animate-spin'
        : hasPendingUpload
        ? 'text-amber-400'
        : syncStatus === 'synced'
        ? 'text-emerald-400'
        : isLocalSafe
        ? 'text-emerald-400'
        : 'text-rose-500';
    const statusText =
      syncStatus === 'syncing'
        ? 'Sincronizando...'
        : hasPendingUpload
        ? 'Salvo Local • Envio Pendente'
        : syncStatus === 'synced'
        ? 'Nuvem Conectada'
        : isLocalSafe
        ? '100% Salvo no Aparelho'
        : 'Erro Conexão';

    return (
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-2xl shadow-lg shadow-indigo-900/40 flex items-center justify-center p-1 border border-white/10 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="material-icons text-white text-xl sm:text-2xl drop-shadow-md">assignment</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          {isEditingChurchName ? (
            <input 
              autoFocus
              className="bg-white/10 border-b border-white/30 text-white font-black text-base sm:text-lg outline-none w-full uppercase"
              value={churchName}
              placeholder="Nome da Igreja"
              onChange={(e) => setChurchName(e.target.value)}
              onBlur={() => setIsEditingChurchName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingChurchName(false)}
            />
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer min-w-0" onClick={() => setIsEditingChurchName(true)} title="Clique para nomear sua igreja">
              <h1 className="text-white font-black text-base sm:text-lg tracking-tight leading-tight uppercase truncate">
                {churchName}
              </h1>
              <span className="material-icons text-white/30 text-xs group-hover:text-white/70 transition-colors shrink-0">edit</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
             <div className="flex items-center gap-1 shrink-0">
               <span className={`material-icons text-[12px] ${statusColor}`}>{statusIcon}</span>
               <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{statusText}</span>
             </div>
             <div className="h-3 w-px bg-white/10 mx-0.5 shrink-0"></div>
             <div className="flex items-center gap-1 shrink-0">
               <span className="material-icons text-[12px] text-amber-400">description</span>
               <span className="text-amber-400 font-black text-[9px] uppercase tracking-widest">{history.length} Cultos</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const UserHeader = () => (
    <div className="p-8 border-b border-white/5 bg-white/5">
      {user ? (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-icons text-white">person</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Conta Ativa</span>
            <span className="text-white font-black text-xs uppercase truncate leading-none">{user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="mt-2 self-start text-[8px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300">Sair da Conta</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowAuthModal(true)}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
        >
          <span className="material-icons text-sm">login</span>
          Entrar p/ Sincronizar
        </button>
      )}
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white p-10 animate-fadeIn relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="relative mb-12 flex flex-col items-center">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.35)] flex items-center justify-center p-4 relative z-10 animate-pulse border border-white/10">
          <span className="material-icons text-white text-5xl">assignment</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 max-w-xs w-full relative z-10">
        <div className="text-center">
          <h2 className="font-black tracking-[0.3em] text-[10px] uppercase text-slate-400 mb-1">{churchName}</h2>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Gestão Eclesiástica</p>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 w-1/2 rounded-full animate-loading-bar shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
        </div>
        <p className="font-black tracking-[0.15em] text-[9px] uppercase text-indigo-400/80 animate-pulse h-4">{loadingStatus}</p>
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%) scaleX(0.5); }
          50% { transform: translateX(50%) scaleX(1); }
          100% { transform: translateX(200%) scaleX(0.5); }
        }
        .animate-loading-bar { animation: loading-bar 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
      `}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row">
      <aside className="hidden md:flex w-80 bg-[#1e293b] flex-col sticky top-0 h-screen shadow-2xl z-[150] border-r border-white/5">
        <div className="p-10 border-b border-white/5">
          <AppBrand />
        </div>
        <UserHeader />
        <div className="px-10 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aplicativo PWA</span>
          <PWAInstallButton variant="header" />
        </div>
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => handleTabChange(item.id)} 
              className={`w-full flex items-center justify-between gap-5 px-10 py-5 transition-all duration-300 border-l-4 ${activeTab === item.id ? 'bg-indigo-600/10 border-indigo-500 text-white font-black' : 'border-transparent text-slate-500 hover:text-white/60 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-5">
                <span className="material-icons text-xl">{item.icon}</span>
                <span className="text-[11px] uppercase font-black tracking-widest">{item.label}</span>
              </div>
              {item.id === 'new' && todaySpecial && (
                <div className={`flex items-center gap-1.5 ${todaySpecial.color} animate-pulse`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span className="text-[8px] font-black uppercase tracking-tighter">{todaySpecial.name}</span>
                </div>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <header className="md:hidden bg-[#1e293b] text-white px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-[200] flex justify-between items-center gap-2 shadow-2xl border-b border-white/5">
        <div className="min-w-0 flex-1">
          <AppBrand />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="header" />
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 hover:bg-white/10 rounded-2xl active:scale-90 transition-transform flex items-center justify-center text-white shrink-0"
            title="Menu de Opções"
            aria-label="Menu de Opções"
          >
            <span className="material-icons text-2xl">more_vert</span>
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[300] md:hidden">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-xl" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 bottom-0 w-[85%] bg-[#1e293b] shadow-2xl flex flex-col animate-fadeIn border-l border-white/5">
            <div className="p-6 sm:p-8 flex justify-between items-center border-b border-white/5 gap-2">
              <div className="min-w-0 flex-1">
                <AppBrand />
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white shrink-0"><span className="material-icons">close</span></button>
            </div>
            <UserHeader />
            <nav className="flex-1 py-4 overflow-y-auto">
              {menuItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabChange(item.id)} 
                  className={`w-full flex items-center justify-between px-10 py-6 border-b border-white/5 ${activeTab === item.id ? 'text-indigo-400 bg-white/5 font-black' : 'text-slate-400'}`}
                >
                  <div className="flex items-center gap-6">
                    <span className="material-icons text-2xl">{item.icon}</span>
                    <span className="text-[12px] font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                  {item.id === 'new' && todaySpecial && (
                    <span className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest ${todaySpecial.color}`}>
                      {todaySpecial.name}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-sm bg-[#1e293b] rounded-[3rem] p-10 shadow-2xl border border-white/10 animate-scaleUp">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-white font-black text-xl uppercase tracking-tighter">Login Cloud</h3>
               <button onClick={() => setShowAuthModal(false)} className="text-white/20"><span className="material-icons">close</span></button>
            </div>
            <AuthForm onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <PWAInstallButton variant="banner" />
        <OfflineBanner />
        <div className="px-4 py-10 md:p-16 animate-fadeIn max-w-4xl mx-auto">
          {activeTab === 'new' && <ServiceForm onSave={saveRecord} songStats={songStats} fullSongList={fullSongList} workers={customWorkers} onRegisterNewSong={s => { if (isGroupHeaderOrMarker(s)) return; setCustomSongs(prev => [...prev, s]); setPraiseCollection(prev => [...new Set([...prev, s])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))); }} draft={draft} setDraft={setDraft} editingId={editingId} onCancelEdit={() => setEditingId(null)} />}
          {activeTab === 'history' && <HistoryList history={history} workers={customWorkers} fullSongList={fullSongList} onDelete={handleDeleteRecord} onEdit={r => { setEditingId(r.id); setDraft({ ...r }); setActiveTab('new'); }} onClearAll={() => {}} onRegisterGap={handleRegisterGap} />}
          {activeTab === 'attendance' && (
            <AttendanceAnalytics
              history={history}
              onUpdateHistory={handleUpdateHistory}
              onSelectRecordForEdit={r => {
                setEditingId(r.id);
                setDraft({ ...r });
                setActiveTab('new');
              }}
            />
          )}
          {activeTab === 'learning' && <PraiseLearningList fullSongList={fullSongList} learningList={learningList} setLearningList={setLearningList} />}
          {activeTab === 'workers' && <WorkerRanking history={history} workers={customWorkers} />}
          {activeTab === 'suggestions' && <WorkerStats history={history} workers={customWorkers} />}
          {activeTab === 'manage-workers' && <WorkerManager workers={customWorkers} setWorkers={setCustomWorkers} />}
          {activeTab === 'collections' && (
            <CollectionsManager
              praiseCollection={praiseCollection}
              setPraiseCollection={setPraiseCollection}
              onRenameSongInHistory={onRenameSongInHistory}
              onAddSong={newSong => {
                if (isGroupHeaderOrMarker(newSong)) return;
                setCustomSongs(prev => prev.includes(newSong) ? prev : [...prev, newSong]);
                setPraiseCollection(prev => [...new Set([...prev, newSong])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
              }}
              onDeleteSongFromCollection={songToDelete => {
                setCustomSongs(prev => prev.filter(s => s !== songToDelete));
                setPraiseCollection(prev => prev.filter(s => s !== songToDelete));
              }}
            />
          )}
          {activeTab === 'praise-ranking' && <RankingList songStats={songStats} fullSongList={fullSongList} />}
          {activeTab === 'repetition' && <RepetitionChart history={history} songStats={songStats} fullSongList={fullSongList} churchName={churchName} />}
          {activeTab === 'unplayed' && <UnplayedList fullSongList={fullSongList} history={history} />}
          {activeTab === 'settings' && (
            <BackupRestore
              history={history}
              customSongs={customSongs}
              learningList={learningList}
              praiseCollection={praiseCollection}
              pendingCloudSync={pendingCloudSync}
              syncStatus={syncStatus}
              onRestore={handleRestoreBackup}
              onForceSync={() => syncWithCloud()}
              onGuaranteeLocalSave={handleGuaranteeLocalSave}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
