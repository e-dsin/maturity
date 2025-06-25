import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Checkbox,
  Alert,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserIcon,
  ArrowLeftIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import {
  ShieldExclamationIcon
} from '@heroicons/react/24/solid';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Types existants + nouveaux pour les entreprises
interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  organisation: string;
  id_entreprise: string;
  nom_entreprise?: string;
  role: string;
  nom_role?: string;
  date_creation: string;
  date_modification: string;
  est_admin?: boolean;
  compte_actif?: boolean;
  derniere_connexion?: string;
  id_role?: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  secteur?: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  date_creation?: string;
  date_modification?: string;
  nombre_utilisateurs?: number;
  nombre_applications?: number;
}

interface Role {
  id_role: string;
  nom_role: string;
  description: string;
  niveau_acces: 'GLOBAL' | 'ENTREPRISE';
  nombre_utilisateurs?: number;
}

interface Module {
  id_module: string;
  nom_module: string;
  description: string;
  route_base: string;
  icone?: string;
  ordre_affichage: number;
  actif: boolean;
}

interface Permission {
  id_permission: string;
  id_acteur: string;
  acteur_nom?: string;
  type_ressource: 'APPLICATION' | 'QUESTIONNAIRE' | 'FORMULAIRE' | 'RAPPORT';
  id_ressource: string | null;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
}

interface RolePermission {
  id_role_permission: string;
  id_role: string;
  id_module: string;
  nom_module: string;
  module_description?: string;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
}

interface ActeurFormValues {
  nom_prenom: string;
  email: string;
  fonction: string;
  organisation: string;
  id_entreprise: string;
  mot_de_passe?: string;
  id_role: string;
}

interface RoleFormValues {
  nom_role: string;
  description: string;
  niveau_acces: 'GLOBAL' | 'ENTREPRISE';
}

interface EntrepriseFormValues {
  nom_entreprise: string;
  secteur: string;
  description: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Interface pour les droits utilisateur
interface UserRights {
  canViewAll: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManagePermissions: boolean;
  canManageModules: boolean;
  canEditAll: boolean;
  canDeleteAll: boolean;
  scope: 'GLOBAL' | 'ENTREPRISE';
}

// Composant pour les icônes Heroicons
interface HeroIconProps {
  children: React.ReactNode;
  className?: string;
}

const HeroIcon: React.FC<HeroIconProps> = ({ children, className = "h-5 w-5" }) => (
  <Box component="span" sx={{ display: 'flex', alignItems: 'center', '& svg': { width: 20, height: 20 } }}>
    {React.cloneElement(children as React.ReactElement, { className })}
  </Box>
);

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Administration: React.FC = () => {
  const { 
    hasPermission, 
    canAccessAdminModule, 
    isAdmin, 
    isSuperAdmin, 
    currentUser,
    hasGlobalAccess
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Fonction pour déterminer si l'utilisateur est consultant
  const isConsultant = (): boolean => {
    return currentUser?.nom_role?.toUpperCase() === 'CONSULTANT';
  };

  // Fonction pour obtenir le scope de l'utilisateur
  const getScope = (): 'GLOBAL' | 'ENTREPRISE' => {
    if (isSuperAdmin() || hasGlobalAccess) return 'GLOBAL';
    return currentUser?.niveau_acces || 'ENTREPRISE';
  };

  // Fonction pour déterminer si on doit filtrer par entreprise
  const shouldFilterByEntreprise = (): boolean => {
    return getScope() === 'ENTREPRISE';
  };
  
  // Fonction pour obtenir les droits utilisateur
  const getUserRights = (): UserRights => {
    const scope = getScope();
    
    if (isSuperAdmin()) {
      return {
        canViewAll: true,
        canManageUsers: true,
        canManageRoles: true,
        canManagePermissions: true,
        canManageModules: true,
        canEditAll: true,
        canDeleteAll: true,
        scope: 'GLOBAL'
      };
    }
    
    if (isAdmin()) {
      return {
        canViewAll: true,
        canManageUsers: true,
        canManageRoles: scope === 'GLOBAL',
        canManagePermissions: scope === 'GLOBAL',
        canManageModules: scope === 'GLOBAL',
        canEditAll: true,
        canDeleteAll: false, // Les admin ne peuvent pas supprimer
        scope: scope
      };
    }
    
    if (isConsultant()) {
      return {
        canViewAll: true,
        canManageUsers: false,
        canManageRoles: false,
        canManagePermissions: false,
        canManageModules: false,
        canEditAll: false,
        canDeleteAll: false,
        scope: scope
      };
    }
    
    // Utilisateur normal - pas d'accès admin
    return {
      canViewAll: false,
      canManageUsers: false,
      canManageRoles: false,
      canManagePermissions: false,
      canManageModules: false,
      canEditAll: false,
      canDeleteAll: false,
      scope: 'ENTREPRISE'
    };
  };
  
  // Obtenir les droits utilisateur
  const userRights = getUserRights();
  
  // Déterminer l'onglet initial basé sur l'URL ou localStorage
  const getInitialTab = () => {
    // Essayer de récupérer l'onglet depuis localStorage
    const savedTab = localStorage.getItem('admin-active-tab');
    if (savedTab && parseInt(savedTab) >= 0 && parseInt(savedTab) <= 4) {
      return parseInt(savedTab);
    }
    return 0; // Par défaut, onglet Utilisateurs
  };

  // États principaux
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(getInitialTab());
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'warning' | 'info'}>({
    open: false, message: '', severity: 'info'
  });
  
  // États pour les données
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  
  // États pour les dialogues
  const [openActeurDialog, setOpenActeurDialog] = useState<boolean>(false);
  const [openRoleDialog, setOpenRoleDialog] = useState<boolean>(false);
  const [openEntrepriseDialog, setOpenEntrepriseDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  
  // États pour l'édition des permissions
  const [editingPermissions, setEditingPermissions] = useState<boolean>(false);
  const [tempRolePermissions, setTempRolePermissions] = useState<RolePermission[]>([]);
  
  // États pour les formulaires
  const [acteurFormValues, setActeurFormValues] = useState<ActeurFormValues>({
    nom_prenom: '',
    email: '',
    fonction: '',
    organisation: 'DSIN',
    id_entreprise: '',  
    mot_de_passe: '',
    id_role: ''
  });
  
  const [roleFormValues, setRoleFormValues] = useState<RoleFormValues>({
    nom_role: '',
    description: '',
    niveau_acces: 'ENTREPRISE'
  });

  const [entrepriseFormValues, setEntrepriseFormValues] = useState<EntrepriseFormValues>({
    nom_entreprise: '',
    secteur: '',
    description: '',
    adresse: '',
    telephone: '',
    email: '',
    site_web: ''
  });
  
  // États pour les modes d'édition
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Fonction pour afficher les notifications
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Vérifier les permissions d'accès
  useEffect(() => {
    if (!userRights.canViewAll && !isConsultant()) {
      navigate('/');
      return;
    }
    
    loadInitialData();
  }, []);

  // Sauvegarder l'onglet actif dans localStorage
  useEffect(() => {
    localStorage.setItem('admin-active-tab', tabValue.toString());
  }, [tabValue]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActeurs(),
        loadRoles(),
        loadModules(),
        loadEntreprises()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      showSnackbar('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadActeurs = async () => {
    try {
      let response;
      try {
        response = await api.get('admin/users');
        setActeurs(response.users || response || []);
      } catch (adminError) {
        console.warn('Endpoint admin/users non disponible, utilisation de permissions-management/users');
        response = await api.get('permissions-management/users');
        setActeurs(response || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      showSnackbar('Erreur lors du chargement des utilisateurs', 'error');
    }
  };

  const loadRoles = async () => {
    try {
      let response;
      try {
        response = await api.get('admin/roles');
        setRoles(response || []);
      } catch (adminError) {
        console.warn('Endpoint admin/roles non disponible, utilisation de permissions-management/roles');
        response = await api.get('permissions-management/roles');
        setRoles(response || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      showSnackbar('Erreur lors du chargement des rôles', 'error');
    }
  };

  const loadModules = async () => {
    try {
      let response;
      try {
        response = await api.get('admin/modules');
        setModules(response || []);
      } catch (adminError) {
        console.warn('Endpoint admin/modules non disponible, utilisation de permissions-management/modules');
        response = await api.get('permissions-management/modules');
        setModules(response || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
      showSnackbar('Erreur lors du chargement des modules', 'error');
    }
  };

  const loadEntreprises = async () => {
    try {
      console.log('🔍 Chargement des entreprises...');
      const response = await api.get('entreprises');
      console.log('✅ Entreprises reçues:', response);
      
      // Gestion du format de réponse (response.entreprises ou response direct)
      const entreprisesData = (response.entreprises || response || []).map((ent: any) => ({
        id_entreprise: ent.id_entreprise,
        nom_entreprise: ent.nom_entreprise,
        secteur: ent.secteur,
        description: ent.description,
        adresse: ent.adresse,
        telephone: ent.telephone,
        email: ent.email,
        site_web: ent.site_web,
        date_creation: ent.date_creation,
        date_modification: ent.date_modification,
        nombre_utilisateurs: ent.nombre_utilisateurs || 0,
        nombre_applications: ent.nombre_applications || 0
      }));
      
      console.log('🏢 Entreprises finales:', entreprisesData);
      setEntreprises(entreprisesData);
    } catch (error) {
      console.error('❌ Erreur chargement entreprises:', error);
      showSnackbar('Erreur lors du chargement des entreprises', 'error');
      setEntreprises([
        { 
          id_entreprise: 'DSIN', 
          nom_entreprise: 'DSIN', 
          secteur: 'Public',
          description: 'Direction du Système d\'Information et du Numérique',
          adresse: '',
          telephone: '',
          email: '',
          site_web: '',
          nombre_utilisateurs: 0,
          nombre_applications: 0
        }
      ]);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      let response;
      try {
        response = await api.get(`admin/roles/${roleId}/permissions`);
        setRolePermissions(response || []);
        setTempRolePermissions(response || []);
      } catch (adminError) {
        response = await api.get(`permissions-management/roles/${roleId}/permissions`);
        setRolePermissions(response || []);
        setTempRolePermissions(response || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des permissions du rôle:', error);
      showSnackbar('Erreur lors du chargement des permissions', 'error');
    }
  };

  // Gestionnaires d'événements pour les onglets
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Vérifier si l'utilisateur a le droit d'accéder à cet onglet
    const hasAccess = [
      userRights.canViewAll, // Utilisateurs
      userRights.canManageRoles, // Rôles
      userRights.canManagePermissions, // Permissions
      userRights.canEditAll || userRights.canViewAll, // Entreprises - lecture pour consultants
      userRights.canManageModules // Modules
    ];
    
    if (hasAccess[newValue]) {
      setTabValue(newValue);
    } else {
      showSnackbar('Vous n\'avez pas les droits pour accéder à cet onglet', 'warning');
    }
  };

  // Gestionnaires pour les utilisateurs
  const handleCreateActeur = () => {
    if (!userRights.canManageUsers) {
      showSnackbar('Vous n\'avez pas les droits pour créer des utilisateurs', 'warning');
      return;
    }
    
    setDialogMode('create');
    setActeurFormValues({
      nom_prenom: '',
      email: '',
      fonction: '',
      organisation: '',
      id_entreprise: userRights.scope === 'ENTREPRISE' ? (currentUser?.id_entreprise || 'DSIN') : 'DSIN',
      mot_de_passe: '',
      id_role: ''
    });
    setOpenActeurDialog(true);
  };

  const handleEditActeur = (acteur: Acteur) => {
    if (!userRights.canEditAll) {
      showSnackbar('Vous n\'avez pas les droits pour modifier des utilisateurs', 'warning');
      return;
    }
    
    setDialogMode('edit');
    setSelectedItem(acteur);
    setActeurFormValues({
      nom_prenom: acteur.nom_prenom,
      email: acteur.email,
      fonction: acteur.role || '',
      organisation: acteur.organisation,
      id_entreprise: acteur.id_entreprise || 'DSIN',
      id_role: acteur.id_role || ''
    });
    setOpenActeurDialog(true);
  };

  // Gestionnaires pour les rôles
  const handleCreateRole = () => {
    if (!userRights.canManageRoles) {
      showSnackbar('Vous n\'avez pas les droits pour créer des rôles', 'warning');
      return;
    }
    
    setDialogMode('create');
    setRoleFormValues({
      nom_role: '',
      description: '',
      niveau_acces: 'ENTREPRISE'
    });
    setOpenRoleDialog(true);
  };

  const handleEditRole = (role: Role) => {
    if (!userRights.canManageRoles) {
      showSnackbar('Vous n\'avez pas les droits pour modifier des rôles', 'warning');
      return;
    }
    
    setDialogMode('edit');
    setSelectedItem(role);
    setRoleFormValues({
      nom_role: role.nom_role,
      description: role.description,
      niveau_acces: role.niveau_acces
    });
    setOpenRoleDialog(true);
  };

  // Gestionnaires pour les entreprises
  const handleCreateEntreprise = () => {
    if (!userRights.canEditAll) {
      showSnackbar('Vous n\'avez pas les droits pour créer des entreprises', 'warning');
      return;
    }
    
    setDialogMode('create');
    setEntrepriseFormValues({
      nom_entreprise: '',
      secteur: '',
      description: '',
      adresse: '',
      telephone: '',
      email: '',
      site_web: ''
    });
    setOpenEntrepriseDialog(true);
  };

  const handleEditEntreprise = (entreprise: Entreprise) => {
    if (!userRights.canEditAll) {
      showSnackbar('Vous n\'avez pas les droits pour modifier des entreprises', 'warning');
      return;
    }
    
    setDialogMode('edit');
    setSelectedItem(entreprise);
    setEntrepriseFormValues({
      nom_entreprise: entreprise.nom_entreprise,
      secteur: entreprise.secteur || '',
      description: entreprise.description || '',
      adresse: entreprise.adresse || '',
      telephone: entreprise.telephone || '',
      email: entreprise.email || '',
      site_web: entreprise.site_web || ''
    });
    setOpenEntrepriseDialog(true);
  };

  // Gestionnaires pour les permissions
  const handleEditPermissions = () => {
    if (!userRights.canManagePermissions) {
      showSnackbar('Vous n\'avez pas les droits pour modifier les permissions', 'warning');
      return;
    }
    
    setEditingPermissions(true);
    setTempRolePermissions([...rolePermissions]);
  };

  const handleSavePermissions = async () => {
    try {
      const permissionsData = tempRolePermissions.map(perm => ({
        id_module: perm.id_module,
        peut_voir: perm.peut_voir,
        peut_editer: perm.peut_editer,
        peut_supprimer: perm.peut_supprimer,
        peut_administrer: perm.peut_administrer
      }));

      try {
        await api.put(`admin/roles/${selectedRole}/permissions`, { permissions: permissionsData });
      } catch (adminError) {
        await api.put(`permissions-management/roles/${selectedRole}/permissions`, { permissions: permissionsData });
      }

      setRolePermissions([...tempRolePermissions]);
      setEditingPermissions(false);
      showSnackbar('Permissions mises à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des permissions:', error);
      showSnackbar('Erreur lors de la sauvegarde des permissions', 'error');
    }
  };

  const handleCancelPermissions = () => {
    setTempRolePermissions([...rolePermissions]);
    setEditingPermissions(false);
  };

  const updatePermission = (moduleId: string, field: keyof RolePermission, value: boolean) => {
    setTempRolePermissions(prev => 
      prev.map(perm => 
        perm.id_module === moduleId 
          ? { ...perm, [field]: value }
          : perm
      )
    );
  };

  // Gestionnaires de soumission
  const handleSubmitActeur = async () => {
    try {
      const apiData = {
        nom_prenom: acteurFormValues.nom_prenom,
        email: acteurFormValues.email,
        organisation: acteurFormValues.organisation,
        id_entreprise: acteurFormValues.id_entreprise,
        id_role: acteurFormValues.id_role,
        ...(dialogMode === 'create' && { mot_de_passe: acteurFormValues.mot_de_passe })
      };
      
      console.log('📤 Envoi données utilisateur:', apiData);
      
      if (dialogMode === 'create') {
        try {
          await api.post('admin/users', apiData);
        } catch (adminError) {
          console.warn('Endpoint admin/users non disponible, utilisation de permissions-management/users');
          await api.post('permissions-management/users', apiData);
        }
        showSnackbar('Utilisateur créé avec succès', 'success');
      } else if (selectedItem) {
        try {
          await api.put(`admin/users/${selectedItem.id_acteur}`, apiData);
        } catch (adminError) {
          await api.put(`acteurs/${selectedItem.id_acteur}`, apiData);
        }
        showSnackbar('Utilisateur mis à jour avec succès', 'success');
      }
      
      await loadActeurs();
      setOpenActeurDialog(false);
      console.log('✅ Utilisateur sauvegardé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de l\'utilisateur:', error);
      showSnackbar('Erreur lors de la sauvegarde de l\'utilisateur', 'error');
    }
  };

  const handleSubmitRole = async () => {
    try {
      if (dialogMode === 'create') {
        try {
          await api.post('admin/roles', roleFormValues);
        } catch (adminError) {
          await api.post('permissions-management/roles', roleFormValues);
        }
        showSnackbar('Rôle créé avec succès', 'success');
      } else if (selectedItem) {
        try {
          await api.put(`admin/roles/${selectedItem.id_role}`, roleFormValues);
        } catch (adminError) {
          await api.put(`permissions-management/roles/${selectedItem.id_role}`, roleFormValues);
        }
        showSnackbar('Rôle mis à jour avec succès', 'success');
      }
      
      await loadRoles();
      setOpenRoleDialog(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rôle:', error);
      showSnackbar('Erreur lors de la sauvegarde du rôle', 'error');
    }
  };

  const handleSubmitEntreprise = async () => {
    try {
      if (dialogMode === 'create') {
        await api.post('entreprises', entrepriseFormValues);
        showSnackbar('Entreprise créée avec succès', 'success');
      } else if (selectedItem) {
        await api.put(`entreprises/${selectedItem.id_entreprise}`, entrepriseFormValues);
        showSnackbar('Entreprise mise à jour avec succès', 'success');
      }
      
      await loadEntreprises();
      setOpenEntrepriseDialog(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'entreprise:', error);
      showSnackbar('Erreur lors de la sauvegarde de l\'entreprise', 'error');
    }
  };

  const handleDeleteItem = async () => {
    try {
      if (!selectedItem) return;
      
      if (tabValue === 0) { // Utilisateurs
        try {
          await api.delete(`admin/users/${selectedItem.id_acteur}`);
        } catch (adminError) {
          await api.delete(`acteurs/${selectedItem.id_acteur}`);
        }
        await loadActeurs();
        showSnackbar('Utilisateur supprimé avec succès', 'success');
      } else if (tabValue === 1) { // Rôles
        try {
          await api.delete(`admin/roles/${selectedItem.id_role}`);
        } catch (adminError) {
          await api.delete(`permissions-management/roles/${selectedItem.id_role}`);
        }
        await loadRoles();
        showSnackbar('Rôle supprimé avec succès', 'success');
      } else if (tabValue === 3) { // Entreprises
        await api.delete(`entreprises/${selectedItem.id_entreprise}`);
        await loadEntreprises();
        showSnackbar('Entreprise supprimée avec succès', 'success');
      }
      
      setOpenDeleteDialog(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showSnackbar('Erreur lors de la suppression', 'error');
    }
  };

  const getRoleLabel = (role: string, nom_role?: string) => {
    const displayRole = nom_role || role;
    
    switch (displayRole) {
      case 'SUPER_ADMINISTRATEUR':
      case 'SuperAdmin':
        return { 
          label: 'Super Admin', 
          color: 'error' as const, 
          icon: <HeroIcon><ShieldExclamationIcon /></HeroIcon> 
        };
      case 'ADMINISTRATEUR':
      case 'Admin':
        return { 
          label: 'Admin', 
          color: 'primary' as const, 
          icon: <HeroIcon><ShieldCheckIcon /></HeroIcon> 
        };
      case 'CONSULTANT':
        return { 
          label: 'Consultant', 
          color: 'secondary' as const, 
          icon: <HeroIcon><UserGroupIcon /></HeroIcon> 
        };
      case 'MANAGER':
        return { 
          label: 'Manager', 
          color: 'info' as const, 
          icon: <HeroIcon><UsersIcon /></HeroIcon> 
        };
      case 'INTERVENANT':
      default:
        return { 
          label: 'Intervenant', 
          color: 'default' as const, 
          icon: <HeroIcon><UserIcon /></HeroIcon> 
        };
    }
  };

  const canManageUser = (acteur: Acteur): boolean => {
    if (isSuperAdmin()) return true;
    
    if (isAdmin()) {
      const userRole = getRoleLabel(acteur.role, acteur.nom_role);
      // Admin ne peut pas gérer les super admin
      return userRole.label !== 'Super Admin';
    }
    
    return false;
  };

  const getEntrepriseName = (id: string) => {
    if (!id) return 'Non spécifiée';
    const entreprise = entreprises.find(ent => ent.id_entreprise === id);
    return entreprise ? entreprise.nom_entreprise : id;
  };

  const getAvailableTabs = () => {
    const tabs = [
      { label: 'Utilisateurs', icon: <UsersIcon />, enabled: userRights.canViewAll },
      { label: 'Rôles', icon: <UserGroupIcon />, enabled: userRights.canManageRoles },
      { label: 'Permissions', icon: <ShieldCheckIcon />, enabled: userRights.canManagePermissions },
      { label: 'Entreprises', icon: <BuildingOfficeIcon />, enabled: userRights.canEditAll || userRights.canViewAll },
      { label: 'Modules', icon: <Cog6ToothIcon />, enabled: userRights.canManageModules }
    ];
    
    return tabs;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!userRights.canViewAll && !isConsultant()) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Accès non autorisé. Vous devez avoir les permissions appropriées pour accéder à cette page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid size={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <HeroIcon><ShieldCheckIcon /></HeroIcon>
                <Box>
                  <Typography component="h1" variant="h5" color="primary">
                    Administration Système
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {userRights.scope === 'GLOBAL' ? 'Vue globale' : `Vue limitée - ${getEntrepriseName(currentUser?.id_entreprise || '')}`}
                    {isConsultant() && ' (Consultation seule)'}
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" gap={1}>
                <Chip 
                  icon={<HeroIcon><ShieldExclamationIcon /></HeroIcon>}
                  label={isSuperAdmin() ? "Super Administrateur" : isAdmin() ? "Administrateur" : isConsultant() ? "Consultant" : "Utilisateur"}
                  color={isSuperAdmin() ? "error" : isAdmin() ? "primary" : isConsultant() ? "secondary" : "default"}
                  variant="filled"
                />
                {!userRights.canEditAll && (
                  <Chip 
                    icon={<HeroIcon><EyeIcon /></HeroIcon>}
                    label="Lecture seule"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            {/* Statistiques rapides */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="primary">
                      {acteurs.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Utilisateurs{userRights.scope === 'ENTREPRISE' ? ' (Entreprise)' : ''}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="secondary">
                      {roles.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rôles
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="info">
                      {entreprises.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Entreprises
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="success">
                      {acteurs.filter(a => getRoleLabel(a.role, a.nom_role).label === 'Admin').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Administrateurs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Onglets principaux */}
        <Grid size={12}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {getAvailableTabs().map((tab, index) => (
                <Tab 
                  key={index}
                  label={tab.label} 
                  icon={<HeroIcon>{tab.icon}</HeroIcon>}
                  iconPosition="start"
                  disabled={!tab.enabled}
                />
              ))}
            </Tabs>

            {/* Onglet Utilisateurs */}
            <TabPanel value={tabValue} index={0}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Gestion des Utilisateurs</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<HeroIcon><PlusIcon /></HeroIcon>}
                  onClick={handleCreateActeur}
                  disabled={!userRights.canManageUsers}
                >
                  Nouvel Utilisateur
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Fonction</TableCell>
                      <TableCell>Organisation</TableCell>
                      <TableCell>Entreprise</TableCell>
                      <TableCell>Rôle</TableCell>
                      {userRights.canEditAll && <TableCell>Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {acteurs.map((acteur) => {
                      const roleInfo = getRoleLabel(acteur.role, acteur.nom_role);
                      const canManage = canManageUser(acteur);
                      
                      return (
                        <TableRow key={acteur.id_acteur} hover>
                          <TableCell>{acteur.nom_prenom}</TableCell>
                          <TableCell>{acteur.email}</TableCell>
                          <TableCell>{acteur.role}</TableCell>
                          <TableCell>{acteur.organisation}</TableCell>
                          <TableCell>{getEntrepriseName(acteur.id_entreprise)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={roleInfo.label} 
                              color={roleInfo.color} 
                              icon={roleInfo.icon}
                              size="small"
                            />
                          </TableCell>
                          {userRights.canEditAll && (
                            <TableCell>
                              <Tooltip title={canManage ? "Modifier l'utilisateur" : "Droits insuffisants"}>
                                <span>
                                  <IconButton 
                                    color="primary" 
                                    onClick={() => handleEditActeur(acteur)}
                                    disabled={!canManage}
                                  >
                                    <HeroIcon><PencilIcon /></HeroIcon>
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={canManage && userRights.canDeleteAll ? "Supprimer l'utilisateur" : "Droits insuffisants"}>
                                <span>
                                  <IconButton 
                                    color="error" 
                                    onClick={() => {
                                      setSelectedItem(acteur);
                                      setOpenDeleteDialog(true);
                                    }}
                                    disabled={!canManage || !userRights.canDeleteAll}
                                  >
                                    <HeroIcon><TrashIcon /></HeroIcon>
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Onglet Rôles */}
            <TabPanel value={tabValue} index={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Gestion des Rôles</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<HeroIcon><PlusIcon /></HeroIcon>}
                  onClick={handleCreateRole}
                  disabled={!userRights.canManageRoles}
                >
                  Nouveau Rôle
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom du Rôle</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Niveau d'Accès</TableCell>
                      <TableCell>Utilisateurs</TableCell>
                      {userRights.canManageRoles && <TableCell>Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id_role} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {role.nom_role === 'SUPER_ADMINISTRATEUR' && <HeroIcon><ShieldExclamationIcon /></HeroIcon>}
                            {role.nom_role === 'ADMINISTRATEUR' && <HeroIcon><ShieldCheckIcon /></HeroIcon>}
                            {role.nom_role === 'CONSULTANT' && <HeroIcon><UserGroupIcon /></HeroIcon>}
                            {role.nom_role === 'MANAGER' && <HeroIcon><UsersIcon /></HeroIcon>}
                            {role.nom_role === 'INTERVENANT' && <HeroIcon><UserIcon /></HeroIcon>}
                            <Typography variant="body2">{role.nom_role}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <Chip 
                            label={role.niveau_acces} 
                            color={role.niveau_acces === 'GLOBAL' ? 'primary' : 'default'} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge badgeContent={role.nombre_utilisateurs || 0} color="primary">
                            <HeroIcon><UserGroupIcon /></HeroIcon>
                          </Badge>
                        </TableCell>
                        {userRights.canManageRoles && (
                          <TableCell>
                            <IconButton 
                              color="primary" 
                              onClick={() => handleEditRole(role)}
                            >
                              <HeroIcon><PencilIcon /></HeroIcon>
                            </IconButton>
                            <IconButton 
                              color="error" 
                              onClick={() => {
                                setSelectedItem(role);
                                setOpenDeleteDialog(true);
                              }}
                              disabled={!userRights.canDeleteAll || (role.nombre_utilisateurs || 0) > 0}
                            >
                              <HeroIcon><TrashIcon /></HeroIcon>
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Onglet Permissions */}
            <TabPanel value={tabValue} index={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Gestion des Permissions par Rôle</Typography>
                {selectedRole && rolePermissions.length > 0 && (
                  <Box>
                    {editingPermissions ? (
                      <>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<HeroIcon><CheckIcon /></HeroIcon>}
                          onClick={handleSavePermissions}
                          sx={{ mr: 1 }}
                        >
                          Sauvegarder
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<HeroIcon><XMarkIcon /></HeroIcon>}
                          onClick={handleCancelPermissions}
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<HeroIcon><PencilIcon /></HeroIcon>}
                        onClick={handleEditPermissions}
                        disabled={!userRights.canManagePermissions}
                      >
                        Modifier les Permissions
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Sélectionner un rôle</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setEditingPermissions(false);
                    if (e.target.value) {
                      loadRolePermissions(e.target.value);
                    }
                  }}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id_role} value={role.id_role}>
                      {role.nom_role} - {role.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedRole && (editingPermissions ? tempRolePermissions : rolePermissions).length > 0 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Module</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="center">Voir</TableCell>
                        <TableCell align="center">Éditer</TableCell>
                        <TableCell align="center">Supprimer</TableCell>
                        <TableCell align="center">Administrer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(editingPermissions ? tempRolePermissions : rolePermissions).map((perm) => (
                        <TableRow key={perm.id_role_permission || perm.id_module}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {perm.nom_module}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {perm.module_description}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {editingPermissions ? (
                              <Switch
                                checked={perm.peut_voir}
                                onChange={(e) => updatePermission(perm.id_module, 'peut_voir', e.target.checked)}
                                color="primary"
                              />
                            ) : (
                              <Checkbox checked={perm.peut_voir} disabled />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {editingPermissions ? (
                              <Switch
                                checked={perm.peut_editer}
                                onChange={(e) => updatePermission(perm.id_module, 'peut_editer', e.target.checked)}
                                color="primary"
                                disabled={!perm.peut_voir}
                              />
                            ) : (
                              <Checkbox checked={perm.peut_editer} disabled />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {editingPermissions ? (
                              <Switch
                                checked={perm.peut_supprimer}
                                onChange={(e) => updatePermission(perm.id_module, 'peut_supprimer', e.target.checked)}
                                color="primary"
                                disabled={!perm.peut_editer}
                              />
                            ) : (
                              <Checkbox checked={perm.peut_supprimer} disabled />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {editingPermissions ? (
                              <Switch
                                checked={perm.peut_administrer}
                                onChange={(e) => updatePermission(perm.id_module, 'peut_administrer', e.target.checked)}
                                color="primary"
                                disabled={!perm.peut_editer}
                              />
                            ) : (
                              <Checkbox checked={perm.peut_administrer} disabled />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {selectedRole && rolePermissions.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Aucune permission définie pour ce rôle.
                </Alert>
              )}
            </TabPanel>

            {/* Onglet Entreprises */}
            <TabPanel value={tabValue} index={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Gestion des Entreprises</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<HeroIcon><PlusIcon /></HeroIcon>}
                  onClick={handleCreateEntreprise}
                  disabled={!userRights.canEditAll}
                >
                  Nouvelle Entreprise
                </Button>
              </Box>
              
              {!userRights.canEditAll && userRights.canViewAll && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Vous consultez les entreprises en mode lecture seule.
                </Alert>
              )}
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Secteur</TableCell>
                      <TableCell>Utilisateurs</TableCell>
                      <TableCell>Applications</TableCell>
                      <TableCell>Date Création</TableCell>
                      {userRights.canEditAll && <TableCell>Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entreprises.map((entreprise) => (
                      <TableRow key={entreprise.id_entreprise} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {entreprise.nom_entreprise}
                            </Typography>
                            {entreprise.description && (
                              <Typography variant="caption" color="text.secondary">
                                {entreprise.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={entreprise.secteur || 'Non défini'} 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge badgeContent={entreprise.nombre_utilisateurs || 0} color="primary">
                            <HeroIcon><UsersIcon /></HeroIcon>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge badgeContent={entreprise.nombre_applications || 0} color="secondary">
                            <HeroIcon><Cog6ToothIcon /></HeroIcon>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entreprise.date_creation ? 
                            new Date(entreprise.date_creation).toLocaleDateString() : 
                            'Non définie'
                          }
                        </TableCell>
                        {userRights.canEditAll && (
                          <TableCell>
                            <IconButton 
                              color="primary" 
                              onClick={() => handleEditEntreprise(entreprise)}
                            >
                              <HeroIcon><PencilIcon /></HeroIcon>
                            </IconButton>
                            <IconButton 
                              color="error" 
                              onClick={() => {
                                setSelectedItem(entreprise);
                                setOpenDeleteDialog(true);
                              }}
                              disabled={!userRights.canDeleteAll || (entreprise.nombre_utilisateurs || 0) > 0}
                            >
                              <HeroIcon><TrashIcon /></HeroIcon>
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Onglet Modules */}
            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6" gutterBottom>Configuration des Modules</Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Module</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Route</TableCell>
                      <TableCell>Ordre</TableCell>
                      <TableCell>Statut</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module.id_module}>
                        <TableCell>{module.nom_module}</TableCell>
                        <TableCell>{module.description}</TableCell>
                        <TableCell>
                          <code>{module.route_base}</code>
                        </TableCell>
                        <TableCell>{module.ordre_affichage}</TableCell>
                        <TableCell>
                          <Chip 
                            label={module.actif ? 'Actif' : 'Inactif'} 
                            color={module.actif ? 'success' : 'default'} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogues */}
      {/* Dialog pour créer/modifier un utilisateur */}
      <Dialog open={openActeurDialog} onClose={() => setOpenActeurDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer un nouvel utilisateur' : 'Modifier l\'utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  required
                  fullWidth
                  label="Nom et prénom"
                  value={acteurFormValues.nom_prenom}
                  onChange={(e) => setActeurFormValues({...acteurFormValues, nom_prenom: e.target.value})}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Email"
                  value={acteurFormValues.email}
                  onChange={(e) => setActeurFormValues({...acteurFormValues, email: e.target.value})}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Fonction"
                  value={acteurFormValues.fonction}
                  onChange={(e) => setActeurFormValues({...acteurFormValues, fonction: e.target.value})}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Organisation/Département"
                  placeholder="ex: IT, RH, Finance..."
                  value={acteurFormValues.organisation}
                  onChange={(e) => setActeurFormValues({...acteurFormValues, organisation: e.target.value})}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Rôle</InputLabel>
                  <Select
                    value={acteurFormValues.id_role}
                    onChange={(e) => setActeurFormValues({...acteurFormValues, id_role: e.target.value})}
                  >
                    {roles.filter(role => {
                      // Filtrer les rôles selon les droits utilisateur
                      if (userRights.scope === 'ENTREPRISE') {
                        return role.niveau_acces === 'ENTREPRISE' || role.nom_role === 'INTERVENANT';
                      }
                      return true;
                    }).map((role) => (
                      <MenuItem key={role.id_role} value={role.id_role}>
                        {role.nom_role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel id="entreprise-label">Entreprise</InputLabel>
                  <Select
                    labelId="entreprise-label"
                    value={acteurFormValues.id_entreprise}
                    label="Entreprise"
                    onChange={(e) => setActeurFormValues({...acteurFormValues, id_entreprise: e.target.value})}
                    disabled={userRights.scope === 'ENTREPRISE'}
                  >
                    {entreprises.map((entreprise) => (
                      <MenuItem key={entreprise.id_entreprise} value={entreprise.id_entreprise}>
                        {entreprise.nom_entreprise}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {dialogMode === 'create' && (
                <Grid size={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Mot de passe"
                    value={acteurFormValues.mot_de_passe}
                    onChange={(e) => setActeurFormValues({...acteurFormValues, mot_de_passe: e.target.value})}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenActeurDialog(false)}>Annuler</Button>
          <Button onClick={handleSubmitActeur} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour créer/modifier un rôle */}
      <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer un nouveau rôle' : 'Modifier le rôle'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  required
                  fullWidth
                  label="Nom du rôle"
                  value={roleFormValues.nom_role}
                  onChange={(e) => setRoleFormValues({...roleFormValues, nom_role: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={roleFormValues.description}
                  onChange={(e) => setRoleFormValues({...roleFormValues, description: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth>
                  <InputLabel>Niveau d'accès</InputLabel>
                  <Select
                    value={roleFormValues.niveau_acces}
                    onChange={(e) => setRoleFormValues({...roleFormValues, niveau_acces: e.target.value as 'GLOBAL' | 'ENTREPRISE'})}
                  >
                    <MenuItem value="ENTREPRISE">Entreprise</MenuItem>
                    <MenuItem value="GLOBAL">Global</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRoleDialog(false)}>Annuler</Button>
          <Button onClick={handleSubmitRole} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour créer/modifier une entreprise */}
      <Dialog open={openEntrepriseDialog} onClose={() => setOpenEntrepriseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer une nouvelle entreprise' : 'Modifier l\'entreprise'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Nom de l'entreprise"
                  value={entrepriseFormValues.nom_entreprise}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, nom_entreprise: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Secteur"
                  value={entrepriseFormValues.secteur}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, secteur: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={entrepriseFormValues.description}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, description: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Adresse"
                  value={entrepriseFormValues.adresse}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, adresse: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  value={entrepriseFormValues.telephone}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, telephone: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  value={entrepriseFormValues.email}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, email: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Site web"
                  placeholder="https://"
                  value={entrepriseFormValues.site_web}
                  onChange={(e) => setEntrepriseFormValues({...entrepriseFormValues, site_web: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEntrepriseDialog(false)}>Annuler</Button>
          <Button onClick={handleSubmitEntreprise} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={handleDeleteItem} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Administration;