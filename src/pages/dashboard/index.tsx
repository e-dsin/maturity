import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import logger from '../../utils/logger';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DomainIcon from '@mui/icons-material/Domain';
import DescriptionIcon from '@mui/icons-material/Description';
import RefreshIcon from '@mui/icons-material/Refresh';


// Types mis à jour selon la nouvelle structure API
interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  secteur: string;
  score_global: number;
}

interface SecteurData {
  nom: string;
  nombre_entreprises: number;
  score_moyen: number;
}

interface Fonction {
  id_fonction: string;
  nom: string;
  score_global: number;
}

interface Application {
  id_application: string;
  nom_application: string;
  score_global: number;
  mode_hebergement: string;
  technologie: string;
}

// Interface mise à jour pour correspondre à la nouvelle structure
interface Formulaire {
  id_formulaire: string;
  id_acteur: string;
  acteur_nom: string;
  id_application: string;
  nom_application: string;
  id_entreprise: string;
  nom_entreprise: string;
  id_questionnaire: string;
  questionnaire_nom: string;
  thematiques: string[]; // Array de strings selon la nouvelle structure
  fonctions: string[]; // Array de strings selon la nouvelle structure
  date_creation: string;
  date_modification: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression: number;
  total_questions?: number;
  total_reponses?: number;
  score_actuel?: number;
  score_maximum?: number;
}

// Couleurs pour les graphiques
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // États pour les données
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [secteurs, setSecteurs] = useState<SecteurData[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hebergementFilter, setHebergementFilter] = useState<string>('all');
  const [technologieFilter, setTechnologieFilter] = useState<string>('all');
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Options de filtrage
  const [hebergementOptions, setHebergementOptions] = useState<string[]>([]);
  const [technologieOptions, setTechnologieOptions] = useState<string[]>([]);

  // Fonction de récupération des données avec la nouvelle structure API
  const fetchDashboardData = async (isRefresh = false) => {
    const startTime = performance.now();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      logger.debug('Chargement des données du dashboard');

      // Récupération parallèle de toutes les données nécessaires
      const [
        entreprisesResponse,
        fonctionsResponse,
        applicationsResponse,
        formulairesResponse
      ] = await Promise.all([
        api.get('entreprises'),
        api.get('fonctions'),
        api.get('applications'),
        api.get('formulaires') // Utilisation de l'endpoint unifié
      ]);

      // Normalisation des réponses avec la logique mise à jour
      const entreprisesData = normalizeApiResponse<Entreprise>(entreprisesResponse, 'entreprises');
      const fonctionsData = normalizeApiResponse<Fonction>(fonctionsResponse, 'fonctions');
      const applicationsData = normalizeApiResponse<Application>(applicationsResponse, 'applications');
      const formulairesData = normalizeApiResponse<Formulaire>(formulairesResponse, 'formulaires');

      // Traitement des données
      setEntreprises(entreprisesData);
      
      // Calculer les statistiques par secteur
      const secteursData = calculerStatistiquesSecteur(entreprisesData);
      setSecteurs(secteursData);
      
      setFonctions(fonctionsData);
      
      // Filtrer les applications avec score valide
      const applicationsAvecScore = applicationsData.filter(app => 
        app.score_global !== undefined && app.score_global !== null
      );
      setApplications(applicationsAvecScore);
      
      // Extraire les options de filtrage
      const hebergements = [...new Set(applicationsAvecScore
        .map(app => app.mode_hebergement)
        .filter(Boolean))];
      
      const technologies = [...new Set(applicationsAvecScore
        .map(app => app.technologie)
        .filter(Boolean))];
      
      setHebergementOptions(hebergements);
      setTechnologieOptions(technologies);
      
      // Normaliser les formulaires avec la nouvelle structure
      const normalizedFormulaires = formulairesData.map(form => ({
        ...form,
        // S'assurer que les thématiques et fonctions sont des arrays
        thematiques: Array.isArray(form.thematiques) ? form.thematiques : [],
        fonctions: Array.isArray(form.fonctions) ? form.fonctions : [],
        // Garder la compatibilité avec les anciens champs
        questionnaire_nom: form.questionnaire_nom || 'Questionnaire sans nom',
        acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
        nom_application: form.nom_application || 'Application inconnue'
      }));
      
      setFormulaires(normalizedFormulaires);

      const duration = performance.now() - startTime;
      logger.info(`Dashboard data loaded successfully in ${Math.round(duration)}ms`, {
        entreprises: entreprisesData.length,
        fonctions: fonctionsData.length,
        applications: applicationsAvecScore.length,
        formulaires: normalizedFormulaires.length
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Impossible de charger les données du tableau de bord.');
      logger.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction utilitaire pour normaliser les réponses API
  const normalizeApiResponse = <T,>(response: any, dataType: string): T[] => {
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn(`Format de réponse inattendu pour ${dataType}:`, response);
      logger.warn(`Unexpected response format for ${dataType}`, { response });
      return [];
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fonction utilitaire pour gérer les scores null/undefined
  const getScoreWithFallback = (score: any, defaultValue: number = 0): number => {
    if (score === null || score === undefined || isNaN(score)) {
      return defaultValue;
    }
    return parseFloat(score) || defaultValue;
  };

  const calculerStatistiquesSecteur = (entreprises: Entreprise[]): SecteurData[] => {
    // Regrouper par secteur
    const secteursMap = entreprises.reduce((acc, entreprise) => {
      const secteur = entreprise.secteur || 'Non défini';
      
      if (!acc[secteur]) {
        acc[secteur] = { 
          scoreTotal: 0, 
          count: 0 
        };
      }
      
      // Utiliser le score avec fallback
      const score = getScoreWithFallback(entreprise.score_global, 0);
      if (score > 0) {
        acc[secteur].scoreTotal += score;
        acc[secteur].count++;
      }
      
      return acc;
    }, {} as Record<string, { scoreTotal: number, count: number }>);
    
    // Convertir en tableau et calculer les moyennes
    return Object.entries(secteursMap)
      .map(([nom, { scoreTotal, count }]) => ({
        nom,
        nombre_entreprises: count,
        score_moyen: count > 0 ? scoreTotal / count : 0
      }))
      .filter(secteur => secteur.nombre_entreprises > 0) // Filtrer les secteurs sans données
      .sort((a, b) => b.score_moyen - a.score_moyen);
  };

  // Fonction pour formater les scores avec gestion des cas null
  const formatScore = (scoreActuel: any, scoreMaximum: any): string => {
    const actuel = getScoreWithFallback(scoreActuel, 0);
    const maximum = getScoreWithFallback(scoreMaximum, 1);
    
    if (maximum === 0) {
      return "0 / 0";
    }
    
    return `${actuel.toFixed(1)} / ${maximum.toFixed(1)}`;
  };

  // Fonction pour calculer le pourcentage de score avec sécurité
  const calculateScorePercentage = (scoreActuel: any, scoreMaximum: any): number => {
    const actuel = getScoreWithFallback(scoreActuel, 0);
    const maximum = getScoreWithFallback(scoreMaximum, 1);
    
    if (maximum === 0) return 0;
    return (actuel / maximum) * 5; // Convertir en échelle 0-5
  };

  const countFormulairesByFunction = () => {
    if (!formulaires || !formulaires.length) return [];
    
    logger.debug('Counting formulaires by function', { count: formulaires.length });
    
    // Compter les formulaires par fonction en utilisant la nouvelle structure
    const countByFunction = formulaires.reduce((acc, form) => {
      // Utiliser les fonctions array de la nouvelle structure
      const fonctionsArray = form.fonctions || [];
      
      if (fonctionsArray.length === 0) {
        // Si pas de fonctions, utiliser une catégorie par défaut
        acc['Non défini'] = (acc['Non défini'] || 0) + 1;
      } else {
        // Compter pour chaque fonction
        fonctionsArray.forEach(fonction => {
          acc[fonction] = (acc[fonction] || 0) + 1;
        });
      }
      
      return acc;
    }, {} as Record<string, number>);
    
    // Convertir en format pour graphique et filtrer les entrées vides
    return Object.entries(countByFunction)
      .filter(([name, value]) => name && name.trim() !== '' && value > 0)
      .map(([name, value]) => ({
        name,
        value
      }));
  };

  const getFilteredApplications = () => {
    if (!applications || !applications.length) return [];
    
    return applications
      .filter(app => 
        (hebergementFilter === 'all' || app.mode_hebergement === hebergementFilter) &&
        (technologieFilter === 'all' || app.technologie === technologieFilter)
      )
      .sort((a, b) => {
        const scoreA = getScoreWithFallback(a.score_global, 0);
        const scoreB = getScoreWithFallback(b.score_global, 0);
        return scoreB - scoreA;
      })
      .slice(0, 10);
  };

  const calculateGlobalFunctionScore = () => {
    if (!fonctions || !fonctions.length) return 'N/A';
    
    const validScores = fonctions
      .map(f => getScoreWithFallback(f.score_global, 0))
      .filter(score => score > 0);
    
    if (!validScores.length) return 'N/A';
    
    const total = validScores.reduce((sum, score) => sum + score, 0);
    return (total / validScores.length).toFixed(2);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload?.length) {
      return (
        <Paper sx={{ p: 1 }}>
          <Typography variant="body2">{`${label}`}</Typography>
          <Typography variant="body2">{`Score: ${payload[0].value.toFixed(2)}`}</Typography>
        </Paper>
      );
    }
    return null;
  };

  // Fonction pour déterminer la couleur basée sur le score
  const getScoreColor = (score: number): "success" | "warning" | "error" => {
    if (score >= 3.5) return "success";
    if (score >= 2) return "warning";
    return "error";
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      logger.warn('Erreur lors du formatage de la date:', e);
      return 'Date invalide';
    }
  };

  if (loading && !refreshing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }} 
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Titre du tableau de bord */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography component="h1" variant="h4" color="primary" gutterBottom>
                  Tableau de bord de maturité
                </Typography>
                <Typography variant="body1">
                  Vue d'ensemble des scores de maturité par secteur, fonction et application.
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? 'Actualisation...' : 'Actualiser'}
                </Button>
        
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Statistiques globales en format carte */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: '#0B4E87', mr: 2 }}>
                  <BusinessIcon />
                </Avatar>
                <Typography variant="h6">Entreprises</Typography>
              </Box>
              <Typography variant="h3" color="primary" align="center" sx={{ my: 2 }}>
                {entreprises?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                évaluées dans la plateforme
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: '#4CAF50', mr: 2 }}>
                  <AssessmentIcon />
                </Avatar>
                <Typography variant="h6">Fonctions</Typography>
              </Box>
              <Typography variant="h3" color="primary" align="center" sx={{ my: 2 }}>
                {fonctions?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                analysées au total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: '#FF9800', mr: 2 }}>
                  <DomainIcon />
                </Avatar>
                <Typography variant="h6">Applications</Typography>
              </Box>
              <Typography variant="h3" color="primary" align="center" sx={{ my: 2 }}>
                {applications?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                avec score de maturité
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: '#F44336', mr: 2 }}>
                  <DescriptionIcon />
                </Avatar>
                <Typography variant="h6">Formulaires</Typography>
              </Box>
              <Typography variant="h3" color="primary" align="center" sx={{ my: 2 }}>
                {formulaires?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                renseignés au total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Synthèse des entreprises par secteur */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Maturité par Secteur d'Activité
            </Typography>
            {secteurs && secteurs.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={secteurs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nom" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="score_moyen" 
                    fill="#0B4E87" 
                    name="Score moyen"
                    barSize={40}
                  >
                    {secteurs.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300} flexDirection="column">
                <Typography variant="body1" color="textSecondary" align="center">
                  Aucune donnée de score disponible
                </Typography>
                <Typography variant="caption" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  Les scores apparaîtront une fois les analyses de maturité effectuées
                </Typography>
              </Box>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Nombre d'entreprises par secteur indiqué entre parenthèses
            </Typography>
          </Paper>
        </Grid>

        {/* Nombre de formulaires par fonction */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Formulaires par Fonction
            </Typography>
            {formulaires && formulaires.length > 0 && countFormulairesByFunction().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={countFormulairesByFunction()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {countFormulairesByFunction().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300} flexDirection="column">
                <Typography variant="body1" color="textSecondary" align="center">
                  Aucun formulaire avec fonctions valides
                </Typography>
                <Typography variant="caption" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  Créez des formulaires liés à des fonctions pour voir les statistiques
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Liste des 10 derniers formulaires */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              10 Derniers Formulaires
            </Typography>
            <Box display="flex" mb={2}>
              <TextField
                size="small"
                placeholder="Rechercher un formulaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                InputProps={{ 
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> 
                }}
              />
            </Box>
            {formulaires
              .filter(form => 
                (form.nom_application && form.nom_application.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (form.fonctions && form.fonctions.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                (form.acteur_nom && form.acteur_nom.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .slice(0, 10)
              .map((form, index) => (
                <React.Fragment key={form.id_formulaire || `form-${index}`}>
                  <ListItem
                    component="div"
                    onClick={() => navigate(`/formulaires/${form.id_formulaire}`)}
                    sx={{ 
                      borderLeft: '4px solid', 
                      borderColor: (() => {
                        const scorePercent = calculateScorePercentage(form.score_actuel, form.score_maximum);
                        return scorePercent >= 3.5 ? '#4CAF50' : 
                               scorePercent >= 2 ? '#FF9800' : '#F44336';
                      })(),
                      mb: 1,
                      bgcolor: '#f9f9f9',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#f0f0f0',
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#0B4E87' }}>
                            Questionnaire: {form.questionnaire_nom}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                            <Typography variant="body2" component="span">
                              Application: {form.nom_application}
                            </Typography>
                            <Chip 
                              label={`Score: ${formatScore(form.score_actuel, form.score_maximum)}`} 
                              size="small" 
                              color={getScoreColor(calculateScorePercentage(form.score_actuel, form.score_maximum))}
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>
                          {form.fonctions && form.fonctions.length > 0 && (
                            <Box mt={0.5}>
                              <Typography variant="caption" color="textSecondary">
                                Fonctions: {form.fonctions.join(', ')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                              Acteur: {form.acteur_nom}
                            </Typography>
                            <Chip 
                              label={form.statut}
                              size="small"
                              color={getScoreColor(form.statut === 'Validé' ? 5 : form.statut === 'Soumis' ? 3 : 1)}
                            />
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                            <Typography variant="caption" color="textSecondary">
                              Créé le: {form.date_creation ? formatDate(form.date_creation) : 'Date inconnue'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Modifié le: {form.date_modification ? formatDate(form.date_modification) : 'Date inconnue'}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < Math.min(formulaires.length, 10) - 1 && <Divider />}
                </React.Fragment>
              ))}
            {formulaires.filter(form => 
              (form.nom_application && form.nom_application.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (form.fonctions && form.fonctions.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))) ||
              (form.acteur_nom && form.acteur_nom.toLowerCase().includes(searchTerm.toLowerCase()))
            ).length === 0 && (
              <Box display="flex" justifyContent="center" alignItems="center" height={150}>
                <Typography variant="body1" color="textSecondary">
                  Aucun formulaire ne correspond à votre recherche
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;