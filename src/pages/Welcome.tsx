// src/pages/Welcome.tsx
import { useNavigate } from "react-router-dom";
import "../App.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      <div className="page-container">
        {/* Imagen */}
        <img
          src="/images/tepache.png"
          alt="Tepache, tu mapache"
          className="page-image"
        />

        {/* Títulos */}
        <h1 className="page-title">¡Hola!</h1>
        <p className="page-subtitle">
          ¡Bienvenido a nuestra plataforma!
        </p>

        {/* Botones de acción */}
        <div className="page-form">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/login")}
          >
            Tengo una cuenta
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/register")}
          >
            Crear cuenta nueva
          </button>

          {/* Opcional: Enlace para continuar como invitado */}
          <button 
            className="text-link"
            onClick={() => navigate("/dashboard")}
          >
            Continuar como invitado
          </button>
        </div>
      </div>
    </div>
  );
}