import { openDB } from "idb";

type DBSchema = {
  tasks: { key: string; value: any };
  outbox: { key: string; value: any };
  meta: { key: string; value: { key: string; serverId: string } };
};

let dbp: ReturnType<typeof openDB<DBSchema>>;

export function db() {
  if (!dbp) {
    dbp = openDB<DBSchema>("todo-pwa", 1, {
      upgrade(d) {
        d.createObjectStore("tasks", { keyPath: "_id" });
        d.createObjectStore("outbox", { keyPath: "_id" });
        d.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbp;
}

// --- TAREAS CON CACHE LOCAL ---
export async function cacheTasks(list: any[]) {
  const tx = (await db()).transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  await store.clear();
  for (const t of list) await store.put(t);
  await tx.done;
}

export async function putTaskLocal(task: any) {
  await (await db()).put("tasks", task);
}

export async function getAllTaskLocal() {
  return (await (await db()).getAll("tasks")) || [];
}

export async function removeTaskLocal(id: string) {
  await (await db()).delete("tasks", id);
}

// --- OUTBOX ---
export type OutboxOp =
  | { id: string; op: "create"; clientId: string; data: any; ts: number }
  | { id: string; op: "update"; serverId?: string; clientId?: string; data: any; ts: number }
  | { id: string; op: "delete"; serverId?: string; clientId?: string; ts: number };

export async function queue(op: OutboxOp) {
  await (await db()).put("outbox", op);
}

export async function getOutbox() {
  return (await (await db()).getAll("outbox")) || [];
}

export async function clearOutbox() {
  const tx = (await db()).transaction("outbox", "readwrite");
  await tx.store.clear();
  await tx.done;
}

// --- MAPPING CLIENT ID ↔ SERVER ID ---
export async function setMapping(clientId: string, serverId: string) {
  await (await db()).put("meta", { key: clientId, serverId });
}

export async function getMapping(clientId: string) {
  return (await (await db()).get("meta", clientId))?.serverId as string | undefined;
}
