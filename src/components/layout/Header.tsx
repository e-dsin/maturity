import React from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-secondary-200 py-4 px-6">
      <div className="flex items-center justify-between">
        {/* Titre de l'application */}
        <div>
          <h1 className="text-xl font-semibold text-primary-600">Évaluation de Maturité</h1>
        </div>
        
        {/* Actions utilisateur */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="text-secondary-500 hover:text-secondary-700 relative">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-danger-500 rounded-full"></span>
          </button>
          
          {/* Profil utilisateur */}
          <div className="flex items-center space-x-2 cursor-pointer">
            <span className="text-secondary-700 text-sm hidden md:block">John Doe</span>
            <UserCircleIcon className="h-8 w-8 text-secondary-500" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;