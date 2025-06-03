import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  TablePagination,
  TableSortLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../../../services/api';

interface Formulaire {
  id_formulaire: string;
  id_acteur: string;
  acteur_nom?: string;
  id_application?: string;
  nom_application?: string;
  id_entreprise: string;
  nom_entreprise?: string;
  id_questionnaire?: string;
  questionnaire_titre?: string;
  fonction?: string;
  thematique?: string;
  date_creation: string;
  date_modification: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression?: number;
}

interface Fonction {
  id: string;
  nom: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
}

// Propriétés de tri
type Order = 'asc' | 'desc';
type OrderBy = 'fonction' | 'nom_entreprise' | 'acteur_nom' | 'date_modification' | 'statut' | 'progression';

const Forms: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fonctionFilter, setFonctionFilter] = useState('');
  const [entrepriseFilter, setEntrepriseFilter] = useState('');
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Tri
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('date_modification');
  
  // Récupérer les données des formulaires, fonctions et entreprises
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupérer les formulaires
      const formulairesResponse = await api.get('formulaires');
      
      // Normaliser la réponse des formulaires
      let formulairesData: Formulaire[] = [];
      if (Array.isArray(formulairesResponse)) {
        formulairesData = formulairesResponse;
      } else if (formulairesResponse && formulairesResponse.data && Array.isArray(formulairesResponse.data)) {
        formulairesData = formulairesResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour formulaires:', formulairesResponse);
        formulairesData = [];
      }
      
      // Récupérer les fonctions
      const fonctionsResponse = await api.get('fonctions');
      
      let fonctionsData: Fonction[] = [];
      if (Array.isArray(fonctionsResponse)) {
        fonctionsData = fonctionsResponse;
      } else if (fonctionsResponse && fonctionsResponse.data && Array.isArray(fonctionsResponse.data)) {
        fonctionsData = fonctionsResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour fonctions:', fonctionsResponse);
        fonctionsData = [];
      }
      
      // Récupérer les entreprises
      const entreprisesResponse = await api.get('entreprises');
      
      let entreprisesData: Entreprise[] = [];
      if (Array.isArray(entreprisesResponse)) {
        entreprisesData = entreprisesResponse;
      } else if (entreprisesResponse && entreprisesResponse.data && Array.isArray(entreprisesResponse.data)) {
        entreprisesData = entreprisesResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour entreprises:', entreprisesResponse);
        entreprisesData = [];
      }
      
      // Normaliser les propriétés des formulaires
      const normalizedFormulaires = formulairesData.map(form => ({
        id_formulaire: form.id_formulaire,
        id_acteur: form.id_acteur || '',
        acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
        id_application: form.id_application || '',
        nom_application: form.nom_application || 'Application inconnue',
        id_entreprise: form.id_entreprise || '',
        nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
        id_questionnaire: form.id_questionnaire || '',
        questionnaire_titre: form.questionnaire_titre || '',
        fonction: form.fonction || form.questionnaire_titre || 'Fonction inconnue',
        thematique: form.thematique || 'Non catégorisé',
        date_creation: form.date_creation || new Date().toISOString(),
        date_modification: form.date_modification || form.date_creation || new Date().toISOString(),
        statut: form.statut || 'Brouillon',
        progression: form.progression ?? 0
      }));
      
      setFormulaires(normalizedFormulaires);
      setFonctions(fonctionsData);
      setEntreprises(entreprisesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les formulaires. Veuillez réessayer plus tard.');
      setFormulaires([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // Rafraîchir les données
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  
  // Filtrer les formulaires en fonction des critères
  const filteredFormulaires = formulaires.filter(form => {
    const matchesSearch = searchTerm === '' || 
      (form.fonction && form.fonction.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.nom_entreprise && form.nom_entreprise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.acteur_nom && form.acteur_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.thematique && form.thematique.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || form.statut === statusFilter;
    const matchesFonction = fonctionFilter === '' || form.fonction === fonctionFilter;
    const matchesEntreprise = entrepriseFilter === '' || form.id_entreprise === entrepriseFilter;
    
    return matchesSearch && matchesStatus && matchesFonction && matchesEntreprise;
  });
  
  // Trier les formulaires
  const sortedFormulaires = [...filteredFormulaires].sort((a, b) => {
    let comparison = 0;
    
    switch (orderBy) {
      case 'fonction':
        comparison = (a.fonction || '').localeCompare(b.fonction || '');
        break;
      case 'nom_entreprise':
        comparison = (a.nom_entreprise || '').localeCompare(b.nom_entreprise || '');
        break;
      case 'acteur_nom':
        comparison = (a.acteur_nom || '').localeCompare(b.acteur_nom || '');
        break;
      case 'date_modification':
        comparison = new Date(a.date_modification).getTime() - new Date(b.date_modification).getTime();
        break;
      case 'statut':
        comparison = a.statut.localeCompare(b.statut);
        break;
      case 'progression':
        comparison = (a.progression || 0) - (b.progression || 0);
        break;
      default:
        comparison = 0;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  // Paginer les formulaires
  const paginatedFormulaires = sortedFormulaires.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Gérer le changement de page
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Gérer le changement de nombre de lignes par page
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Gérer le tri
  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Helper pour obtenir la couleur selon le statut
  const getStatusColor = (status: 'Brouillon' | 'Soumis' | 'Validé') => {
    switch (status) {
      case 'Validé': return 'success';
      case 'Soumis': return 'primary';
      case 'Brouillon': return 'warning';
      default: return 'default';
    }
  };

  // Helper pour obtenir la couleur de progression
  const getProgressColor = (progress: number = 0) => {
    if (progress < 30) return 'error';
    if (progress < 70) return 'warning';
    return 'success';
  };
  
  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (e) {
      console.warn('Erreur lors du formatage de la date:', e);
      return 'Date invalide';
    }
  };
  
  // Obtenir les fonctions uniques pour le filtre
  const uniqueFonctions = [...new Set(formulaires.map(form => form.fonction))].filter(Boolean);
  
  // Statistiques par entreprise
  const statsByEntreprise = entreprises.map(entreprise => {
    const formsByEntreprise = formulaires.filter(form => form.id_entreprise === entreprise.id_entreprise);
    const validatedCount = formsByEntreprise.filter(form => form.statut === 'Validé').length;
    
    return {
      id: entreprise.id_entreprise,
      name: entreprise.nom_entreprise,
      total: formsByEntreprise.length,
      validated: validatedCount,
      avgProgression: formsByEntreprise.length 
        ? Math.round(formsByEntreprise.reduce((acc, form) => acc + (form.progression || 0), 0) / formsByEntreprise.length) 
        : 0
    };
  }).filter(stat => stat.total > 0);
  
  // Statistiques par fonction
  const statsByFonction = uniqueFonctions.map(fonction => {
    const formsByFonction = formulaires.filter(form => form.fonction === fonction);
    const validatedCount = formsByFonction.filter(form => form.statut === 'Validé').length;
    
    return {
      name: fonction,
      total: formsByFonction.length,
      validated: validatedCount,
      avgProgression: formsByFonction.length 
        ? Math.round(formsByFonction.reduce((acc, form) => acc + (form.progression || 0), 0) / formsByFonction.length) 
        : 0
    };
  }).filter(stat => stat.total > 0);
  
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
              <Box>
                <Typography component="h1" variant="h5" color="primary" gutterBottom>
                  Formulaires d'évaluation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Suivez les différentes évaluations de maturité par fonction et par entreprise
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Rafraîchir les données">
                  <IconButton 
                    color="primary" 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    sx={{ mr: 1 }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/formulaires/new')}
                >
                  Nouveau formulaire
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Statistiques des formulaires */}
        <Grid xs={12}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="text.primary">
                    {formulaires.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total formulaires
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {formulaires.filter(f => f.statut === 'Validé').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Formulaires validés
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {formulaires.filter(f => f.statut === 'Soumis').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Formulaires soumis
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {formulaires.filter(f => f.statut === 'Brouillon').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Brouillons
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Filtres */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Rechercher"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Fonction, entreprise ou acteur..."
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="status-filter-label">Statut</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    id="status-filter"
                    value={statusFilter}
                    label="Statut"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">Tous les statuts</MenuItem>
                    <MenuItem value="Brouillon">Brouillon</MenuItem>
                    <MenuItem value="Soumis">Soumis</MenuItem>
                    <MenuItem value="Validé">Validé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="fonction-filter-label">Fonction</InputLabel>
                  <Select
                    labelId="fonction-filter-label"
                    id="fonction-filter"
                    value={fonctionFilter}
                    label="Fonction"
                    onChange={(e) => setFonctionFilter(e.target.value)}
                  >
                    <MenuItem value="">Toutes les fonctions</MenuItem>
                    {uniqueFonctions.map(fonction => (
                      <MenuItem key={fonction} value={fonction}>{fonction}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="entreprise-filter-label">Entreprise</InputLabel>
                  <Select
                    labelId="entreprise-filter-label"
                    id="entreprise-filter"
                    value={entrepriseFilter}
                    label="Entreprise"
                    onChange={(e) => setEntrepriseFilter(e.target.value)}
                  >
                    <MenuItem value="">Toutes les entreprises</MenuItem>
                    {entreprises.map(ent => (
                      <MenuItem key={ent.id_entreprise} value={ent.id_entreprise}>{ent.nom_entreprise}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Tableau des formulaires */}
        <Grid xs={12}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ width: '100%', p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Chargement des formulaires...</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table sx={{ minWidth: 650 }} aria-label="tableau des formulaires">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'fonction'}
                            direction={orderBy === 'fonction' ? order : 'asc'}
                            onClick={() => handleRequestSort('fonction')}
                          >
                            Fonction
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'nom_entreprise'}
                            direction={orderBy === 'nom_entreprise' ? order : 'asc'}
                            onClick={() => handleRequestSort('nom_entreprise')}
                          >
                            Entreprise
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'acteur_nom'}
                            direction={orderBy === 'acteur_nom' ? order : 'asc'}
                            onClick={() => handleRequestSort('acteur_nom')}
                          >
                            Acteur
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'date_modification'}
                            direction={orderBy === 'date_modification' ? order : 'asc'}
                            onClick={() => handleRequestSort('date_modification')}
                          >
                            Dates
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'statut'}
                            direction={orderBy === 'statut' ? order : 'asc'}
                            onClick={() => handleRequestSort('statut')}
                          >
                            Statut
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'progression'}
                            direction={orderBy === 'progression' ? order : 'asc'}
                            onClick={() => handleRequestSort('progression')}
                          >
                            Progression
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedFormulaires.length > 0 ? (
                        paginatedFormulaires.map((form) => (
                          <TableRow
                            key={form.id_formulaire}
                            sx={{ 
                              '&:last-child td, &:last-child th': { border: 0 },
                              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">{form.fonction}</Typography>
                              <Typography variant="caption" color="text.secondary">{form.thematique}</Typography>
                            </TableCell>
                            <TableCell>{form.nom_entreprise}</TableCell>
                            <TableCell>{form.acteur_nom}</TableCell>
                            <TableCell>
                              <Typography variant="caption" display="block">
                                Création: {formatDate(form.date_creation)}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Modif: {formatDate(form.date_modification)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={form.statut} 
                                color={getStatusColor(form.statut)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell sx={{ width: 150 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%', mr: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={form.progression || 0} 
                                    color={getProgressColor(form.progression)}
                                  />
                                </Box>
                                <Box sx={{ minWidth: 35 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {form.progression || 0}%
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Voir le détail">
                                <IconButton
                                  color="primary"
                                  onClick={() => navigate(`/formulaires/${form.id_formulaire}`)}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography sx={{ py: 2 }}>
                              Aucun formulaire trouvé
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredFormulaires.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Lignes par page"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
              </>
            )}
          </Paper>
        </Grid>
        
        {/* Statistiques par entreprise et fonction */}
        {!loading && filteredFormulaires.length > 0 && (
          <Grid xs={12}>
            <Grid container spacing={2}>
              {/* Statistiques par entreprise */}
              <Grid xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Statistiques par Entreprise
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Entreprise</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Validés</TableCell>
                          <TableCell align="right">Progression moyenne</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statsByEntreprise.map((stat) => (
                          <TableRow key={stat.id}>
                            <TableCell>{stat.name}</TableCell>
                            <TableCell align="right">{stat.total}</TableCell>
                            <TableCell align="right">{stat.validated}</TableCell>
                            <TableCell align="right">{stat.avgProgression}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              {/* Statistiques par fonction */}
              <Grid xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Statistiques par Fonction
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fonction</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Validés</TableCell>
                          <TableCell align="right">Progression moyenne</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statsByFonction.map((stat) => (
                          <TableRow key={stat.name}>
                            <TableCell>{stat.name}</TableCell>
                            <TableCell align="right">{stat.total}</TableCell>
                            <TableCell align="right">{stat.validated}</TableCell>
                            <TableCell align="right">{stat.avgProgression}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        )}
        
        {/* Pied de page */}
        <Grid xs={12} sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            © 2025 - Plateforme d'Évaluation de la Maturité des DSIN
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Forms;