// bd.ts
import { openDB } from "idb";

const DB_NAME = "BackPWA";
const DB_VERSION = 2;

let dbPromise: Promise<Awaited<ReturnType<typeof openDB>>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("tasks")) {
          db.createObjectStore("tasks", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// --- Operaciones en tasks ---
export async function cacheTasks(list: any[]) {
  const db = await getDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  
  await store.clear();
  for (const t of list) await store.put(t);
  await tx.done;
}

export async function putTaskLocal(task: any) {
  const db = await getDB();
  await db.put("tasks", task);
}

export async function getAllTasksLocal() {
  const db = await getDB();
  return await db.getAll("tasks");
}

export async function removeTaskLocal(id: string) {
  const db = await getDB();
  await db.delete("tasks", id);
}

// --- Operaciones en outbox ---
export type OutboxOp =
  | { id: string; op: "create"; clientId: string; data: any; ts: number; }
  | { id: string; op: "update"; serverId?: string; clientId?: string; data: any; ts: number; }
  | { id: string; op: "delete"; serverId?: string; clientId?: string; ts: number; };

export async function queue(op: OutboxOp) {
  const db = await getDB();
  await db.put("outbox", op);
}

export async function getOutbox() {
  const db = await getDB();
  return await db.getAll("outbox");
}

export async function clearOutbox() {
  const db = await getDB();
  const tx = db.transaction("outbox", "readwrite");
  await tx.store.clear();
  await tx.done;
}

// --- Operaciones en meta ---
export async function setMapping(clientId: string, serverId: string) {
  const db = await getDB();
  await db.put("meta", { key: `mapping-${clientId}`, serverId });
}

export async function getMapping(clientId: string) {
  const db = await getDB();
  const result = await db.get("meta", `mapping-${clientId}`);
  return result?.serverId as string | undefined;
}

// 👇 Manejo de usuario actual
export async function getCurrentUserId(): Promise<string | null> {
  const db = await getDB();
  const result = await db.get("meta", "currentUserId");
  return result?.value || null;
}

export async function setCurrentUserId(userId: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key: "currentUserId", value: userId });
}

export async function initForUser(userId: string): Promise<void> {
  const current = await getCurrentUserId();
  if (current !== userId) {
    const db = await getDB();
    const tx = db.transaction(["tasks", "outbox"], "readwrite");
    await tx.objectStore("tasks").clear();
    await tx.objectStore("outbox").clear();
    await tx.done;
    await setCurrentUserId(userId);
    console.log("Initialized DB for new user:", userId);
  } else {
    console.log("Reusing DB for existing user:", userId);
  }
}