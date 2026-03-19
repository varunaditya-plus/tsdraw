import type { TsdrawHistorySnapshot, TsdrawPersistedRecord, TsdrawSessionStateSnapshot } from '@tsdraw/core';

const DATABASE_PREFIX = 'tsdraw_v1_';
const DATABASE_VERSION = 2;

const STORE = {
  records: 'records',
  state: 'state',
  history: 'history',
} as const;

interface StateRow {
  id: string;
  snapshot: TsdrawSessionStateSnapshot;
  updatedAt: number;
}

interface HistoryRow {
  id: string;
  snapshot: TsdrawHistorySnapshot;
  updatedAt: number;
}

export interface LocalLoadResult {
  records: TsdrawPersistedRecord[];
  state: TsdrawSessionStateSnapshot | null;
  history: TsdrawHistorySnapshot | null;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function openLocalDatabase(persistenceKey: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${DATABASE_PREFIX}${persistenceKey}`, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE.records)) { database.createObjectStore(STORE.records); }
      if (!database.objectStoreNames.contains(STORE.state)) { database.createObjectStore(STORE.state); }
      if (!database.objectStoreNames.contains(STORE.history)) { database.createObjectStore(STORE.history); }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export class TsdrawLocalIndexedDb {
  private readonly databasePromise: Promise<IDBDatabase>;

  constructor(persistenceKey: string) {
    this.databasePromise = openLocalDatabase(persistenceKey);
  }

  async close(): Promise<void> {
    const database = await this.databasePromise;
    database.close();
  }

  async load(sessionId: string): Promise<LocalLoadResult> {
    const database = await this.databasePromise;
    const transaction = database.transaction([STORE.records, STORE.state, STORE.history], 'readonly');
    const recordStore = transaction.objectStore(STORE.records);
    const stateStore = transaction.objectStore(STORE.state);
    const historyStore = transaction.objectStore(STORE.history);

    const records = (await requestToPromise(recordStore.getAll())) as TsdrawPersistedRecord[];
    let state = (await requestToPromise(stateStore.get(sessionId)) as StateRow | undefined)?.snapshot ?? null;
    let history = (await requestToPromise(historyStore.get(sessionId)) as HistoryRow | undefined)?.snapshot ?? null;

    if (!state) {
      const allStates = (await requestToPromise(stateStore.getAll())) as StateRow[];
      if (allStates.length > 0) {
        allStates.sort((left, right) => left.updatedAt - right.updatedAt);
        state = allStates[allStates.length - 1]?.snapshot ?? null;
      }
    }

    if (!history) {
      const allHistoryRows = (await requestToPromise(historyStore.getAll())) as HistoryRow[];
      if (allHistoryRows.length > 0) {
        allHistoryRows.sort((left, right) => left.updatedAt - right.updatedAt);
        history = allHistoryRows[allHistoryRows.length - 1]?.snapshot ?? null;
      }
    }

    await transactionDone(transaction);
    return { records, state, history };
  }

  async storeSnapshot(args: {
    records: TsdrawPersistedRecord[];
    sessionId: string;
    state: TsdrawSessionStateSnapshot;
    history: TsdrawHistorySnapshot;
  }): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction([STORE.records, STORE.state, STORE.history], 'readwrite');
    const recordStore = transaction.objectStore(STORE.records);
    const stateStore = transaction.objectStore(STORE.state);
    const historyStore = transaction.objectStore(STORE.history);

    recordStore.clear();
    for (const record of args.records) {
      recordStore.put(record, record.id);
    }

    const stateRow: StateRow = {
      id: args.sessionId,
      snapshot: args.state,
      updatedAt: Date.now(),
    };
    stateStore.put(stateRow, args.sessionId);

    const historyRow: HistoryRow = {
      id: args.sessionId,
      snapshot: args.history,
      updatedAt: Date.now(),
    };
    historyStore.put(historyRow, args.sessionId);

    await transactionDone(transaction);
  }
}

export function getPersistenceDatabaseName(persistenceKey: string): string {
  return `${DATABASE_PREFIX}${persistenceKey}`;
}