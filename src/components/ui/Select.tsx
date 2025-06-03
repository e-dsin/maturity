import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  id,
  options,
  value,
  onChange,
  error,
  placeholder = 'Sélectionnez une option'
}) => {
  return (
    <>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full px-3 py-2 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </>
  );
};

export default Select;