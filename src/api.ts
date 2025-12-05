import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

export function setAuth(token: string | null) {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token);
        
        // Guardar también timestamp del token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            localStorage.setItem('token_expires', payload.exp.toString());
        } catch {
            // Si no podemos parsear, no guardamos timestamp
        }
    } else {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
        localStorage.removeItem('token_expires');
    }
}

// ✅ Nueva función para verificar si el token es válido
export function isTokenValid(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const expires = localStorage.getItem('token_expires');
        if (expires) {
            const expirationTime = parseInt(expires) * 1000; // Convertir a milisegundos
            const currentTime = Date.now();
            const fiveMinutes = 5 * 60 * 1000; // 5 minutos de margen
            
            // Verificar si el token expirará en menos de 5 minutos
            return expirationTime > (currentTime + fiveMinutes);
        }
        
        // Si no hay timestamp, asumimos válido (para compatibilidad)
        return true;
    } catch {
        return false;
    }
}

// ✅ Nueva función para obtener token con verificación
export function getValidToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token || !isTokenValid()) {
        return null;
    }
    return token;
}

// Inicializar con token si existe
const savedToken = localStorage.getItem('token');
if (savedToken) {
    setAuth(savedToken);
}

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) {
            console.log('🔐 Error 401 - Token inválido o expirado');
            localStorage.removeItem('token');
            localStorage.removeItem('token_expires');
            setAuth(null);
            
            // Solo redirigir si estamos en el dashboard
            if (window.location.pathname.includes('/dashboard')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);