import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
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
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

// Types
interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  fonction: string;
  organisation: string;
  date_creation: string;
  date_modification: string;
  est_admin?: boolean;
}

interface ActeurFormValues {
  nom_prenom: string;
  email: string;
  fonction: string;
  organisation: string;
  entreprise: string;
  mot_de_passe?: string;
  est_admin: boolean;
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

interface PermissionFormValues {
  id_acteur: string;
  type_ressource: 'APPLICATION' | 'QUESTIONNAIRE' | 'FORMULAIRE' | 'RAPPORT';
  id_ressource: string | null;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
}

interface RessourceOption {
  id: string;
  nom: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
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
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
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

const initialActeurFormValues: ActeurFormValues = {
  nom_prenom: '',
  email: '',
  fonction: '',
  organisation: '',
  entreprise: 'DSIN', // Valeur par défaut
  mot_de_passe: '',
  est_admin: false
};

const initialPermissionFormValues: PermissionFormValues = {
  id_acteur: '',
  type_ressource: 'APPLICATION',
  id_ressource: null,
  peut_voir: true,
  peut_editer: false,
  peut_supprimer: false,
  peut_administrer: false
};

// Composant principal
const Users: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // États pour les données
  const [loading, setLoading] = useState<boolean>(true);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [selectedActeur, setSelectedActeur] = useState<Acteur | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tabValue, setTabValue] = useState<number>(0);
  
  // États pour les ressources disponibles
  const [applications, setApplications] = useState<RessourceOption[]>([]);
  const [questionnaires, setQuestionnaires] = useState<RessourceOption[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  
  // États pour les formulaires
  const [acteurFormValues, setActeurFormValues] = useState<ActeurFormValues>(initialActeurFormValues);
  const [permissionFormValues, setPermissionFormValues] = useState<PermissionFormValues>(initialPermissionFormValues);
  
  // États pour les dialogues
  const [openActeurDialog, setOpenActeurDialog] = useState<boolean>(false);
  const [openPermissionDialog, setOpenPermissionDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [openDeletePermissionDialog, setOpenDeletePermissionDialog] = useState<boolean>(false);
  const [currentPermission, setCurrentPermission] = useState<Permission | null>(null);
  
  // États pour le mode d'édition
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [permissionDialogMode, setPermissionDialogMode] = useState<'create' | 'edit'>('create');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Charger tous les acteurs au démarrage
  useEffect(() => {
    if (id) {
      fetchActeurById(id);
    } else {
      fetchActeurs();
    }
    
    // Charger les ressources disponibles pour les permissions
    fetchResources();
    
    // Charger les entreprises
    fetchEntreprises();
  }, [id]);

  // Récupérer tous les acteurs
  const fetchActeurs = async () => {
    setLoading(true);
    try {
      const response = await api.get('acteurs');
      setActeurs(response);
      setViewMode('list');
    } catch (error) {
      console.error('Erreur lors du chargement des acteurs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer un acteur par son ID
  const fetchActeurById = async (acteurId: string) => {
    setLoading(true);
    try {
      const acteurResponse = await api.get(`acteurs/${acteurId}`);
      setSelectedActeur(acteurResponse);
      
      const permissionsResponse = await api.get(`permissions/acteur/${acteurId}`);
      setPermissions(permissionsResponse);
      
      setViewMode('detail');
      setTabValue(0);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'acteur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les ressources disponibles pour les permissions
  const fetchResources = async () => {
    try {
      // Récupérer les applications
      const applicationsResponse = await api.get('applications');
      setApplications(applicationsResponse.map((app: any) => ({
        id: app.id_application,
        nom: app.nom_application
      })));
      
      // Récupérer les questionnaires
      const questionnairesResponse = await api.get('questionnaires');
      setQuestionnaires(questionnairesResponse.map((q: any) => ({
        id: q.id_questionnaire,
        nom: `${q.fonction} - ${q.thematique}`
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des ressources:', error);
    }
  };

  // Récupérer les entreprises depuis l'API
  const fetchEntreprises = async () => {
    try {
      console.log('🔍 Tentative de chargement des entreprises...');
      const response = await api.get('entreprises');
      console.log('✅ Réponse API entreprises:', response);
      
      const entreprisesData = response.map((ent: any) => ({
        id_entreprise: ent.id_entreprise,
        nom_entreprise: ent.nom_entreprise
      }));
      
      console.log('📋 Entreprises formatées:', entreprisesData);
      
      // Ajouter DSIN en premier si pas présent
      const dsinExists = entreprisesData.some((ent: Entreprise) => 
        ent.nom_entreprise === 'DSIN' || ent.id_entreprise === 'DSIN'
      );
      
      if (!dsinExists) {
        entreprisesData.unshift({
          id_entreprise: 'DSIN',
          nom_entreprise: 'DSIN'
        });
      }
      
      console.log('🏢 Entreprises finales avec DSIN:', entreprisesData);
      setEntreprises(entreprisesData);
      console.log('✅ État entreprises mis à jour');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des entreprises:', error);
      // En cas d'erreur, utiliser une liste par défaut
      const fallbackEntreprises = [
        { id_entreprise: 'DSIN', nom_entreprise: 'DSIN' },
        { id_entreprise: 'AUTRE', nom_entreprise: 'Autre' }
      ];
      console.log('🔄 Utilisation des entreprises par défaut:', fallbackEntreprises);
      setEntreprises(fallbackEntreprises);
    }
  };

  // Gérer l'ouverture du dialogue de création d'acteur
  const handleOpenCreateActeurDialog = () => {
    setDialogMode('create');
    setActeurFormValues(initialActeurFormValues);
    setOpenActeurDialog(true);
  };

  // Gérer l'ouverture du dialogue d'édition d'acteur
  const handleOpenEditActeurDialog = (acteur: Acteur) => {
    setDialogMode('edit');
    setActeurFormValues({
      nom_prenom: acteur.nom_prenom,
      email: acteur.email,
      fonction: acteur.fonction,
      organisation: acteur.organisation,
      entreprise: acteur.organisation, // Utiliser organisation comme entreprise pour l'édition
      est_admin: acteur.est_admin || false
    });
    setOpenActeurDialog(true);
  };

  // Fermer le dialogue d'acteur
  const handleCloseActeurDialog = () => {
    setOpenActeurDialog(false);
  };

  // Gérer les changements dans le formulaire d'acteur
  const handleActeurFormChange = (event: React.ChangeEvent<HTMLInputElement> | any) => {
    const { name, value, checked } = event.target;
    
    if (name === 'est_admin') {
      setActeurFormValues({
        ...acteurFormValues,
        [name]: checked
      });
    } else {
      setActeurFormValues({
        ...acteurFormValues,
        [name]: value
      });
    }
  };

  // Soumettre le formulaire d'acteur
  const handleSubmitActeur = async () => {
    try {
      // Préparer les données pour l'API - mapper entreprise vers organisation
      const apiData = {
        ...acteurFormValues,
        organisation: acteurFormValues.entreprise // Envoyer l'entreprise sélectionnée dans le champ organisation
      };
      
      if (dialogMode === 'create') {
        const response = await api.post('acteurs', apiData);
        fetchActeurs();
      } else if (dialogMode === 'edit' && selectedActeur) {
        const response = await api.put(
          `acteurs/${selectedActeur.id_acteur}`, 
          apiData
        );
        if (viewMode === 'detail') {
          fetchActeurById(selectedActeur.id_acteur);
        } else {
          fetchActeurs();
        }
      }
      
      handleCloseActeurDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'acteur:', error);
    }
  };

  // Gérer l'ouverture du dialogue de confirmation de suppression
  const handleOpenDeleteDialog = (acteur: Acteur) => {
    setSelectedActeur(acteur);
    setOpenDeleteDialog(true);
  };

  // Fermer le dialogue de confirmation de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Supprimer un acteur
  const handleDeleteActeur = async () => {
    if (!selectedActeur) return;
    
    try {
      await api.delete(`acteurs/${selectedActeur.id_acteur}`);
      fetchActeurs();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'acteur:', error);
    }
  };

  // Navigation vers la vue détaillée d'un acteur
  const handleViewActeur = (acteur: Acteur) => {
    navigate(`/users/${acteur.id_acteur}`);
  };

  // Retour à la liste des acteurs
  const handleBackToList = () => {
    navigate('/users');
  };

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Gérer l'ouverture du dialogue de création de permission
  const handleOpenCreatePermissionDialog = () => {
    setPermissionDialogMode('create');
    setPermissionFormValues({
      ...initialPermissionFormValues,
      id_acteur: selectedActeur?.id_acteur || ''
    });
    setOpenPermissionDialog(true);
  };

  // Gérer l'ouverture du dialogue d'édition de permission
  const handleOpenEditPermissionDialog = (permission: Permission) => {
    setPermissionDialogMode('edit');
    setCurrentPermission(permission);
    setPermissionFormValues({
      id_acteur: permission.id_acteur,
      type_ressource: permission.type_ressource,
      id_ressource: permission.id_ressource,
      peut_voir: permission.peut_voir,
      peut_editer: permission.peut_editer,
      peut_supprimer: permission.peut_supprimer,
      peut_administrer: permission.peut_administrer
    });
    setOpenPermissionDialog(true);
  };

  // Fermer le dialogue de permission
  const handleClosePermissionDialog = () => {
    setOpenPermissionDialog(false);
    setCurrentPermission(null);
  };

  // Gérer les changements dans le formulaire de permission
  const handlePermissionFormChange = (event: any) => {
    const { name, value, checked } = event.target;
    
    if (name === 'peut_voir' || name === 'peut_editer' || name === 'peut_supprimer' || name === 'peut_administrer') {
      setPermissionFormValues({
        ...permissionFormValues,
        [name]: checked
      });
    } else {
      setPermissionFormValues({
        ...permissionFormValues,
        [name]: value
      });
    }
  };

  // Soumettre le formulaire de permission
  const handleSubmitPermission = async () => {
    try {
      if (permissionDialogMode === 'create') {
        await api.post('permissions', permissionFormValues);
      } else if (permissionDialogMode === 'edit' && currentPermission) {
        await api.put(`permissions/${currentPermission.id_permission}`, permissionFormValues);
      }
      
      if (selectedActeur) {
        fetchActeurById(selectedActeur.id_acteur);
      }
      
      handleClosePermissionDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la permission:', error);
    }
  };

  // Gérer l'ouverture du dialogue de confirmation de suppression de permission
  const handleOpenDeletePermissionDialog = (permission: Permission) => {
    setCurrentPermission(permission);
    setOpenDeletePermissionDialog(true);
  };

  // Fermer le dialogue de confirmation de suppression de permission
  const handleCloseDeletePermissionDialog = () => {
    setOpenDeletePermissionDialog(false);
    setCurrentPermission(null);
  };

  // Supprimer une permission
  const handleDeletePermission = async () => {
    if (!currentPermission) return;
    
    try {
      await api.delete(`permissions/${currentPermission.id_permission}`);
      
      if (selectedActeur) {
        fetchActeurById(selectedActeur.id_acteur);
      }
      
      handleCloseDeletePermissionDialog();
    } catch (error) {
      console.error('Erreur lors de la suppression de la permission:', error);
    }
  };

  // Obtenir le nom d'une ressource
  const getRessourceName = (type: string, id: string | null) => {
    if (!id) return 'Tous';
    
    if (type === 'APPLICATION') {
      const app = applications.find(app => app.id === id);
      return app ? app.nom : id;
    } else if (type === 'QUESTIONNAIRE') {
      const questionnaire = questionnaires.find(q => q.id === id);
      return questionnaire ? questionnaire.nom : id;
    }
    
    return id;
  };

  // Obtenir le nom d'une entreprise
  const getEntrepriseName = (id: string) => {
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Vue Liste des Acteurs */}
      {viewMode === 'list' && (
        <Grid container spacing={3}>
          {/* En-tête */}
          <Grid size={12}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography component="h1" variant="h5" color="primary">
                  Gestion des Utilisateurs
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateActeurDialog}
                >
                  Nouvel Utilisateur
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Liste des acteurs */}
          <Grid size={12}>
            <TableContainer component={Paper}>
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
                  {acteurs.map((acteur) => (
                    <TableRow key={acteur.id_acteur} hover>
                      <TableCell>{acteur.nom_prenom}</TableCell>
                      <TableCell>{acteur.email}</TableCell>
                      <TableCell>{acteur.fonction}</TableCell>
                      <TableCell>{acteur.organisation}</TableCell>
                      <TableCell>{getEntrepriseName(acteur.organisation)}</TableCell>
                      <TableCell>
                        {acteur.est_admin ? (
                          <Chip label="Administrateur" color="primary" icon={<SecurityIcon />} />
                        ) : (
                          <Chip label="Utilisateur" color="default" icon={<PersonIcon />} />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="info" 
                          onClick={() => handleViewActeur(acteur)}
                          title="Voir les détails"
                        >
                          <PersonIcon />
                        </IconButton>
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenEditActeurDialog(acteur)}
                          title="Modifier l'utilisateur"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleOpenDeleteDialog(acteur)}
                          title="Supprimer l'utilisateur"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Vue Détaillée d'un Acteur */}
      {viewMode === 'detail' && selectedActeur && (
        <Grid container spacing={3}>
          {/* En-tête */}
          <Grid size={12}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <IconButton color="primary" onClick={handleBackToList} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography component="h1" variant="h5" color="primary">
                    {selectedActeur.nom_prenom}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenEditActeurDialog(selectedActeur)}
                    sx={{ mr: 1 }}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<LockIcon />}
                    onClick={handleOpenCreatePermissionDialog}
                  >
                    Ajouter une Permission
                  </Button>
                </Box>
              </Box>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardHeader title="Informations" />
                    <CardContent>
                      <Typography variant="body1">
                        <strong>Email:</strong> {selectedActeur.email}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Fonction:</strong> {selectedActeur.fonction}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Organisation:</strong> {selectedActeur.organisation}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Entreprise:</strong> {getEntrepriseName(selectedActeur.organisation)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rôle:</strong> {selectedActeur.est_admin ? 'Administrateur' : 'Utilisateur'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Card>
                    <CardHeader title="Permissions" />
                    <CardContent>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {permissions.length === 0 
                          ? 'Aucune permission spécifique attribuée à cet utilisateur.'
                          : `${permissions.length} permissions attribuées à cet utilisateur.`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Onglets */}
          <Grid size={12}>
            <Paper sx={{ width: '100%' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label="Permissions" />
              </Tabs>

              {/* Onglet Permissions */}
              <TabPanel value={tabValue} index={0}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreatePermissionDialog}
                  sx={{ mb: 2 }}
                >
                  Ajouter une Permission
                </Button>
                
                {permissions.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Type de Ressource</TableCell>
                          <TableCell>Ressource</TableCell>
                          <TableCell>Voir</TableCell>
                          <TableCell>Éditer</TableCell>
                          <TableCell>Supprimer</TableCell>
                          <TableCell>Administrer</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {permissions.map((permission) => (
                          <TableRow key={permission.id_permission}>
                            <TableCell>{permission.type_ressource}</TableCell>
                            <TableCell>{getRessourceName(permission.type_ressource, permission.id_ressource)}</TableCell>
                            <TableCell>
                              <Checkbox checked={permission.peut_voir} disabled />
                            </TableCell>
                            <TableCell>
                              <Checkbox checked={permission.peut_editer} disabled />
                            </TableCell>
                            <TableCell>
                              <Checkbox checked={permission.peut_supprimer} disabled />
                            </TableCell>
                            <TableCell>
                              <Checkbox checked={permission.peut_administrer} disabled />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                color="primary" 
                                onClick={() => handleOpenEditPermissionDialog(permission)}
                                title="Modifier la permission"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                color="error" 
                                onClick={() => handleOpenDeletePermissionDialog(permission)}
                                title="Supprimer la permission"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" align="center" sx={{ py: 3 }}>
                    Aucune permission attribuée à cet utilisateur
                  </Typography>
                )}
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Dialog pour créer/modifier un acteur */}
      <Dialog open={openActeurDialog} onClose={handleCloseActeurDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer un nouvel utilisateur' : 'Modifier l\'utilisateur'}
        </DialogTitle>
        <DialogContent>
          {/* DEBUG TEMPORAIRE */}
          <Typography color="red" variant="caption">
            DEBUG: {entreprises.length} entreprises chargées
          </Typography>
          
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  required
                  fullWidth
                  id="nom_prenom"
                  name="nom_prenom"
                  label="Nom et prénom"
                  value={acteurFormValues.nom_prenom}
                  onChange={handleActeurFormChange}
                />
              </Grid>
              
              <Grid size={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  value={acteurFormValues.email}
                  onChange={handleActeurFormChange}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  id="fonction"
                  name="fonction"
                  label="Fonction"
                  value={acteurFormValues.fonction}
                  onChange={handleActeurFormChange}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  id="organisation"
                  name="organisation"
                  label="Organisation"
                  value={acteurFormValues.organisation}
                  onChange={handleActeurFormChange}
                />
              </Grid>
              
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel id="entreprise-label">Entreprise</InputLabel>
                  <Select
                    labelId="entreprise-label"
                    id="entreprise"
                    name="entreprise"
                    value={acteurFormValues.entreprise}
                    label="Entreprise"
                    onChange={handleActeurFormChange}
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
                    id="mot_de_passe"
                    name="mot_de_passe"
                    type="password"
                    label="Mot de passe"
                    value={acteurFormValues.mot_de_passe}
                    onChange={handleActeurFormChange}
                  />
                </Grid>
              )}
              
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={acteurFormValues.est_admin}
                      onChange={handleActeurFormChange}
                      name="est_admin"
                      color="primary"
                    />
                  }
                  label="Administrateur"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActeurDialog}>Annuler</Button>
          <Button onClick={handleSubmitActeur} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour créer/modifier une permission */}
      <Dialog open={openPermissionDialog} onClose={handleClosePermissionDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {permissionDialogMode === 'create' ? 'Ajouter une nouvelle permission' : 'Modifier la permission'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="type-ressource-label">Type de Ressource</InputLabel>
                  <Select
                    labelId="type-ressource-label"
                    id="type_ressource"
                    name="type_ressource"
                    value={permissionFormValues.type_ressource}
                    label="Type de Ressource"
                    onChange={handlePermissionFormChange}
                  >
                    <MenuItem value="APPLICATION">Application</MenuItem>
                    <MenuItem value="QUESTIONNAIRE">Questionnaire</MenuItem>
                    <MenuItem value="FORMULAIRE">Formulaire</MenuItem>
                    <MenuItem value="RAPPORT">Rapport</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="id-ressource-label">Ressource</InputLabel>
                  <Select
                    labelId="id-ressource-label"
                    id="id_ressource"
                    name="id_ressource"
                    value={permissionFormValues.id_ressource || ''}
                    onChange={handlePermissionFormChange}
                  >
                    <MenuItem value="">Toutes les ressources</MenuItem>
                    
                    {permissionFormValues.type_ressource === 'APPLICATION' && 
                      applications.map(app => (
                        <MenuItem key={app.id} value={app.id}>{app.nom}</MenuItem>
                      ))
                    }
                    
                    {permissionFormValues.type_ressource === 'QUESTIONNAIRE' && 
                      questionnaires.map(q => (
                        <MenuItem key={q.id} value={q.id}>{q.nom}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Permissions
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permissionFormValues.peut_voir}
                          onChange={handlePermissionFormChange}
                          name="peut_voir"
                          color="primary"
                        />
                      }
                      label="Voir"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permissionFormValues.peut_editer}
                          onChange={handlePermissionFormChange}
                          name="peut_editer"
                          color="primary"
                        />
                      }
                      label="Éditer"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permissionFormValues.peut_supprimer}
                          onChange={handlePermissionFormChange}
                          name="peut_supprimer"
                          color="primary"
                        />
                      }
                      label="Supprimer"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permissionFormValues.peut_administrer}
                          onChange={handlePermissionFormChange}
                          name="peut_administrer"
                          color="primary"
                        />
                      }
                      label="Administrer"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePermissionDialog}>Annuler</Button>
          <Button onClick={handleSubmitPermission} variant="contained" color="primary">
            {permissionDialogMode === 'create' ? 'Ajouter' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression d'acteur */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'utilisateur "{selectedActeur?.nom_prenom}" ?
            Cette action est irréversible et supprimera également toutes les permissions associées.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDeleteActeur} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression de permission */}
      <Dialog open={openDeletePermissionDialog} onClose={handleCloseDeletePermissionDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer cette permission ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeletePermissionDialog}>Annuler</Button>
          <Button onClick={handleDeletePermission} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Users;