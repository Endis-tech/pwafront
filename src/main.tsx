

import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import'./index.css';
import Register from './pages/Register';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
       {/* Publica */}
        <Route path = "/" element ={<Login/>} />
         <Route path = "register" element ={<Register/>} />
       {/* Protegida */}
       <Route path = "/dashboard" element ={
        <ProtectedRoute>
        <Dashboard />
        </ProtectedRoute> 
       }/>
       {/* {fallback} */}
        <Route path = "*" element ={<Navigate to="/" replace/>} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);