import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-bold text-primary-600 mb-4">404</h1>
      <h2 className="text-3xl font-semibold text-secondary-800 mb-6">Page non trouvée</h2>
      <p className="text-secondary-600 mb-8 max-w-md">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link 
        to="/dashboard" 
        className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
};

export default NotFound;