import { useEffect, useMemo, useState } from "react";
import { api, setAuth } from "../api";
import { useNavigate } from "react-router-dom";
import {
  cacheTasks,
  getAllTaskLocal,
  putTaskLocal,
  removeTaskLocal,
  queue,
  type OutboxOp,
} from "../offline/db";
import { syncNow, setupOnlineSync } from "../offline/sync";
import { FaEdit, FaTrash } from "react-icons/fa";

type Status = "Pendiente" | "En Progreso" | "Completada";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: Status;
  clienteId?: string;
  createdAt?: string;
  deleted?: boolean;
};

function normalizeTask(x: any): Task {
  return {
    _id: String(x?._id ?? x?.id),
    title: String(x?.title ?? "(sin título)"),
    description: x?.description ?? "",
    status:
      x?.status === "Completada" ||
      x?.status === "En Progreso" ||
      x?.status === "Pendiente"
        ? x.status
        : "Pendiente",
    clienteId: x?.clienteId,
    createdAt: x?.createdAt,
    deleted: !!x?.deleted,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    setAuth(localStorage.getItem("token"));
    setupOnlineSync();

    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    (async () => {
      const local = await getAllTaskLocal();
      if (local?.length) setTasks(local.map(normalizeTask));

      await loadFromServer();
      await syncNow();
      await loadFromServer();
    })();

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function loadFromServer() {
    try {
      const { data } = await api.get("/tasks");
      const raw = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.tasks)
        ? data.tasks
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      const list = raw.map(normalizeTask);
      setTasks(list);
      await cacheTasks(list);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    if (!t) return;

    const clienteId = crypto.randomUUID();
    const localTask = normalizeTask({
      _id: clienteId,
      title: t,
      description: d,
      status: "Pendiente",
    });

    setTasks((prev) => [localTask, ...prev]);
    await putTaskLocal(localTask);
    setTitle("");
    setDescription("");

    if (!navigator.onLine) {
      const op: OutboxOp = {
        id: "op-" + clienteId,
        op: "create",
        clientId: clienteId,
        data: localTask,
        ts: Date.now(),
      };
      await queue(op);
      return;
    }

    try {
      const { data } = await api.post("/tasks", { title: t, description: d });
      const created = normalizeTask(data?.task ?? data);
      setTasks((prev) =>
        prev.map((x) => (x._id === clienteId ? created : x))
      );
      await putTaskLocal(created);
    } catch {
      const op: OutboxOp = {
        id: "op-" + clienteId,
        op: "create",
        clientId: clienteId,
        data: localTask,
        ts: Date.now(),
      };
      await queue(op);
    }
  }

  function startEdit(task: Task) {
    setEditingId(task._id);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? "");
  }

  async function saveEdit(taskId: string) {
    const newTitle = editingTitle.trim();
    const newDescription = editingDescription.trim();
    if (!newTitle) return;
    const before = tasks.find((t) => t._id === taskId);
    if (!before) return;

    const updated = {
      ...before,
      title: newTitle,
      description: newDescription,
    };
    setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    setEditingId(null);
    await putTaskLocal(updated);

    if (!navigator.onLine) {
      await queue({
        id: "upd-" + taskId,
        op: "update",
        clientId: taskId,
        data: updated,
        ts: Date.now(),
      });
      return;
    }

    try {
      await api.put(`/tasks/${taskId}`, updated);
    } catch {
      await queue({
        id: "upd-" + taskId,
        op: "update",
        clientId: taskId,
        data: updated,
        ts: Date.now(),
      });
    }
  }

  async function handleStatusChange(task: Task, newStatus: Status) {
    const updated = { ...task, status: newStatus };
    setTasks((prev) => prev.map((x) => (x._id === task._id ? updated : x)));
    await putTaskLocal(updated);

    if (!navigator.onLine) {
      await queue({
        id: "upd-" + task._id,
        op: "update",
        clientId: task._id,
        data: { status: newStatus },
        ts: Date.now(),
      });
      return;
    }

    try {
      await api.put(`/tasks/${task._id}`, { status: newStatus });
    } catch {
      await queue({
        id: "upd-" + task._id,
        op: "update",
        clientId: task._id,
        data: { status: newStatus },
        ts: Date.now(),
      });
    }
  }

  async function removeTask(taskId: string) {
    const backup = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    await removeTaskLocal(taskId);

    if (!navigator.onLine) {
      await queue({
        id: "del-" + taskId,
        op: "delete",
        clientId: taskId,
        ts: Date.now(),
      });
      return;
    }

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch {
      setTasks(backup);
      for (const t of backup) await putTaskLocal(t);
      await queue({
        id: "del-" + taskId,
        op: "delete",
        clientId: taskId,
        ts: Date.now(),
      });
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setAuth(null);
    navigate("/login", { replace: true });
  }

  const filtered = useMemo(() => {
    let list = tasks;
    if (search.trim())
      list = list.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
      );
    if (filter === "active")
      list = list.filter((t) => t.status !== "Completada");
    if (filter === "completed")
      list = list.filter((t) => t.status === "Completada");
    return list;
  }, [tasks, search, filter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "Completada").length;
    return { total, done, pending: total - done };
  }, [tasks]);

  return (
    <div className="wrap">
      <header className="topbar">
        <h1>To-Do PWA</h1>
        <div className="spacer" />
        <div className="topbar-row">
          <div className="stats">
            <span>Total: {stats.total}</span>
            <span>Hechas: {stats.done}</span>
            <span>Pendientes: {stats.pending}</span>
          </div>
          <span
            className={`connection-status ${online ? "online" : "offline"}`}
          >
            <span className="wifi-icon">📶</span> {online ? "Online" : "Offline"}
          </span>
        </div>

        <button className="btn danger" onClick={logout}>
          Salir
        </button>
      </header>

      <main>
        <form className="add" onSubmit={addTask}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título…"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción…"
          />
          <button className="btn">Agregar</button>
        </form>

        <div className="toolbar">
          <input
            className="search"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filters">
            <button
              className={filter === "all" ? "chip active" : "chip"}
              onClick={() => setFilter("all")}
              type="button"
            >
              Todas
            </button>
            <button
              className={filter === "active" ? "chip active" : "chip"}
              onClick={() => setFilter("active")}
              type="button"
            >
              Activas
            </button>
            <button
              className={filter === "completed" ? "chip active" : "chip"}
              onClick={() => setFilter("completed")}
              type="button"
            >
              Hechas
            </button>
          </div>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">Sin tareas</p>
        ) : (
          <ul className="list">
            {filtered.map((t) => (
              <li
                key={t._id}
                className={`item ${t.status === "Completada" ? "done" : ""}`}
              >
                <div className="select-wrapper">
                  <select
                    className={`custom-select ${t.status
                      .toLowerCase()
                      .replace(/\s/g, "")}`}
                    value={t.status}
                    onChange={(e) =>
                      handleStatusChange(t, e.target.value as Status)
                    }
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completada">Completada</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>

                {editingId === t._id ? (
                  <div className="edit-form">
                    <input
                      className="edit"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="Título…"
                    />
                    <input
                      className="edit"
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      placeholder="Descripción…"
                    />
                    <button className="btn" onClick={() => saveEdit(t._id)}>
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div onDoubleClick={() => startEdit(t)}>
                    <strong>{t.title}</strong>
                    <br />
                    <small>{t.description}</small>
                    <br />
                    <em>{t.status}</em>
                  </div>
                )}

                <div className="actions">
                  {editingId !== t._id && (
                    <button
                      className="icon"
                      title="Editar"
                      onClick={() => startEdit(t)}
                    >
                      <FaEdit /> Editar
                    </button>
                  )}
                  <button
                    className="icon danger"
                    title="Eliminar"
                    onClick={() => removeTask(t._id)}
                  >
                    <FaTrash /> Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
