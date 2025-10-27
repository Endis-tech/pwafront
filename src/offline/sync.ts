import { api } from "../api";
import {
  getOutbox,
  clearOutbox,
  setMapping,
  getMapping,
  putTaskLocal,
  removeTaskLocal,
  getAllTaskLocal,
} from "./db";

// --- Sincroniza datos pendientes ---
export async function syncNow() {
  if (!navigator.onLine) return;

  const ops = (await getOutbox()).sort((a, b) => a.ts - b.ts);
  if (!ops.length) return;

  const toCreate: any[] = [];

  for (const op of ops) {
    if (op.op === "create") {
      toCreate.push({
        clientId: op.clientId,
        title: op.data.title,
        description: op.data.description ?? "",
        status: op.data.status ?? "Pendiente",
      });
    }
  }

  // Enviar creaciones en bulk
  if (toCreate.length) {
    try {
      const { data } = await api.post("/tasks/bulksync", { tasks: toCreate });
      for (const map of data?.mapping || []) {
        await setMapping(map.clientId, map.serverId);
        // actualizar task local con serverId
        const taskToUpdate = toCreate.find((t) => t.clientId === map.clientId);
        if (taskToUpdate) {
          await putTaskLocal({ ...taskToUpdate, _id: map.serverId });
        }
      }
    } catch (err) {
      console.error("Error bulk sync create", err);
    }
  }

  // Manejar updates
  for (const op of ops.filter((o) => o.op === "update")) {
    const serverId =
      op.serverId ?? (op.clientId ? await getMapping(op.clientId) : undefined);
    if (!serverId) continue;
    try {
      await api.put(`/tasks/${serverId}`, op.data);
      await putTaskLocal({ ...op.data, _id: serverId });
    } catch (err) {
      console.error("Error update sync", err);
    }
  }

  // Manejar deletes
  for (const op of ops.filter((o) => o.op === "delete")) {
    const serverId =
      op.serverId ?? (op.clientId ? await getMapping(op.clientId) : undefined);
    if (!serverId) continue;
    try {
      await api.delete(`/tasks/${serverId}`);
      await removeTaskLocal(op.clientId || serverId);
    } catch (err) {
      console.error("Error delete sync", err);
    }
  }

  await clearOutbox();
  await refreshTasks();
}

// --- Refrescar la UI desde IndexedDB ---
export async function refreshTasks() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tasks = await getAllTaskLocal();
  // Aquí puedes actualizar la vista, por ejemplo: renderTasks(tasks);
}

// --- Configura sincronización al volver online ---
export function setupOnlineSync() {
  window.addEventListener("online", async () => {
    console.log("Conexión restaurada. Sincronizando...");
    await syncNow();
  });
}
