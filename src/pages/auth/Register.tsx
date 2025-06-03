// src/pages/auth/register.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterForm {
  nom_prenom: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  organisation: string;
  anciennete_role: string;
}

const roles = [
  { value: 'DSI', label: 'DSI' },
  { value: 'RSSI', label: 'RSSI' },
  { value: 'Architecte', label: 'Architecte' },
  { value: 'Chef de projet', label: 'Chef de projet' },
  { value: 'Développeur', label: 'Développeur' },
  { value: 'Product Owner', label: 'Product Owner' },
  { value: 'Scrum Master', label: 'Scrum Master' },
  { value: 'Autre', label: 'Autre' }
];

const organisations = [
  { value: 'DSI Siège', label: 'DSI Siège' },
  { value: 'DSI Agence Nord', label: 'DSI Agence Nord' },
  { value: 'Direction Financière', label: 'Direction Financière' },
  { value: 'Direction RH', label: 'Direction RH' },
  { value: 'Direction Marketing', label: 'Direction Marketing' },
  { value: 'Autre', label: 'Autre' }
];

const anciennetes = [
  { value: '0', label: 'Moins d\'un an' },
  { value: '1', label: '1 an' },
  { value: '2', label: '2 ans' },
  { value: '3', label: '3 ans' },
  { value: '4', label: '4 ans' },
  { value: '5', label: '5 ans ou plus' }
];

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterForm>({
    nom_prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    organisation: '',
    anciennete_role: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;
    
    // Validation du nom
    if (!formData.nom_prenom.trim()) {
      newErrors.nom_prenom = 'Le nom est requis';
      isValid = false;
    }
    
    // Validation de l'email
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
      isValid = false;
    }
    
    // Validation du mot de passe
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      isValid = false;
    }
    
    // Validation de la confirmation du mot de passe
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }
    
    // Validation du rôle
    if (!formData.role) {
      newErrors.role = 'Le rôle est requis';
      isValid = false;
    }
    
    // Validation de l'organisation
    if (!formData.organisation) {
      newErrors.organisation = 'L\'organisation est requise';
      isValid = false;
    }
    
    // Validation de l'ancienneté
    if (!formData.anciennete_role) {
      newErrors.anciennete_role = 'L\'ancienneté est requise';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Conversion de l'ancienneté en nombre
      const userData = {
        nom_prenom: formData.nom_prenom,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        organisation: formData.organisation,
        anciennete_role: parseInt(formData.anciennete_role)
      };
      
      await register(userData);
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({
        general: error.message || 'Une erreur est survenue lors de l\'inscription'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inscription</h2>
        <p className="text-sm text-gray-600 mt-1">
          Créez votre compte pour accéder à la plateforme
        </p>
      </div>
      
      {errors.general && (
        <div className="bg-danger-50 border border-danger-200 text-danger-800 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informations personnelles */}
        <div>
          <label htmlFor="nom_prenom" className="block text-sm font-medium text-gray-700">
            Nom et prénom
          </label>
          <div className="mt-1">
            <input
              id="nom_prenom"
              name="nom_prenom"
              type="text"
              autoComplete="name"
              required
              value={formData.nom_prenom}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.nom_prenom ? 'border-danger-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
            />
            {errors.nom_prenom && (
              <p className="mt-1 text-sm text-danger-600">{errors.nom_prenom}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.email ? 'border-danger-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-danger-600">{errors.email}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.password ? 'border-danger-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600">{errors.password}</p>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-danger-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Rôle
            </label>
            <div className="mt-1">
              <Select
                id="role"
                options={roles}
                value={formData.role}
                onChange={(value) => handleSelectChange('role', value)}
                error={errors.role}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="organisation" className="block text-sm font-medium text-gray-700">
              Organisation
            </label>
            <div className="mt-1">
              <Select
                id="organisation"
                options={organisations}
                value={formData.organisation}
                onChange={(value) => handleSelectChange('organisation', value)}
                error={errors.organisation}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="anciennete_role" className="block text-sm font-medium text-gray-700">
              Ancienneté dans le rôle
            </label>
            <div className="mt-1">
              <Select
                id="anciennete_role"
                options={anciennetes}
                value={formData.anciennete_role}
                onChange={(value) => handleSelectChange('anciennete_role', value)}
                error={errors.anciennete_role}
              />
            </div>
          </div>
        </div>
        
        <div>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            S'inscrire
          </Button>
        </div>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Vous avez déjà un compte ?{' '}
          <Link to="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;