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
  CardHeader,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Checkbox,
  FormControlLabel,
  Switch,
  Alert,
  Badge,
  Tooltip,
  ListItemIcon
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  SupervisorAccount as AdminIcon,
  Group as GroupIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as SuperAdminIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Types
interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  organisation: string;      // Département/Service interne
  id_entreprise: string;     // Clé étrangère vers entreprises
  nom_entreprise?: string;   // Nom résolu de l'entreprise
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
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
}

interface ActeurFormValues {
  nom_prenom: string;
  email: string;
  fonction: string;
  organisation: string;      // Département interne
  id_entreprise: string;     // ID de l'entreprise sélectionnée
  mot_de_passe?: string;
  id_role: string;
}

interface RoleFormValues {
  nom_role: string;
  description: string;
  niveau_acces: 'GLOBAL' | 'ENTREPRISE';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

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
  const { hasPermission, canAccessAdminModule, isAdmin, isSuperAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Déterminer l'onglet initial basé sur l'URL
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/users')) return 0;
    if (path.includes('/admin/roles')) return 1;
    if (path.includes('/admin/permissions')) return 2;
    if (path.includes('/admin/modules')) return 3;
    return 0; // Par défaut, onglet utilisateurs
  };

  // États principaux
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(getInitialTab());
  
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
  const [openPermissionDialog, setOpenPermissionDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  
  // États pour les formulaires
  const [acteurFormValues, setActeurFormValues] = useState<ActeurFormValues>({
    nom_prenom: '',
    email: '',
    fonction: '',
    organisation: '',
    id_entreprise: 'DSIN',  // Valeur par défaut
    mot_de_passe: '',
    id_role: ''
  });
  
  const [roleFormValues, setRoleFormValues] = useState<RoleFormValues>({
    nom_role: '',
    description: '',
    niveau_acces: 'ENTREPRISE'
  });
  
  // États pour les modes d'édition
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Vérifier les permissions d'accès
  useEffect(() => {
    if (!isAdmin() && !isSuperAdmin()) {
      navigate('/');
      return;
    }
    
    // Charger les données initiales
    loadInitialData();
  }, []);

  // Mettre à jour l'URL quand l'onglet change
  useEffect(() => {
    const paths = ['/admin/users', '/admin/roles', '/admin/permissions', '/admin/modules'];
    const currentPath = paths[tabValue];
    if (location.pathname !== currentPath) {
      navigate(currentPath, { replace: true });
    }
  }, [tabValue, navigate, location.pathname]);

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
    } finally {
      setLoading(false);
    }
  };

  const loadActeurs = async () => {
    try {
      const response = await api.get('permissions-management/users');
      setActeurs(response || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('permissions-management/roles');
      setRoles(response || []);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
    }
  };

  const loadModules = async () => {
    try {
      const response = await api.get('permissions-management/modules');
      setModules(response || []);
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
    }
  };

  const loadEntreprises = async () => {
    try {
      console.log('🔍 Chargement des entreprises...');
      const response = await api.get('entreprises');
      console.log('✅ Entreprises reçues:', response);
      
      const entreprisesData = response.map((ent: any) => ({
        id_entreprise: ent.id_entreprise,
        nom_entreprise: ent.nom_entreprise,
        secteur: ent.secteur
      }));
      
      // Ajouter DSIN en premier si pas présent
      const dsinExists = entreprisesData.some((ent: Entreprise) => 
        ent.nom_entreprise === 'DSIN' || ent.id_entreprise === 'DSIN'
      );
      
      if (!dsinExists) {
        entreprisesData.unshift({
          id_entreprise: 'DSIN',
          nom_entreprise: 'DSIN',
          secteur: 'Public'
        });
      }
      
      console.log('🏢 Entreprises finales:', entreprisesData);
      setEntreprises(entreprisesData);
    } catch (error) {
      console.error('❌ Erreur chargement entreprises:', error);
      // Fallback
      setEntreprises([
        { id_entreprise: 'DSIN', nom_entreprise: 'DSIN', secteur: 'Public' },
        { id_entreprise: 'AUTRE', nom_entreprise: 'Autre', secteur: 'Autre' }
      ]);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const response = await api.get(`permissions-management/roles/${roleId}/permissions`);
      setRolePermissions(response || []);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions du rôle:', error);
    }
  };

  // Gestionnaires d'événements
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateActeur = () => {
    setDialogMode('create');
    setActeurFormValues({
      nom_prenom: '',
      email: '',
      fonction: '',
      organisation: '',
      id_entreprise: 'DSIN',
      mot_de_passe: '',
      id_role: ''
    });
    setOpenActeurDialog(true);
  };

  const handleEditActeur = (acteur: Acteur) => {
    setDialogMode('edit');
    setSelectedItem(acteur);
    setActeurFormValues({
      nom_prenom: acteur.nom_prenom,
      email: acteur.email,
      fonction: acteur.role || '',  // Mapper role vers fonction
      organisation: acteur.organisation,
      id_entreprise: acteur.id_entreprise || 'DSIN',
      id_role: acteur.id_role || ''
    });
    setOpenActeurDialog(true);
  };

  const handleCreateRole = () => {
    setDialogMode('create');
    setRoleFormValues({
      nom_role: '',
      description: '',
      niveau_acces: 'ENTREPRISE'
    });
    setOpenRoleDialog(true);
  };

  const handleEditRole = (role: Role) => {
    setDialogMode('edit');
    setSelectedItem(role);
    setRoleFormValues({
      nom_role: role.nom_role,
      description: role.description,
      niveau_acces: role.niveau_acces
    });
    setOpenRoleDialog(true);
  };

  const handleSubmitActeur = async () => {
    try {
      // Préparer les données pour l'API
      const apiData = {
        nom_prenom: acteurFormValues.nom_prenom,
        email: acteurFormValues.email,
        fonction: acteurFormValues.fonction,
        organisation: acteurFormValues.organisation,
        id_entreprise: acteurFormValues.id_entreprise,
        id_role: acteurFormValues.id_role,
        ...(dialogMode === 'create' && { mot_de_passe: acteurFormValues.mot_de_passe })
      };
      
      if (dialogMode === 'create') {
        await api.post('permissions-management/users', apiData);
      } else if (selectedItem) {
        await api.put(`acteurs/${selectedItem.id_acteur}`, apiData);
      }
      
      await loadActeurs();
      setOpenActeurDialog(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
    }
  };

  const handleSubmitRole = async () => {
    try {
      if (dialogMode === 'create') {
        await api.post('permissions-management/roles', roleFormValues);
      } else if (selectedItem) {
        await api.put(`permissions-management/roles/${selectedItem.id_role}`, roleFormValues);
      }
      
      await loadRoles();
      setOpenRoleDialog(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rôle:', error);
    }
  };

  const handleDeleteItem = async () => {
    try {
      if (!selectedItem) return;
      
      if (tabValue === 0) { // Utilisateurs
        await api.delete(`acteurs/${selectedItem.id_acteur}`);
        await loadActeurs();
      } else if (tabValue === 1) { // Rôles
        await api.delete(`permissions-management/roles/${selectedItem.id_role}`);
        await loadRoles();
      }
      
      setOpenDeleteDialog(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const getRoleLabel = (role: string, nom_role?: string) => {
    const displayRole = nom_role || role;
    
    switch (displayRole) {
      case 'SUPER_ADMINISTRATEUR':
      case 'SuperAdmin':
        return { label: 'Super Admin', color: 'error' as const, icon: <SuperAdminIcon /> };
      case 'ADMINISTRATEUR':
      case 'Admin':
        return { label: 'Admin', color: 'primary' as const, icon: <AdminIcon /> };
      case 'CONSULTANT':
        return { label: 'Consultant', color: 'secondary' as const, icon: <ShieldIcon /> };
      case 'MANAGER':
        return { label: 'Manager', color: 'info' as const, icon: <GroupIcon /> };
      case 'INTERVENANT':
      default:
        return { label: 'Intervenant', color: 'default' as const, icon: <PersonIcon /> };
    }
  };

  const canManageUser = (acteur: Acteur): boolean => {
    // Super admin peut tout gérer
    if (isSuperAdmin()) return true;
    
    // Admin ne peut pas gérer les super admins
    if (isAdmin()) {
      const userRole = getRoleLabel(acteur.role, acteur.nom_role);
      return userRole.label !== 'Super Admin';
    }
    
    return false;
  };

  // Fonction pour obtenir le nom d'une entreprise
  const getEntrepriseName = (id: string) => {
    if (!id) return 'Non spécifiée';
    const entreprise = entreprises.find(ent => ent.id_entreprise === id);
    return entreprise ? entreprise.nom_entreprise : id;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin() && !isSuperAdmin()) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Accès non autorisé. Vous devez être administrateur pour accéder à cette page.
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
                <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography component="h1" variant="h5" color="primary">
                    Administration Système
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Gestion des utilisateurs, rôles et permissions
                  </Typography>
                </Box>
              </Box>
              
              {(isAdmin() || isSuperAdmin()) && (
                <Box display="flex" gap={1}>
                  <Chip 
                    icon={<SuperAdminIcon />}
                    label={isSuperAdmin() ? "Super Administrateur" : "Administrateur"}
                    color={isSuperAdmin() ? "error" : "primary"}
                    variant="filled"
                  />
                </Box>
              )}
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
                      Utilisateurs
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
                      {modules.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Modules
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
              <Tab 
                label="Utilisateurs" 
                icon={<PersonIcon />}
                iconPosition="start"
                disabled={!canAccessAdminModule('USERS')}
              />
              <Tab 
                label="Rôles" 
                icon={<GroupIcon />}
                iconPosition="start"
                disabled={!canAccessAdminModule('ROLES')}
              />
              <Tab 
                label="Permissions" 
                icon={<SecurityIcon />}
                iconPosition="start"
                disabled={!canAccessAdminModule('PERMISSIONS')}
              />
              <Tab 
                label="Modules" 
                icon={<SettingsIcon />}
                iconPosition="start"
                disabled={!canAccessAdminModule('SYSTEM')}
              />
            </Tabs>

            {/* Onglet Utilisateurs */}
            <TabPanel value={tabValue} index={0}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Gestion des Utilisateurs</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateActeur}
                  disabled={!hasPermission('ADMIN_USERS', 'editer')}
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
                      <TableCell>Actions</TableCell>
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
                          <TableCell>
                            <Tooltip title={canManage ? "Modifier l'utilisateur" : "Droits insuffisants"}>
                              <span>
                                <IconButton 
                                  color="primary" 
                                  onClick={() => handleEditActeur(acteur)}
                                  disabled={!canManage || !hasPermission('ADMIN_USERS', 'editer')}
                                >
                                  <EditIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={canManage ? "Supprimer l'utilisateur" : "Droits insuffisants"}>
                              <span>
                                <IconButton 
                                  color="error" 
                                  onClick={() => {
                                    setSelectedItem(acteur);
                                    setOpenDeleteDialog(true);
                                  }}
                                  disabled={!canManage || !hasPermission('ADMIN_USERS', 'supprimer')}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
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
                  startIcon={<AddIcon />}
                  onClick={handleCreateRole}
                  disabled={!isSuperAdmin() || !hasPermission('ADMIN_ROLES', 'editer')}
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
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id_role} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {role.nom_role === 'SUPER_ADMINISTRATEUR' && <SuperAdminIcon color="error" />}
                            {role.nom_role === 'ADMINISTRATEUR' && <AdminIcon color="primary" />}
                            {role.nom_role === 'CONSULTANT' && <ShieldIcon color="secondary" />}
                            {role.nom_role === 'MANAGER' && <GroupIcon color="info" />}
                            {role.nom_role === 'INTERVENANT' && <PersonIcon />}
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
                            <GroupIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            color="primary" 
                            onClick={() => handleEditRole(role)}
                            disabled={!isSuperAdmin() || !hasPermission('ADMIN_ROLES', 'editer')}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => {
                              setSelectedItem(role);
                              setOpenDeleteDialog(true);
                            }}
                            disabled={!isSuperAdmin() || !hasPermission('ADMIN_ROLES', 'supprimer') || (role.nombre_utilisateurs || 0) > 0}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Onglet Permissions */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>Gestion des Permissions par Rôle</Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Sélectionner un rôle</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
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

              {selectedRole && rolePermissions.length > 0 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Module</TableCell>
                        <TableCell align="center">Voir</TableCell>
                        <TableCell align="center">Éditer</TableCell>
                        <TableCell align="center">Supprimer</TableCell>
                        <TableCell align="center">Administrer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rolePermissions.map((perm) => (
                        <TableRow key={perm.id_role_permission}>
                          <TableCell>{perm.nom_module}</TableCell>
                          <TableCell align="center">
                            <Checkbox checked={perm.peut_voir} disabled />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox checked={perm.peut_editer} disabled />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox checked={perm.peut_supprimer} disabled />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox checked={perm.peut_administrer} disabled />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Onglet Modules */}
            <TabPanel value={tabValue} index={3}>
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
                    {roles.map((role) => (
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
    </Container>
  );
};

export default Administration;