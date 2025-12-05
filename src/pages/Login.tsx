// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuth } from "../api";
import "../App.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      setAuth(data.token);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="page-wrapper">
      {/* Botón de volver atrás */}
      <a href="/welcome" className="back-link">
        <span>←</span> Atrás
      </a>

      <div className="page-container">
        {/* Imagen */}
        <img 
          src="/images/chivas.png" 
          alt="Logo" 
          className="page-image" 
        />

        {/* Títulos */}
        <h1 className="page-title">Bienvenido</h1>
        <p className="page-subtitle">
          Inicia sesión en tu cuenta
        </p>

        {/* Formulario */}
        <form onSubmit={onSubmit} className="page-form">
          {/* Campo email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />
          </div>

          {/* Campo contraseña */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
            />
          </div>

          {/* Enlace "Forgot Password?" */}
          <button 
            type="button" 
            className="text-link"
            style={{ alignSelf: "flex-start", marginTop: "-0.5rem" }}
            onClick={() => navigate("/forgot-password")}
          >
            ¿Olvidaste tu contraseña?
          </button>

          {/* Mensaje de error */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Botón de iniciar sesión */}
          <button type="submit" className="btn btn-primary">
            Iniciar sesión
          </button>

          {/* Botón para registro */}
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate("/register")}
          >
            Crear nueva cuenta
          </button>
        </form>
      </div>
    </div>
  );
}