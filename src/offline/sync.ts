// sync.ts
import { api } from "../api";
import {
  getOutbox,
  setMapping,
  getMapping,
  removeTaskLocal,
  getDB,
} from "./db";

let isSyncing = false;

export async function syncNow() {
  if (!navigator.onLine || isSyncing) return;

  isSyncing = true;
  try {
    const ops = await getOutbox();
    if (!ops.length) {
      isSyncing = false;
      return;
    }

    const successfulOps: string[] = [];
    const processedClientIds = new Set<string>();

    for (const op of ops) {
      // Evitar procesar la misma tarea dos veces en una sincronización
      if (op.clientId && processedClientIds.has(op.clientId)) {
        console.log(`Skipping duplicate op for clientId: ${op.clientId}`);
        successfulOps.push(op.id);
        continue;
      }

      try {
        if (op.op === "create") {
          // Siempre se puede crear
          const res = await api.post("/tasks", {
            title: op.data.title,
            description: op.data.description || "",
            status: op.data.status || "Pendiente",
          });

          const serverId = res.data.task?._id || res.data._id || res.data.id;
          if (serverId && op.clientId) {
            await setMapping(op.clientId, serverId);
            successfulOps.push(op.id);
            processedClientIds.add(op.clientId);
          } else {
            console.warn("Create succeeded but no serverId returned", op);
            // Opcional: marcar como exitoso si el backend no devuelve ID
            successfulOps.push(op.id);
          }

        } else if (op.op === "update") {
          // Buscar serverId: primero de op, luego del mapeo
          let serverId = op.serverId;
          if (!serverId && op.clientId) {
            serverId = await getMapping(op.clientId);
          }

          if (!serverId) {
            console.warn("Skipping update: no serverId available for op", op.id);
            // Opcional: descartar si ya no es relevante, o dejar para más tarde
            // Aquí lo dejamos en el outbox (no lo marcamos como exitoso)
            continue;
          }

          await api.put(`/tasks/${serverId}`, op.data);
          successfulOps.push(op.id);
          if (op.clientId) processedClientIds.add(op.clientId);

        } else if (op.op === "delete") {
          let serverId = op.serverId;
          if (!serverId && op.clientId) {
            serverId = await getMapping(op.clientId);
          }

          if (!serverId) {
            console.warn("Skipping delete: no serverId available for op", op.id);
            // No se puede eliminar algo que nunca existió en el server
            successfulOps.push(op.id); // descartar silenciosamente
            continue;
          }

          await api.delete(`/tasks/${serverId}`);
          await removeTaskLocal(serverId);
          successfulOps.push(op.id);
          if (op.clientId) processedClientIds.add(op.clientId);
        }
      } catch (error: any) {
        console.error(`Error syncing operation ${op.id}:`, error);

        // Solo descartamos operaciones con errores de cliente (4xx)
        // Errores 5xx se reintentan más tarde
        if (error.response?.status === 409 || error.response?.status === 400) {
          console.log(`Marking op ${op.id} as successful (client error)`);
          successfulOps.push(op.id);
          if (op.clientId) processedClientIds.add(op.clientId);
        }
        // Si es 500, 502, etc. → no lo marcamos como exitoso → se reintenta
      }
    }

    // Eliminar solo las operaciones que se completaron o son irrecuperables
    if (successfulOps.length > 0) {
      const db = await getDB();
      const tx = db.transaction("outbox", "readwrite");
      const store = tx.objectStore("outbox");
      for (const id of successfulOps) {
        await store.delete(id);
      }
      await tx.done;
      console.log(`Synced/removed ${successfulOps.length} operations`);
    }
  } catch (error) {
    console.error("Unexpected error in sync process:", error);
  } finally {
    isSyncing = false;
  }
}

// Limpieza de duplicados (opcional, útil al iniciar)
export async function cleanupDuplicateOperations() {
  const ops = await getOutbox();
  const clientIdMap = new Map<string, string>();
  const duplicates: string[] = [];

  for (const op of ops) {
    if (op.clientId) {
      if (clientIdMap.has(op.clientId)) {
        duplicates.push(op.id);
      } else {
        clientIdMap.set(op.clientId, op.id);
      }
    }
  }

  if (duplicates.length > 0) {
    const db = await getDB();
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    for (const id of duplicates) {
      await store.delete(id);
    }
    await tx.done;
    console.log(`Cleaned up ${duplicates.length} duplicate operations`);
  }
}

// Configura sincronización automática
export function setupOnlineSync() {
  const handleOnline = () => {
    setTimeout(() => {
      syncNow().catch(console.error);
    }, 1000);
  };

  window.addEventListener("online", handleOnline);

  // Sincronizar periódicamente (solo si hay conexión y no está sincronizando)
  setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      syncNow().catch(console.error);
    }
  }, 30000);
}

// Inicialización completa al iniciar la app
export async function initializeSync() {
  await cleanupDuplicateOperations();
  if (navigator.onLine) {
    await syncNow();
  }
  setupOnlineSync();
}