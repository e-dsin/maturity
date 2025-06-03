import React, { useState, useEffect } from 'react';

// Types
interface Role {
  id_role: string;
  nom_role: string;
  description: string;
  niveau_acces: 'ENTREPRISE' | 'GLOBAL';
  nombre_utilisateurs: number;
}

interface Module {
  id_module: string;
  nom_module: string;
  description: string;
  route_base: string;
  ordre_affichage: number;
}

interface Permission {
  id_role_permission: string;
  id_module: string;
  nom_module: string;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
}

interface User {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  organisation: string;
  id_entreprise: string;
  nom_entreprise: string;
  nom_role: string;
  niveau_acces: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
}

interface UserFormValues {
  nom_prenom: string;
  email: string;
  organisation: string;
  id_entreprise: string;
  id_role: string;
  mot_de_passe?: string;
}

const PermissionsManagement: React.FC = () => {
  // États pour les données
  const [loading, setLoading] = useState<boolean>(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // États pour les permissions des rôles
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [editingPermissions, setEditingPermissions] = useState<boolean>(false);
  const [permissionsChanges, setPermissionsChanges] = useState<Permission[]>([]);
  
  // États pour les formulaires
  const [userFormValues, setUserFormValues] = useState<UserFormValues>({
    nom_prenom: '',
    email: '',
    organisation: '',
    id_entreprise: '',
    id_role: ''
  });
  
  // États pour les dialogues
  const [openUserDialog, setOpenUserDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simulation des données - à remplacer par les appels API réels
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Simulation - remplacer par des appels API réels
      const mockRoles: Role[] = [
        { id_role: '1', nom_role: 'CONSULTANT', description: 'Accès global toutes entreprises', niveau_acces: 'GLOBAL', nombre_utilisateurs: 5 },
        { id_role: '2', nom_role: 'MANAGER', description: 'Gestion de son entreprise', niveau_acces: 'ENTREPRISE', nombre_utilisateurs: 12 },
        { id_role: '3', nom_role: 'INTERVENANT', description: 'Accès limité à son entreprise', niveau_acces: 'ENTREPRISE', nombre_utilisateurs: 28 }
      ];

      const mockModules: Module[] = [
        { id_module: '1', nom_module: 'DASHBOARD', description: 'Tableau de bord', route_base: '/dashboard', ordre_affichage: 1 },
        { id_module: '2', nom_module: 'QUESTIONNAIRES', description: 'Gestion des questionnaires', route_base: '/questionnaires', ordre_affichage: 2 },
        { id_module: '3', nom_module: 'FORMULAIRES', description: 'Gestion des formulaires', route_base: '/formulaires', ordre_affichage: 3 },
        { id_module: '4', nom_module: 'ANALYSES', description: 'Analyses et interprétations', route_base: '/analyses-fonctions', ordre_affichage: 4 },
        { id_module: '5', nom_module: 'APPLICATIONS', description: 'Portfolio applications', route_base: '/applications', ordre_affichage: 5 },
        { id_module: '6', nom_module: 'USERS', description: 'Gestion des utilisateurs', route_base: '/users', ordre_affichage: 6 }
      ];

      const mockUsers: User[] = [
        { id_acteur: '1', nom_prenom: 'Jean Consultant', email: 'jean@consultant.fr', organisation: 'Qwanza', id_entreprise: '', nom_entreprise: 'Qwanza', nom_role: 'CONSULTANT', niveau_acces: 'GLOBAL' },
        { id_acteur: '2', nom_prenom: 'Marie Manager', email: 'marie@entreprise.fr', organisation: 'Direction IT', id_entreprise: '1', nom_entreprise: 'Entreprise A', nom_role: 'MANAGER', niveau_acces: 'ENTREPRISE' },
        { id_acteur: '3', nom_prenom: 'Pierre Intervenant', email: 'pierre@entreprise.fr', organisation: 'Équipe Sécurité', id_entreprise: '1', nom_entreprise: 'Entreprise A', nom_role: 'INTERVENANT', niveau_acces: 'ENTREPRISE' }
      ];

      const mockEntreprises: Entreprise[] = [
        { id_entreprise: '1', nom_entreprise: 'Entreprise A' },
        { id_entreprise: '2', nom_entreprise: 'Entreprise B' },
        { id_entreprise: '3', nom_entreprise: 'Entreprise C' }
      ];
      
      setRoles(mockRoles);
      setModules(mockModules);
      setUsers(mockUsers);
      setEntreprises(mockEntreprises);
      
      if (mockRoles.length > 0) {
        setSelectedRole(mockRoles[0].id_role);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      // Simulation - remplacer par un appel API réel
      const mockPermissions: Permission[] = modules.map(module => ({
        id_role_permission: `${roleId}-${module.id_module}`,
        id_module: module.id_module,
        nom_module: module.nom_module,
        peut_voir: roleId === '1' ? true : ['DASHBOARD', 'QUESTIONNAIRES', 'FORMULAIRES', 'ANALYSES'].includes(module.nom_module),
        peut_editer: roleId === '1' ? true : roleId === '2' ? ['QUESTIONNAIRES', 'FORMULAIRES', 'APPLICATIONS'].includes(module.nom_module) : ['QUESTIONNAIRES', 'FORMULAIRES'].includes(module.nom_module),
        peut_supprimer: roleId === '1' ? true : roleId === '2' ? ['FORMULAIRES'].includes(module.nom_module) : false,
        peut_administrer: roleId === '1' ? true : false
      }));
      
      setRolePermissions(mockPermissions);
      setPermissionsChanges([...mockPermissions]);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      setError('Erreur lors du chargement des permissions');
    }
  };

  const handlePermissionChange = (moduleId: string, permissionType: string, value: boolean) => {
    setPermissionsChanges(prev =>
      prev.map(perm =>
        perm.id_module === moduleId
          ? { ...perm, [permissionType]: value }
          : perm
      )
    );
  };

  const handleSavePermissions = async () => {
    try {
      // Simulation - remplacer par un appel API réel
      setRolePermissions([...permissionsChanges]);
      setEditingPermissions(false);
      setSuccess('Permissions mises à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Erreur lors de la sauvegarde des permissions');
    }
  };

  const handleCancelPermissions = () => {
    setPermissionsChanges([...rolePermissions]);
    setEditingPermissions(false);
  };

  const handleOpenCreateUserDialog = () => {
    setDialogMode('create');
    setUserFormValues({
      nom_prenom: '',
      email: '',
      organisation: '',
      id_entreprise: '',
      id_role: roles.length > 0 ? roles[0].id_role : ''
    });
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setSelectedUser(null);
  };

  const handleUserFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setUserFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitUser = async () => {
    try {
      // Simulation - remplacer par un appel API réel
      if (dialogMode === 'create') {
        setSuccess('Utilisateur créé avec succès');
      } else {
        setSuccess('Utilisateur mis à jour avec succès');
      }
      
      handleCloseUserDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
      setError('Erreur lors de la sauvegarde de l\'utilisateur');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CONSULTANT':
        return 'bg-blue-100 text-blue-800';
      case 'MANAGER':
        return 'bg-green-100 text-green-800';
      case 'INTERVENANT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Alertes */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
            onClick={() => setError(null)}
          >
            <svg className="fill-current h-6 w-6" role="button" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{success}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
            onClick={() => setSuccess(null)}
          >
            <svg className="fill-current h-6 w-6" role="button" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

      {/* En-tête */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Permissions et Utilisateurs</h1>
          <button
            onClick={handleOpenCreateUserDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouvel Utilisateur
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab(0)}
              className={`${
                activeTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Permissions par Rôle
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`${
                activeTab === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Utilisateurs
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={`${
                activeTab === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Statistiques
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {/* Onglet Permissions par Rôle */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Liste des rôles */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rôles Disponibles</h3>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id_role}
                      onClick={() => setSelectedRole(role.id_role)}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                        selectedRole === role.id_role
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">{role.nom_role}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role.nom_role)}`}>
                          {role.nombre_utilisateurs} utilisateurs
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {role.niveau_acces}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions du rôle sélectionné */}
              <div className="lg:col-span-2">
                {selectedRole && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Permissions pour {roles.find(r => r.id_role === selectedRole)?.nom_role}
                      </h3>
                      <div className="flex space-x-2">
                        {editingPermissions ? (
                          <>
                            <button
                              onClick={handleSavePermissions}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Sauvegarder
                            </button>
                            <button
                              onClick={handleCancelPermissions}
                              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingPermissions(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Modifier
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Voir</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Éditer</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Supprimer</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Administrer</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {permissionsChanges.map((permission) => (
                            <tr key={permission.id_module} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {permission.nom_module}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.peut_voir}
                                  onChange={(e) => handlePermissionChange(permission.id_module, 'peut_voir', e.target.checked)}
                                  disabled={!editingPermissions}
                                  className="form-checkbox h-4 w-4 text-blue-600 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.peut_editer}
                                  onChange={(e) => handlePermissionChange(permission.id_module, 'peut_editer', e.target.checked)}
                                  disabled={!editingPermissions}
                                  className="form-checkbox h-4 w-4 text-blue-600 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.peut_supprimer}
                                  onChange={(e) => handlePermissionChange(permission.id_module, 'peut_supprimer', e.target.checked)}
                                  disabled={!editingPermissions}
                                  className="form-checkbox h-4 w-4 text-blue-600 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.peut_administrer}
                                  onChange={(e) => handlePermissionChange(permission.id_module, 'peut_administrer', e.target.checked)}
                                  disabled={!editingPermissions}
                                  className="form-checkbox h-4 w-4 text-blue-600 disabled:opacity-50"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Onglet Utilisateurs */}
          {activeTab === 1 && (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organisation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id_acteur} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.nom_prenom}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.organisation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.nom_entreprise || 'Non assigné'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.nom_role)}`}>
                            {user.nom_role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3" title="Modifier l'utilisateur">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Onglet Statistiques */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div key={role.id_role} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{role.nom_role}</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">{role.nombre_utilisateurs}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {role.niveau_acces}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog pour créer/modifier un utilisateur */}
      {openUserDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {dialogMode === 'create' ? 'Créer un nouvel utilisateur' : 'Modifier l\'utilisateur'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom et prénom</label>
                  <input
                    type="text"
                    name="nom_prenom"
                    value={userFormValues.nom_prenom}
                    onChange={handleUserFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={userFormValues.email}
                    onChange={handleUserFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organisation</label>
                  <input
                    type="text"
                    name="organisation"
                    value={userFormValues.organisation}
                    onChange={handleUserFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                  <select
                    name="id_entreprise"
                    value={userFormValues.id_entreprise}
                    onChange={handleUserFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner une entreprise</option>
                    {entreprises.map((entreprise) => (
                      <option key={entreprise.id_entreprise} value={entreprise.id_entreprise}>
                        {entreprise.nom_entreprise}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle</label>
                  <select
                    name="id_role"
                    value={userFormValues.id_role}
                    onChange={handleUserFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {roles.map((role) => (
                      <option key={role.id_role} value={role.id_role}>
                        {role.nom_role} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                {dialogMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                    <input
                      type="password"
                      name="mot_de_passe"
                      value={userFormValues.mot_de_passe || ''}
                      onChange={handleUserFormChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseUserDialog}
                  className="px-4 py-2 text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsManagement;