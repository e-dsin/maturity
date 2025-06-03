import React, { useEffect, useState } from 'react';
import api from '../../services/api';
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
import { Chip, List, ListItem, ListItemText, Divider, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

// Types
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
  id: string;
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

interface Formulaire {
  id_formulaire: string;
  date_modification: string;
  statut: string;
  acteur_nom: string;
  nom_application: string;
  nom_fonction: string;
  score_global: number;
}

// Couleurs pour les graphiques
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Récupérer toutes les données nécessaires
        const [
          entreprisesResponse,
          fonctionsResponse,
          applicationsResponse,
          formulairesResponse
        ] = await Promise.all([
          api.get('entreprises'),
          api.get('fonctions'),
          api.get('applications'),
          api.get('formulaires/recent')
        ]);
      // Imprimer dans la console pour déboguer
      console.log("Entreprises response:", entreprisesResponse);
      console.log("Fonctions response:", fonctionsResponse);
      console.log("Applications response:", applicationsResponse);
      console.log("Formulaires response:", formulairesResponse);

        // Traiter les données des entreprises
        const entreprisesData = Array.isArray(entreprisesResponse) 
          ? entreprisesResponse 
          : [];
        
        setEntreprises(entreprisesData);
        
        // Calculer les statistiques par secteur
        const secteursData = calculerStatistiquesSecteur(entreprisesData);
        setSecteurs(secteursData);
        
        // Traiter les données des fonctions
        const fonctionsData = Array.isArray(fonctionsResponse) 
          ? fonctionsResponse 
          : [];
        
        setFonctions(fonctionsData);
        
        // Traiter les données des applications
        const applicationsData = Array.isArray(applicationsResponse) 
          ? applicationsResponse.filter(app => app.score_global !== undefined && app.score_global !== null)
          : [];
        
        setApplications(applicationsData);
        
        // Extraire les options de filtrage
        const hebergements = [...new Set(applicationsData
          .map(app => app.hebergement || app.mode_hebergement)
          .filter(Boolean))];
        
        const technologies = [...new Set(applicationsData
          .map(app => app.technology || app.technologie || app.language)
          .filter(Boolean))];
        
        setHebergementOptions(hebergements);
        setTechnologieOptions(technologies);
        
        // Traiter les données des formulaires
        const formulairesData = Array.isArray(formulairesResponse) 
          ? formulairesResponse 
          : [];
        
        console.log("Formulaire data:", formulairesData);


        setFormulaires(formulairesData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Impossible de charger les données du tableau de bord.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
      
      // N'ajouter au total que si le score est défini
      if (entreprise.score_global !== undefined && entreprise.score_global !== null) {
        acc[secteur].scoreTotal += entreprise.score_global;
        acc[secteur].count++;
      }
      
      return acc;
    }, {} as Record<string, { scoreTotal: number, count: number }>);
    
    // Convertir en tableau et calculer les moyennes
    return Object.entries(secteursMap).map(([nom, { scoreTotal, count }]) => ({
      nom,
      nombre_entreprises: count,
      score_moyen: count > 0 ? scoreTotal / count : 0
    })).sort((a, b) => b.score_moyen - a.score_moyen);
  };

  const countFormulairesByFunction = () => {
    // Vérifier si les formulaires existent
    if (!formulaires || !formulaires.length) return [];
    
    // Vérifier dans la console les données reçues pour déboguer
    console.log("Formulaires reçus:", formulaires);
    
    // Compter les formulaires par fonction
    const countByFunction = formulaires.reduce((acc, form) => {
      // Utiliser questionnaire_titre qui est le champ correct provenant du backend
      const fonction = form.nom_fonction || form.thematique || form.titre || 'Non défini';
      acc[fonction] = (acc[fonction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Convertir en format pour graphique
    return Object.entries(countByFunction).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getFilteredApplications = () => {
    if (!applications || !applications.length) return [];
    
    console.log("Applications disponibles:", applications);
    
    return applications
      .filter(app => 
        (hebergementFilter === 'all' || 
         app.hebergement === hebergementFilter || 
         app.mode_hebergement === hebergementFilter) &&
        (technologieFilter === 'all' || 
         app.technologie === technologieFilter || 
         app.technology === technologieFilter || 
         app.language === technologieFilter)
      )
      .sort((a, b) => {
        // Gestion de undefined/null
        const scoreA = a.score_global !== undefined ? a.score_global : 0;
        const scoreB = b.score_global !== undefined ? b.score_global : 0;
        return scoreB - scoreA;
      })
      .slice(0, 10);
  };

  const calculateGlobalFunctionScore = () => {
    if (!fonctions || !fonctions.length) return 'N/A';
    
    const validScores = fonctions.filter(f => f.score_global !== undefined && f.score_global !== null);
    if (!validScores.length) return 'N/A';
    
    const total = validScores.reduce((sum, f) => {
      const score = typeof f.score_global === 'string' ? parseFloat(f.score_global) : f.score_global;
      return sum + score;
    }, 0);
    
    return (total / validScores.length).toFixed(2);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
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
  const getScoreColor = (score: number) => {
    if (score >= 3.5) return "success";
    if (score >= 2) return "warning";
    return "error";
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={3}>
        {/* Titre du tableau de bord */}
        <Grid xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography component="h1" variant="h4" color="primary" gutterBottom>
              Tableau de bord de maturité
            </Typography>
            <Typography variant="body1">
              Vue d'ensemble des scores de maturité par secteur, fonction et application.
            </Typography>
          </Paper>
        </Grid>

        {/* Statistiques globales en format carte */}
        <Grid xs={12} md={3}>
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

        <Grid xs={12} md={3}>
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

        <Grid xs={12} md={3}>
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
        <Grid xs={12} md={6}>
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
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography variant="body1" color="textSecondary">
                  Aucune donnée disponible
                </Typography>
              </Box>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Nombre d'entreprises par secteur indiqué entre parenthèses
            </Typography>
          </Paper>
        </Grid>

        {/* Nombre de formulaires par fonction */}
        <Grid xs={12} md={6}>
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
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography variant="body1" color="textSecondary">
                  Aucune donnée disponible
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Liste des 10 derniers formulaires */}
        <Grid xs={12} md={6}>
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
                (form.nom_fonction && form.nom_fonction.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (form.acteur_nom && form.acteur_nom.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .slice(0, 10)
              .map((form, index) => (
                <React.Fragment key={form.id_formulaire || `form-${index}`}>
                  <ListItem
                    button 
                    onClick={() => navigate(`/formulaires/${form.id_formulaire}`)}
                    sx={{ 
                      borderLeft: '4px solid', 
                      borderColor: form.score_global ? 
                        (form.score_global >= 3.5 ? '#4CAF50' : form.score_global >= 2 ? '#FF9800' : '#F44336') : 
                        '#9E9E9E',
                      mb: 1,
                      bgcolor: '#f9f9f9',
                      '&:hover': {
                        bgcolor: '#f0f0f0',
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#0B4E87' }}>
                            Fonction: {form.nom_fonction || form.thematique || 'Non spécifiée'}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                            <Typography variant="body2" component="span">
                              Application: {form.nom_application || 'Application inconnue'}
                            </Typography>
                            <Chip 
                              label={`Score: ${typeof form.score_actuel === 'number' ? form.score_actuel.toFixed(1) : form.score_actuel || '0'} / ${typeof form.score_maximum === 'number' ? form.score_maximum.toFixed(1) : form.score_maximum || '0'}`} 
                              size="small" 
                              color={getScoreColor(form.score_maximum > 0 ? (form.score_actuel / form.score_maximum) * 5 : 0)}
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                              Acteur: {form.acteur_nom || 'Utilisateur inconnu'}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                            <Typography variant="caption" color="textSecondary">
                              Créé le: {form.date_creation ? new Date(form.date_creation).toLocaleDateString() : 'Date inconnue'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Modifié le: {form.date_modification ? new Date(form.date_modification).toLocaleDateString() : 'Date inconnue'}
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
              (form.nom_fonction && form.nom_fonction.toLowerCase().includes(searchTerm.toLowerCase())) ||
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

        {/* Top 10 applications par score avec filtres */}
        <Grid xs={12}>
          <Card>
            <CardHeader 
              title="Top 10 Applications par Score de Maturité" 
              action={
                <Box display="flex" gap={2}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="hebergement-filter-label">Hébergement</InputLabel>
                    <Select
                      labelId="hebergement-filter-label"
                      value={hebergementFilter}
                      onChange={(e) => setHebergementFilter(e.target.value as string)}
                      label="Hébergement"
                    >
                      <MenuItem value="all">Tous</MenuItem>
                      {hebergementOptions && hebergementOptions.map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="technologie-filter-label">Technologie</InputLabel>
                    <Select
                      labelId="technologie-filter-label"
                      value={technologieFilter}
                      onChange={(e) => setTechnologieFilter(e.target.value as string)}
                      label="Technologie"
                    >
                      <MenuItem value="all">Toutes</MenuItem>
                      {technologieOptions && technologieOptions.map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              }
            />
            <CardContent>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="Graphique" />
                <Tab label="Tableau" />
              </Tabs>
              
              {tabValue === 0 ? (
                getFilteredApplications().length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getFilteredApplications()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nom_application" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="score_global" 
                        fill="#0B4E87" 
                        name="Score de maturité"
                        barSize={40}
                      >
                        {getFilteredApplications().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography variant="body1" color="textSecondary">
                      Aucune application ne correspond aux filtres sélectionnés
                    </Typography>
                  </Box>
                )
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  {getFilteredApplications().length > 0 ? (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Application</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Hébergement</TableCell>
                          <TableCell>Technologie</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getFilteredApplications().map((app) => (
                          <TableRow key={app.id_application}>
                            <TableCell>{app.nom_application}</TableCell>
                            <TableCell>
                              <Chip 
                                label={typeof app.score_global === 'number' ? app.score_global.toFixed(2) : app.score_global} 
                                color={getScoreColor(parseFloat(String(app.score_global)))}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{app.mode_hebergement || 'Non spécifié'}</TableCell>
                            <TableCell>{app.technologie || 'Non spécifiée'}</TableCell>
                            <TableCell>
                              <Button 
                                size="small" 
                                onClick={() => navigate(`/applications/${app.id_application}`)}
                              >
                                Détails
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                      <Typography variant="body1" color="textSecondary">
                        Aucune application ne correspond aux filtres sélectionnés
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;