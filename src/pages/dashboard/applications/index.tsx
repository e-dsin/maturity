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
  Alert
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DatePickerWrapper from '../../../components/common/DataPickerWrapper';

// Types
interface Application {
  id_application: string;
  nom_application: string;
  statut: string;
  type: string;
  hebergement: string;
  architecture_logicielle: string;
  date_mise_en_prod?: string;
  editeur?: string;
  language?: string;
  description?: string;
}

interface FormValues {
  nom_application: string;
  statut: string;
  type: string;
  hebergement: string;
  architecture_logicielle: string;
  date_mise_en_prod?: string;
  editeur?: string;
  language?: string;
  description?: string;
}

const initialFormValues: FormValues = {
  nom_application: '',
  statut: 'Projet',
  type: 'Build',
  hebergement: 'Cloud',
  architecture_logicielle: 'MVC',
  date_mise_en_prod: undefined,
  editeur: '',
  language: '',
  description: ''
};

const Applications: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Supprimer le "/api" du début car votre service api.ts l'ajoute déjà
      const response = await api.get('applications');
      
      // Vérifier si la réponse est un tableau ou si elle a une propriété data qui est un tableau
      if (Array.isArray(response)) {
        setApplications(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setApplications(response.data);
      } else {
        console.warn('Format de réponse inattendu:', response);
        setApplications([]);
        setError('Format de données inattendu. Impossible de charger les applications.');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des applications:', error);
      setError('Impossible de charger les applications. Veuillez réessayer plus tard.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setFormValues(initialFormValues);
    setSelectedDate(null);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (application: Application) => {
    setDialogMode('edit');
    setCurrentApplication(application);
    setFormValues({
      nom_application: application.nom_application,
      statut: application.statut,
      type: application.type,
      hebergement: application.hebergement,
      architecture_logicielle: application.architecture_logicielle,
      date_mise_en_prod: application.date_mise_en_prod,
      editeur: application.editeur || '',
      language: application.language || '',
      description: application.description || ''
    });
    
    // Convertir la date si elle existe
    if (application.date_mise_en_prod) {
      setSelectedDate(new Date(application.date_mise_en_prod));
    } else {
      setSelectedDate(null);
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentApplication(null);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof FormValues;
    const value = event.target.value as string;
    
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setFormValues({
        ...formValues,
        date_mise_en_prod: formattedDate
      });
    } else {
      setFormValues({
        ...formValues,
        date_mise_en_prod: undefined
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'create') {
        // Supprimer le "/api" du début car votre service api.ts l'ajoute déjà
        await api.post('applications', formValues);
      } else if (dialogMode === 'edit' && currentApplication) {
        // Supprimer le "/api" du début car votre service api.ts l'ajoute déjà
        await api.put(`applications/${currentApplication.id_application}`, formValues);
      }
      
      fetchApplications();
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'application:', error);
      setError('Erreur lors de la sauvegarde de l\'application. Veuillez réessayer.');
    }
  };

  const handleOpenDeleteConfirm = (application: Application) => {
    setCurrentApplication(application);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setCurrentApplication(null);
  };

  const handleDelete = async () => {
    if (!currentApplication) return;
    
    try {
      // Supprimer le "/api" du début car votre service api.ts l'ajoute déjà
      await api.delete(`applications/${currentApplication.id_application}`);
      fetchApplications();
      handleCloseDeleteConfirm();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'application:', error);
      setError('Erreur lors de la suppression de l\'application. Veuillez réessayer.');
    }
  };

  const handleCalculateScore = (application: Application) => {
    navigate(`/analyses/calculer/${application.id_application}`);
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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography component="h1" variant="h5" color="primary">
                Gestion des applications
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
              >
                Nouvelle Application
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Liste des applications */}
        <Grid xs={12}>
          {applications.length === 0 ? (
            <Alert severity="info">
              Aucune application trouvée. Créez votre première application en cliquant sur le bouton ci-dessus.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Hébergement</TableCell>
                    <TableCell>Architecture</TableCell>
                    <TableCell>Date mise en prod.</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id_application} hover>
                      <TableCell>{app.nom_application}</TableCell>
                      <TableCell>
                        <Chip 
                          label={app.statut} 
                          color={app.statut === 'Projet' ? 'info' : 'success'} 
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={app.type} 
                          color={app.type === 'Build' ? 'primary' : 'secondary'} 
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{app.hebergement}</TableCell>
                      <TableCell>{app.architecture_logicielle}</TableCell>
                      <TableCell>
                        {app.date_mise_en_prod 
                          ? new Date(app.date_mise_en_prod).toLocaleDateString('fr-FR') 
                          : 'Non définie'}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenEditDialog(app)}
                          title="Modifier l'application"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleOpenDeleteConfirm(app)}
                          title="Supprimer l'application"
                        >
                          <DeleteIcon />
                        </IconButton>
                        <IconButton 
                          color="info" 
                          onClick={() => handleCalculateScore(app)}
                          title="Calculer le score de maturité"
                        >
                          <AssessmentIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>

      {/* Dialog pour créer/modifier */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer une nouvelle application' : 'Modifier l\'application'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid xs={12}>
                <TextField
                  required
                  fullWidth
                  id="nom_application"
                  name="nom_application"
                  label="Nom de l'application"
                  value={formValues.nom_application}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="statut-label">Statut</InputLabel>
                  <Select
                    labelId="statut-label"
                    id="statut"
                    name="statut"
                    value={formValues.statut}
                    label="Statut"
                    onChange={handleFormChange}
                  >
                    <MenuItem value="Projet">Projet</MenuItem>
                    <MenuItem value="Run">Run</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="type-label">Type</InputLabel>
                  <Select
                    labelId="type-label"
                    id="type"
                    name="type"
                    value={formValues.type}
                    label="Type"
                    onChange={handleFormChange}
                  >
                    <MenuItem value="Build">Build</MenuItem>
                    <MenuItem value="Buy">Buy</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="hebergement-label">Hébergement</InputLabel>
                  <Select
                    labelId="hebergement-label"
                    id="hebergement"
                    name="hebergement"
                    value={formValues.hebergement}
                    label="Hébergement"
                    onChange={handleFormChange}
                  >
                    <MenuItem value="Cloud">Cloud</MenuItem>
                    <MenuItem value="Prem">Prem</MenuItem>
                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="architecture-label">Architecture</InputLabel>
                  <Select
                    labelId="architecture-label"
                    id="architecture_logicielle"
                    name="architecture_logicielle"
                    value={formValues.architecture_logicielle}
                    label="Architecture"
                    onChange={handleFormChange}
                  >
                    <MenuItem value="ERP">ERP</MenuItem>
                    <MenuItem value="Multitenant SAAS">Multitenant SAAS</MenuItem>
                    <MenuItem value="MVC">MVC</MenuItem>
                    <MenuItem value="Monolithique">Monolithique</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <DatePickerWrapper
                  label="Date de mise en production"
                  value={selectedDate}
                  onChange={handleDateChange}
                  textFieldProps={{
                    variant: 'outlined'
                  }}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  id="editeur"
                  name="editeur"
                  label="Éditeur"
                  value={formValues.editeur}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  id="language"
                  name="language"
                  label="Langage principal"
                  value={formValues.language}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  multiline
                  rows={4}
                  value={formValues.description}
                  onChange={handleFormChange}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!formValues.nom_application}
          >
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'application "{currentApplication?.nom_application}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Annuler</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Applications;