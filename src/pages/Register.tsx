import { useState } from "react";
import axios from "axios";
import "./style.css"; 

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axios.post("http://192.168.0.101:4000/api/auth/register", {
        name,
        email,
        password,
      });

      setMessage(res.data.message || "Usuario registrado con éxito 🎉");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Error al registrar usuario");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Registro de Usuario</h2>
        <p className="auth-subtitle">Crea tu cuenta para continuar</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              required
            />
            <label>Nombre</label>
          </div>
          <div className="input-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo"
              required
            />
            <label>Correo</label>
          </div>
          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
            />
            <label>Contraseña</label>
          </div>
          <button type="submit" className="auth-btn">
            Registrarse
          </button>
          {message && <p className="auth-error">{message}</p>}
        </form>
        <p className="auth-footer">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="auth-link">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
