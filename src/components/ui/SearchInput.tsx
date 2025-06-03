// src/components/ui/SearchInput.tsx
import React, { useState, useRef, useEffect } from 'react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  clearable?: boolean;
  disabled?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Recherche',
  value,
  onChange,
  onSearch,
  className = '',
  size = 'md',
  clearable = true,
  disabled = false,
}) => {
  // État local pour le contrôle interne (si non contrôlé par le parent)
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Détermine si le composant est contrôlé ou non
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  
  // Classes selon la taille
  const sizeClasses = {
    sm: 'pl-8 pr-3 py-1.5 text-sm',
    md: 'pl-10 pr-4 py-2',
    lg: 'pl-12 pr-5 py-2.5 text-lg',
  };
  
  // Classes pour l'icône
  const iconSizeClasses = {
    sm: 'h-4 w-4 left-2',
    md: 'h-5 w-5 left-3',
    lg: 'h-6 w-6 left-4',
  };
  
  // Classes pour le bouton de nettoyage
  const clearButtonClasses = {
    sm: 'h-4 w-4 right-2',
    md: 'h-5 w-5 right-3',
    lg: 'h-6 w-6 right-4',
  };
  
  // Gérer le changement de valeur
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    onChange && onChange(newValue);
  };
  
  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch && onSearch(currentValue);
  };
  
  // Effacer la valeur
  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    
    onChange && onChange('');
    
    // Focus sur l'input après nettoyage
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className={`
          ${sizeClasses[size]} 
          border rounded-md 
          focus:ring-primary-500 focus:border-primary-500 
          block w-full shadow-sm
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
      />
      
      {/* Icône de recherche */}
      <div className={`absolute inset-y-0 ${iconSizeClasses[size]} flex items-center pointer-events-none`}>
        <svg className="text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      {/* Bouton pour effacer */}
      {clearable && currentValue && (
        <button
          type="button"
          className={`absolute inset-y-0 ${clearButtonClasses[size]} flex items-center text-gray-400 hover:text-gray-600`}
          onClick={handleClear}
        >
          <svg className="h-full w-full p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
};

export default SearchInput;