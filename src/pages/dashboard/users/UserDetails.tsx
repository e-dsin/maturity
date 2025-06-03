import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

// Données fictives - À remplacer par vos hooks d'API réels
const mockUserDetails = {
  id: '1',
  name: 'Jean Dupont',
  email: 'jean.dupont@example.com',
  phone: '+33 6 12 34 56 78',
  organisation: 'Direction Informatique',
  role: 'Admin',
  dateCreation: '2023-01-15',
  lastLogin: '2023-08-22',
  forms: [
    { id: 'form1', title: 'Évaluation CRM', date: '2023-06-10', application: 'CRM', score: 3.8 },
    { id: 'form2', title: 'Évaluation ERP', date: '2023-07-05', application: 'ERP', score: 4.2 },
    { id: 'form3', title: 'Évaluation SIRH', date: '2023-08-15', application: 'SIRH', score: 3.5 },
  ]
};

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Simuler chargement des données d'un utilisateur spécifique
  // Dans un cas réel, vous utiliseriez un hook comme useEffect pour charger les données
  // basées sur l'id du paramètre d'URL
  const user = mockUserDetails;
  
  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex justify-between items-center pb-4 border-b border-secondary-200">
        <div className="flex items-center">
          <Link 
            to="/dashboard/users" 
            className="mr-4 p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-full"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-secondary-900">Détails de l'acteur</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-3 py-2 border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50">
            <PencilSquareIcon className="h-5 w-5 mr-1" />
            Modifier
          </button>
          <button className="flex items-center px-3 py-2 border border-danger-300 text-danger-700 rounded-md hover:bg-danger-50">
            <TrashIcon className="h-5 w-5 mr-1" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Détails de l'utilisateur */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row">
            {/* Informations personnelles */}
            <div className="md:w-1/2 mb-6 md:mb-0 md:pr-6">
              <h2 className="text-lg font-semibold mb-4 text-secondary-900 border-b pb-2 border-secondary-200">
                Informations personnelles
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-secondary-500">Nom complet</p>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Téléphone</p>
                  <p className="font-medium">{user.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Organisation</p>
                  <p className="font-medium">{user.organisation}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Rôle</p>
                  <p className="font-medium">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'Admin' ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'
                    }`}>
                      {user.role}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Informations du compte */}
            <div className="md:w-1/2 md:pl-6 md:border-l border-secondary-200">
              <h2 className="text-lg font-semibold mb-4 text-secondary-900 border-b pb-2 border-secondary-200">
                Informations du compte
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-secondary-500">Identifiant</p>
                  <p className="font-medium font-mono text-sm bg-secondary-50 p-1 rounded inline-block">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Date de création</p>
                  <p className="font-medium">{user.dateCreation}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Dernière connexion</p>
                  <p className="font-medium">{user.lastLogin}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Nombre de formulaires</p>
                  <p className="font-medium">{user.forms.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historique des formulaires */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-secondary-900">Formulaires soumis</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Questionnaire
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {user.forms.map((form) => (
                  <tr key={form.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/dashboard/forms/${form.id}`} className="text-primary-600 hover:text-primary-900">
                        {form.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-secondary-500">
                      {form.application}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-secondary-500">
                      {form.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.score >= 4 
                            ? 'bg-success-100 text-success-800' 
                            : form.score >= 3 
                              ? 'bg-warning-100 text-warning-800' 
                              : 'bg-danger-100 text-danger-800'
                        }`}>
                          {form.score}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/dashboard/forms/${form.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;