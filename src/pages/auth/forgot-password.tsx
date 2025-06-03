// src/pages/auth/forgot-password.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { forgotPassword } = useAuth();
  
  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de l'email
    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('L\'email n\'est pas valide');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'envoi du mail');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h2>
        <p className="text-sm text-gray-600 mt-1">
          Nous vous enverrons un lien pour réinitialiser votre mot de passe
        </p>
      </div>
      
      {isSubmitted ? (
        <div className="rounded-md bg-success-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-success-800">Instructions envoyées</h3>
              <div className="mt-2 text-sm text-success-700">
                <p>
                  Si l'adresse {email} est associée à un compte, vous recevrez un email contenant les instructions pour réinitialiser votre mot de passe.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    to="/auth/login"
                    className="px-2 py-1.5 rounded-md text-sm font-medium text-success-800 hover:bg-success-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success-500"
                  >
                    Retour à la connexion
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Envoyer les instructions
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <Link to="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
                Retour à la connexion
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ForgotPassword;