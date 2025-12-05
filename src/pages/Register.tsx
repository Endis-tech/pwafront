// src/pages/Register.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!agreeTerms) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }

    try {
      const res = await axios.post("https://pwaback-u4hc.vercel.app/api/auth/register", {
        name,
        email,
        password,
      });

      setMessage(res.data.message || "¡Cuenta creada con éxito! 🎉");
      
      // Limpiar formulario
      setName("");
      setEmail("");
      setPassword("");
      setAgreeTerms(false);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al registrar usuario");
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

        <h1 className="page-title">Crear Cuenta</h1>
        <p className="page-subtitle">
          Regístrate para comenzar tu experiencia
        </p>

        <form onSubmit={handleSubmit} className="page-form">
          {/* Nombre */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              placeholder="Tu nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field"
            />
          </div>

          {/* Email */}
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

          {/* Contraseña */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              placeholder="Crea una contraseña segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
            />
          </div>

          {/* Términos y condiciones */}
          <div className="checkbox-group">
            <input 
              type="checkbox" 
              id="terms" 
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
            />
            <label htmlFor="terms">
              Acepto los <a href="/terms">términos y condiciones</a> y la <a href="/privacy">política de privacidad</a>
            </label>
          </div>

          {/* Mensajes */}
          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Botón de registro */}
          <button type="submit" className="btn btn-primary">
            Crear cuenta
          </button>

          {/* Enlace a login */}
          <button 
            type="button" 
            className="text-link"
            onClick={() => navigate("/login")}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </form>
      </div>
    </div>
  );
}
