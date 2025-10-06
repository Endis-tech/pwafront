import { useState } from "react";
import { api, setAuth } from "../api";
import { useNavigate } from "react-router-dom";
import "./style.css"; // Importamos nuestro CSS

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      setAuth(data.token);
      location.href = "/Dashboard";
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al Iniciar Sesión");
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Bienvenido</h2>
        <p className="auth-subtitle">Ingresa tus credenciales</p>
        <form onSubmit={onSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Correo</label>
          </div>
          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label>Contraseña</label>
          </div>
          <button type="submit" className="auth-btn">Entrar</button>
          {error && <p className="auth-error">{error}</p>}
        </form>
        <p className="auth-footer">
          ¿No tienes cuenta?{" "}
          <button onClick={() => navigate("/register")} className="auth-link">
            Regístrate
          </button>
        </p>
      </div>
    </div>
  );
}
