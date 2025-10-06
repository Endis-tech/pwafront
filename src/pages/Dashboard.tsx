import { useEffect, useMemo, useState } from "react";
import { api, setAuth } from "../api";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: "Pendiente" | "En Progreso" | "Completada";
  clienteId?: string;
  createdAt?: string;
  deleted?: boolean;
};

// Normaliza datos del backend
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
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"Pendiente" | "En Progreso" | "Completada">("Pendiente");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingStatus, setEditingStatus] = useState<"Pendiente" | "En Progreso" | "Completada">("Pendiente");

  useEffect(() => {
    setAuth(localStorage.getItem("token"));
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks");
      console.log("raw tasks:", data); // Verificar lo que llega del backend
      const raw =
        Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.tasks)
          ? data.tasks
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
      setTasks(raw.map(normalizeTask));
    } finally {
      setLoading(false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    const { data } = await api.post("/tasks", {
      title: t,
      description,
      status,
    });

    const created = normalizeTask(data?.task ?? data);
    setTasks((prev) => [created, ...prev]);

    setTitle("");
    setDescription("");
    setStatus("Pendiente");
  }

  async function toggleTask(task: Task) {
    const newStatus: Task["status"] =
      task.status === "Completada" ? "Pendiente" : "Completada";
    const updated = { ...task, status: newStatus };
    setTasks((prev) => prev.map((x) => (x._id === task._id ? updated : x)));

    try {
      await api.put(`/tasks/${task._id}`, { status: newStatus });
    } catch {
      setTasks((prev) => prev.map((x) => (x._id === task._id ? task : x)));
    }
  }

  function startEdit(task: Task) {
    setEditingId(task._id);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? "");
    setEditingStatus(task.status);
  }

  async function saveEdit(taskId: string) {
    const newTitle = editingTitle.trim();
    const newDescription = editingDescription.trim();
    if (!newTitle) return;

    const before = tasks.find((t) => t._id === taskId);
    const updated = { ...before, title: newTitle, description: newDescription, status: editingStatus } as Task;

    setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    setEditingId(null);

    try {
      await api.put(`/tasks/${taskId}`, {
        title: newTitle,
        description: newDescription,
        status: editingStatus,
      });
    } catch {
      if (before) setTasks((prev) => prev.map((t) => (t._id === taskId ? before : t)));
    }
  }

  async function removeTask(taskId: string) {
    const backup = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await api.delete(`/tasks/${taskId}`);
    } catch {
      setTasks(backup);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setAuth(null);
    window.location.href = "/";
  }

  const filtered = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((t) => (t.title || "").toLowerCase().includes(s));
    }
    if (filter === "active") list = list.filter((t) => t.status !== "Completada");
    if (filter === "completed") list = list.filter((t) => t.status === "Completada");
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
        <div className="stats">
          <span>Total: {stats.total}</span>
          <span>Hechas: {stats.done}</span>
          <span>Pendientes: {stats.pending}</span>
        </div>
        <button className="btn danger" onClick={logout}>Salir</button>
      </header>

      <main>
        {/* Formulario de nueva tarea */}
        <form className="add" onSubmit={addTask}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea…"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción…"
          />
          
          <button className="btn">Agregar</button>
        </form>

        {/* Toolbar */}
        <div className="toolbar">
          <input
            className="search"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filters">
            <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")} type="button">Todas</button>
            <button className={filter === "active" ? "chip active" : "chip"} onClick={() => setFilter("active")} type="button">Activas</button>
            <button className={filter === "completed" ? "chip active" : "chip"} onClick={() => setFilter("completed")} type="button">Hechas</button>
          </div>
        </div>

        {/* Lista de tareas */}
        {loading ? (
          <p>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">Sin tareas</p>
        ) : (
          <ul className="list">
            {filtered.map((t) => (
              <li key={t._id} className={t.status === "Completada" ? "item done" : "item"}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={t.status === "Completada"}
                    onChange={() => toggleTask(t)}
                  />
                  <span className="checkmark"></span>
                </label>

                {editingId === t._id ? (
                  <div className="edit-form">
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="Título…"
                    />
                    <input
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      placeholder="Descripción…"
                    />
                    <select value={editingStatus} onChange={(e) => setEditingStatus(e.target.value as any)}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Progreso">En Progreso</option>
                      <option value="Completada">Completada</option>
                    </select>
                    <button className="btn" onClick={() => saveEdit(t._id)}>Guardar</button>
                  </div>
                ) : (
                  <div onDoubleClick={() => startEdit(t)}>
                    <strong>{t.title}</strong><br/>
                    <small>{t.description}</small><br/>
                    <em>{t.status}</em>
                  </div>
                )}

                <div className="actions">
                  {editingId !== t._id && (
                    <button className="icon" onClick={() => startEdit(t)}>🖋️</button>
                  )}
                  <button className="icon danger" onClick={() => removeTask(t._id)}>🚮</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
