import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  to: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems: NavigationItem[] = [
    { name: 'Tableau de bord', to: '/dashboard', icon: <HomeIcon className="icon-md" /> },
    { name: 'Acteurs', to: '/dashboard/users', icon: <UserGroupIcon className="icon-md" /> },
    { name: 'Applications', to: '/dashboard/applications', icon: <ComputerDesktopIcon className="icon-md" /> },
    { name: 'Questionnaires', to: '/dashboard/questionnaires', icon: <DocumentTextIcon className="icon-md" /> },
    { name: 'Organisations', to: '/dashboard/organisations', icon: <BuildingOfficeIcon className="icon-md" /> },
    { name: 'Formulaires', to: '/dashboard/forms', icon: <ChartBarIcon className="icon-md" /> },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <button
          onClick={toggleMobileMenu}
          className="bg-primary-700 text-white p-2 rounded-md hover:bg-primary-800 transition-colors"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Sidebar for desktop - largeur réduite */}
      <aside className="hidden lg:flex lg:flex-col w-56 bg-secondary-900 text-white">
        {/* Logo */}
        <div className="p-4 border-b border-secondary-700">
          <h2 className="text-lg font-bold">Plateforme Evaluation de la maturité des DSIN</h2>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2 flex-1">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-secondary-300 hover:bg-secondary-700 hover:text-white'
                    }`
                  }
                >
                  {item.icon}
                  <span className="ml-2 text-sm">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-secondary-700 text-secondary-400 text-xs">
          
        </div>
      </aside>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <aside className="fixed top-0 left-0 z-30 h-full w-56 bg-secondary-900 text-white lg:hidden">
          {/* Logo */}
          <div className="p-4 border-b border-secondary-700 flex justify-between items-center">
            <h2 className="text-lg font-bold">Plateforme Evaluation de la maturité des DSIN</h2>
            <button onClick={toggleMobileMenu} className="text-secondary-300 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-4 px-2">
            <ul className="space-y-1">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-secondary-300 hover:bg-secondary-700 hover:text-white'
                      }`
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-2 text-sm">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleMobileMenu}
        ></div>
      )}
    </>
  );
};

export default Sidebar;