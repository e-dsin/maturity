// src/pages/dashboard/FormulairesFiltered.tsx
// Composant spécialisé pour les formulaires filtrés (INTERVENANTS)

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Draft as DraftIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { useEvaluationRedirect } from '../../hooks/useEvaluationRedirect';
import api from '../../services/api';

// Types pour les formulaires
interface Formulaire {
  id_formulaire: string;
  id_acteur: string;
  id_application: string;
  id_questionnaire: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression: number;
  date_creation: string;
  date_modification: string;
  questionnaire_nom?: string;
  nom_application?: string;
  nom_entreprise?: string;
  acteur_nom?: string;
}

interface FormulairesStats {
  total: number;
  brouillons: number;
  soumis: number;
  valides: number;
  progression_moyenne: number;
}

const FormulairesFiltered: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { evaluationStatus } = useEvaluationRedirect();

  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  const [stats, setStats] = useState<FormulairesStats | null>(null);
  
  // États pour la table et les filtres
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Déterminer l'ID acteur à filtrer
  const actorId = useMemo(() => {
    // Priorité : paramètre URL > utilisateur connecté
    return searchParams.get('id_acteur') || user?.id_acteur || '';
  }, [searchParams, user?.id_acteur]);

  // Titre selon le contexte
  const pageTitle = useMemo(() => {
    if (searchParams.get('id_acteur') && searchParams.get('id_acteur') !== user?.id_acteur) {
      return 'Formulaires de l\'utilisateur';
    }
    return 'Mes formulaires d\'évaluation';
  }, [searchParams, user?.id_acteur]);

  /**
   * Charge les formulaires pour l'acteur spécifié
   */
  const loadFormulaires = async (userId: string) => {
    if (!userId) {
      setError('ID utilisateur manquant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Charger les formulaires avec filtrage automatique côté backend
      const response = await api.get(`/formulaires?id_acteur=${userId}`);
      const data = response.data;

      const formulairesData = data.formulaires || data;
      setFormulaires(formulairesData);

      // Calculer les statistiques
      const calculatedStats = calculateStats(formulairesData);
      setStats(calculatedStats);

    } catch (err: any) {
      console.error('Erreur lors du chargement des formulaires:', err);
      
      if (err.response?.status === 403) {
        setError('Accès non autorisé à ces formulaires');
      } else if (err.response?.status === 404) {
        setError('Aucun formulaire trouvé');
      } else {
        setError('Erreur lors du chargement des formulaires');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calcule les statistiques depuis les formulaires
   */
  const calculateStats = (formulaires: Formulaire[]): FormulairesStats => {
    if (formulaires.length === 0) {
      return {
        total: 0,
        brouillons: 0,
        soumis: 0,
        valides: 0,
        progression_moyenne: 0
      };
    }

    const brouillons = formulaires.filter(f => f.statut === 'Brouillon').length;
    const soumis = formulaires.filter(f => f.statut === 'Soumis').length;
    const valides = formulaires.filter(f => f.statut === 'Validé').length;
    
    const progression_moyenne = formulaires.reduce((sum, f) => sum + (f.progression || 0), 0) / formulaires.length;

    return {
      total: formulaires.length,
      brouillons,
      soumis,
      valides,
      progression_moyenne: Math.round(progression_moyenne)
    };
  };

  /**
   * Filtrage des formulaires
   */
  const filteredFormulaires = useMemo(() => {
    let filtered = formulaires;

    // Filtre par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f => 
        f.questionnaire_nom?.toLowerCase().includes(term) ||
        f.nom_application?.toLowerCase().includes(term) ||
        f.nom_entreprise?.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.statut === statusFilter);
    }

    return filtered;
  }, [formulaires, searchTerm, statusFilter]);

  /**
   * Formulaires paginés
   */
  const paginatedFormulaires = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredFormulaires.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredFormulaires, page, rowsPerPage]);

  /**
   * Détermine l'icône et la couleur du statut
   */
  const getStatusConfig = (statut: string) => {
    switch (statut) {
      case 'Brouillon':
        return { icon: <DraftIcon />, color: 'default' as const, label: 'Brouillon' };
      case 'Soumis':
        return { icon: <ScheduleIcon />, color: 'warning' as const, label: 'Soumis' };
      case 'Validé':
        return { icon: <CheckCircleIcon />, color: 'success' as const, label: 'Validé' };
      default:
        return { icon: <DraftIcon />, color: 'default' as const, label: statut };
    }
  };

  /**
   * Détermine la couleur de la progression
   */
  const getProgressionColor = (progression: number) => {
    if (progression >= 100) return 'success';
    if (progression >= 75) return 'info';
    if (progression >= 50) return 'warning';
    return 'error';
  };

  /**
   * Actions sur les formulaires
   */
  const handleViewFormulaire = (formulaire: Formulaire) => {
    navigate(`/formulaires/${formulaire.id_formulaire}`);
  };

  const handleEditFormulaire = (formulaire: Formulaire) => {
    if (formulaire.statut === 'Brouillon') {
      navigate(`/formulaires/${formulaire.id_formulaire}/edit`);
    } else {
      navigate(`/formulaires/${formulaire.id_formulaire}`);
    }
  };

  /**
   * Gestionnaires de pagination et filtres
   */
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPage(0);
  };

  // Chargement initial
  useEffect(() => {
    if (actorId) {
      loadFormulaires(actorId);
    } else {
      setError('ID utilisateur manquant');
      setLoading(false);
    }
  }, [actorId]);

  // Affichage du loading
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Chargement de vos formulaires...
        </Typography>
      </Box>
    );
  }

  // Affichage des erreurs
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Retour au dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Breadcrumbs et en-tête */}
      <Box mb={3}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink 
            component="button" 
            variant="body2" 
            onClick={() => navigate('/dashboard')}
            sx={{ textDecoration: 'none' }}
          >
            Dashboard
          </MuiLink>
          
          <Typography color="text.primary" variant="body2">
            {pageTitle}
          </Typography>
        </Breadcrumbs>

        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <PersonIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1">
                {pageTitle}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {user?.nom_prenom} • {user?.nom_entreprise}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Alerte d'évaluation en cours */}
      {evaluationStatus?.hasEvaluation && ['IN_PROGRESS', 'PENDING_ACCEPTANCE'].includes(evaluationStatus.status) && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate(evaluationStatus.redirectTo)}>
              Continuer l'évaluation
            </Button>
          }
        >
          {evaluationStatus.message}
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total formulaires
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <DraftIcon color="action" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.brouillons}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Brouillons
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ScheduleIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.soumis}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Soumis
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.valides}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Validés
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box>
                  <Typography variant="h4">{stats.progression_moyenne}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Progression moyenne
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtres et recherche */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5" component="h2">
            Liste des formulaires
          </Typography>
          
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              SelectProps={{ native: true }}
              sx={{ minWidth: 120 }}
            >
              <option value="all">Tous statuts</option>
              <option value="Brouillon">Brouillons</option>
              <option value="Soumis">Soumis</option>
              <option value="Validé">Validés</option>
            </TextField>

            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={clearFilters}
              size="small"
            >
              Effacer filtres
            </Button>
          </Box>
        </Box>

        {/* Table des formulaires */}
        {filteredFormulaires.length === 0 ? (
          <Alert severity="info">
            {formulaires.length === 0 
              ? "Vous n'avez encore aucun formulaire." 
              : "Aucun formulaire ne correspond aux filtres sélectionnés."
            }
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Questionnaire</TableCell>
                    <TableCell>Application</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Progression</TableCell>
                    <TableCell>Date création</TableCell>
                    <TableCell>Dernière modification</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedFormulaires.map((formulaire) => {
                    const statusConfig = getStatusConfig(formulaire.statut);
                    
                    return (
                      <TableRow 
                        key={formulaire.id_formulaire}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleViewFormulaire(formulaire)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formulaire.questionnaire_nom || 'Questionnaire'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formulaire.nom_application || 'Application'}
                          </Typography>
                          {formulaire.nom_entreprise && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formulaire.nom_entreprise}
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            icon={statusConfig.icon}
                            label={statusConfig.label}
                            color={statusConfig.color}
                            size="small"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {formulaire.progression || 0}%
                            </Typography>
                            <Chip
                              label={`${formulaire.progression || 0}%`}
                              color={getProgressionColor(formulaire.progression || 0)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(formulaire.date_creation).toLocaleDateString('fr-FR')}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(formulaire.date_modification).toLocaleDateString('fr-FR')}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={1}>
                            <Tooltip title="Voir le formulaire">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewFormulaire(formulaire);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {formulaire.statut === 'Brouillon' && (
                              <Tooltip title="Modifier le formulaire">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditFormulaire(formulaire);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredFormulaires.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
              }
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default FormulairesFiltered;