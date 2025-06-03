// src/layouts/DashboardLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';

interface SidebarItemProps {
  to: string;
  label: string;
  isActive: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, label, isActive }) => {
  const itemClasses = `
    sidebar-link
    flex items-center 
    px-4 py-3 
    ${isActive 
      ? 'active-link text-blue-600 font-medium' 
      : 'text-gray-700 hover:bg-gray-50'
    }
  `;

  return (
    <Link to={to} className={itemClasses}>
      <span>{label}</span>
    </Link>
  );
};

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation items - sans icônes
  const navItems = [
    { to: '/dashboard', label: 'Tableau de bord' },
    { to: '/dashboard/users', label: 'Acteurs' },
    { to: '/dashboard/applications', label: 'Applications' },
    { to: '/dashboard/questionnaires', label: 'Questionnaires' },
    { to: '/dashboard/organisations', label: 'Organisations' },
    { to: '/dashboard/forms', label: 'Formulaires' },
  ];

  // Fonction pour déterminer si un item est actif
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Toggle menu mobile
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - version desktop */}
      <div className="hidden md:block md:flex-shrink-0">
        <div className="h-full w-64 bg-white shadow-md">
          <div className="p-4 border-b">
            <h1 className="app-title text-xl text-gray-800">Plateforme Évaluation Maturité des DSIN</h1>
          </div>
          <nav className="mt-4 flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                label={item.label}
                isActive={isActive(item.to)}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Menu burger pour mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          <h1 className="app-title text-lg text-gray-800">Évaluation DSIN</h1>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md text-gray-500 hover:text-gray-600 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Menu mobile déroulant */}
        {isMobileMenuOpen && (
          <nav className="bg-white px-2 py-2">
            {navItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                label={item.label}
                isActive={isActive(item.to)}
              />
            ))}
          </nav>
        )}
      </div>

      {/* Content - avec ajustement pour le header mobile */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-0 md:pt-0 pb-4">
          <div className="md:pt-0 mt-16 md:mt-0">
            {/* Remplacer children par Outlet */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;