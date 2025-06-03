import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
      <span className="ml-3 text-primary-600">Chargement...</span>
    </div>
  );
};

export default LoadingSpinner;