// src/layouts/AuthLayout.tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/">
          <img
            className="mx-auto h-12 w-auto"
            src="/logo_qwanza.svg"
            alt="Plateforme Évaluation Maturité DSIN"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Plateforme d'Évaluation Maturité DSIN
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
         <Outlet />
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© Qwanza 2025 - All right reserved</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;