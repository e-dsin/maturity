import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-secondary-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      
        
        {/* Page Content */}
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white p-4 border-t border-secondary-200">
          <div className="container mx-auto text-center text-secondary-500 text-sm">
            Qwanza © {new Date().getFullYear()} - Plateforme d'Évaluation de la Maturité des DSIN
          </div>
        </footer>
      
    </div>
  );
};

export default Layout;