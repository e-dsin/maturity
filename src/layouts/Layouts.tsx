import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="app-title text-xl text-gray-800">Plateforme Évaluation Maturité des DSIN</h1>
        </div>
        <nav className="mt-4">
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => 
              isActive 
                ? "active-link sidebar-link flex items-center px-4 py-3 text-blue-600 font-medium" 
                : "sidebar-link flex items-center px-4 py-3 text-gray-700"
            }
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Tableau de bord</span>
          </NavLink>
          
          <NavLink 
            to="/dashboard/acteurs" 
            className={({isActive}) => 
              isActive 
                ? "active-link sidebar-link flex items-center px-4 py-3 text-blue-600 font-medium" 
                : "sidebar-link flex items-center px-4 py-3 text-gray-700"
            }
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Acteurs</span>
          </NavLink>
          
          <NavLink 
            to="/dashboard/applications" 
            className={({isActive}) => 
              isActive 
                ? "active-link sidebar-link flex items-center px-4 py-3 text-blue-600 font-medium" 
                : "sidebar-link flex items-center px-4 py-3 text-gray-700"
            }
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span>Applications</span>
          </NavLink>
          
          <NavLink 
            to="/dashboard/questionnaires" 
            className={({isActive}) => 
              isActive 
                ? "active-link sidebar-link flex items-center px-4 py-3 text-blue-600 font-medium" 
                : "sidebar-link flex items-center px-4 py-3 text-gray-700"
            }
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Questionnaires</span>
          </NavLink>
          
          <NavLink 
            to="/dashboard/organisations" 
            className={({isActive}) => 
              isActive 
                ? "active-link sidebar-link flex items-center px-4 py-3 text-blue-600 font-medium" 
                : "sidebar-link flex items-center px-4 py-3 text-gray-700"
            }
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Organisations</span>
          </NavLink>
          
          <NavLink 
            to="/dashboard/formulaires" 
            className={({isActive}) => 
              isActive 
                ? "active-link sidebar-link flex items-center px-4 py-3 text-blue-600 font-medium" 
                : "sidebar-link flex items-center px-4 py-3 text-gray-700"
            }
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Formulaires</span>
          </NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;