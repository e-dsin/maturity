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
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';

// Types
interface Organisation {
  nom: string;
  nombre_applications: number;
  nombre_analyses: number;
  score_moyen: number;
}

interface Analyse {
  idAnalyse: string;
  idApplication: string;
  nomApplication: string;
  scoreGlobal: number;
  interpretation: {
    niveau: string;
    description: string;
    recommandations: string;
  };
  thematiques: {
    thematique: string;
    score: number;
  }[];
  dateAnalyse: string;
}

interface ScoreMoyen {
  thematique: string;
  score: number;
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
      id={`organization-tabpanel-${index}`}
      aria-labelledby={`organization-tab-${index}`}
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

// Générer des couleurs pour les graphiques
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

// Composant principal
const Organisations: React.FC = () => {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();
  
  // États pour les données
  const [loading, setLoading] = useState<boolean>(true);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [scoresMoyens, setScoresMoyens] = useState<ScoreMoyen[]>([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Charger les organisations et analyses
  useEffect(() => {
    fetchOrganisations().then(() => {
      if (name) {
        setSelectedOrganisation(name);
        fetchAnalysesOrganisation(name);
      }
    });
  }, [name]);

  // Récupérer toutes les organisations uniques (extraites des acteurs)
  const fetchOrganisations = async () => {
    setLoading(true);
    try {
      const response = await api.get('acteurs');
      
      // Extraire les organisations uniques
      const orgs = [...new Set(response.data.map((acteur: any) => acteur.organisation))].filter(Boolean);
      
      // Préparer les données statistiques des organisations
      const organisationsData: Organisation[] = [];
      
      for (const org of orgs) {
        // Pour chaque organisation, récupérer les statistiques
        try {
          const appCount = await api.get(`acteurs/organisation/${org}/applications/count`);
          const analyses = await api.get(`interpretation/organisation/${org}`);
          
          const scoreTotal = analyses.data.reduce((sum: number, analyse: Analyse) => sum + analyse.scoreGlobal, 0);
          const scoreMoyen = analyses.data.length > 0 ? scoreTotal / analyses.data.length : 0;
          
          organisationsData.push({
            nom: org,
            nombre_applications: appCount.data.count,
            nombre_analyses: analyses.data.length,
            score_moyen: scoreMoyen
          });
        } catch (error) {
          console.error(`Erreur lors de la récupération des statistiques pour ${org}:`, error);
        }
      }
      
      setOrganisations(organisationsData);
      
      if (!name && organisationsData.length > 0) {
        setSelectedOrganisation(organisationsData[0].nom);
        fetchAnalysesOrganisation(organisationsData[0].nom);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les analyses d'une organisation
  const fetchAnalysesOrganisation = async (orgName: string) => {
    setLoading(true);
    try {
      const analysesResponse = await api.get(`interpretation/organisation/${orgName}`);
      setAnalyses(analysesResponse.data);
      
      const scoresMoyensResponse = await api.get(`interpretation/organisation/${orgName}/scores-moyens`);
      setScoresMoyens(scoresMoyensResponse.data);
      
      setTabValue(0);
    } catch (error) {
      console.error('Erreur lors du chargement des analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer le changement d'organisation
  const handleOrganisationChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const orgName = event.target.value as string;
    setSelectedOrganisation(orgName);
    navigate(`/organisations/${orgName}`);
  };

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Formater les données pour le radar chart
  const formatForRadarChart = (data: ScoreMoyen[]) => {
    return data.map(item => ({
      thematique: item.thematique,
      score: item.score,
      fullMark: 5
    }));
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
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography component="h1" variant="h5" color="primary">
                Analyse par Organisation
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="organisation-select-label">Organisation</InputLabel>
                <Select
                  labelId="organisation-select-label"
                  id="organisation-select"
                  value={selectedOrganisation}
                  onChange={handleOrganisationChange}
                  label="Organisation"
                >
                  {organisations.map((org) => (
                    <MenuItem key={org.nom} value={org.nom}>
                      {org.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Statistiques de l'organisation sélectionnée */}
            {selectedOrganisation && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" align="center">
                        {organisations.find(org => org.nom === selectedOrganisation)?.nombre_applications || 0}
                      </Typography>
                      <Typography variant="body2" align="center">
                        Applications
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" align="center">
                        {organisations.find(org => org.nom === selectedOrganisation)?.nombre_analyses || 0}
                      </Typography>
                      <Typography variant="body2" align="center">
                        Analyses
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" align="center">
                        {(organisations.find(org => org.nom === selectedOrganisation)?.score_moyen || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" align="center">
                        Score Moyen
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Onglets */}
        <Grid xs={12}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Vue d'ensemble" />
              <Tab label="Scores par Thématique" />
              <Tab label="Applications" />
            </Tabs>

            {/* Onglet Vue d'ensemble */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                {/* Radar Chart pour les scores par thématique */}
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Scores moyens par thématique" />
                    <CardContent>
                      {scoresMoyens.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <RadarChart outerRadius={150} data={formatForRadarChart(scoresMoyens)}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="thematique" />
                            <PolarRadiusAxis domain={[0, 5]} />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#8884d8"
                              fill="#8884d8"
                              fillOpacity={0.6}
                            />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography variant="body1" align="center">
                          Aucune donnée disponible
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Bar Chart pour les scores globaux par application */}
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Scores globaux par application" />
                    <CardContent>
                      {analyses.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={analyses.map(analyse => ({
                              name: analyse.nomApplication,
                              score: analyse.scoreGlobal
                            }))}
                            margin={{ top: 5, right: 30, left: 20, bottom: 100 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ angle: -45, textAnchor: 'end' }}
                              height={100}
                            />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="score" name="Score Global">
                              {analyses.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography variant="body1" align="center">
                          Aucune donnée disponible
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Statistiques par niveau de maturité */}
                <Grid xs={12}>
                  <Card>
                    <CardHeader title="Répartition par niveau de maturité" />
                    <CardContent>
                      {analyses.length > 0 ? (
                        <>
                          <Grid container spacing={2}>
                            {Array.from(new Set(analyses.map(a => a.interpretation.niveau))).map((niveau, index) => {
                              const count = analyses.filter(a => a.interpretation.niveau === niveau).length;
                              const percentage = (count / analyses.length * 100).toFixed(1);
                              
                              return (
                                <Grid xs={6} md={3} key={niveau}>
                                  <Card variant="outlined">
                                    <CardContent sx={{ textAlign: 'center' }}>
                                      <Typography variant="h6" gutterBottom>
                                        {niveau}
                                      </Typography>
                                      <Typography variant="h4" color={COLORS[index % COLORS.length]}>
                                        {count}
                                      </Typography>
                                      <Typography variant="body2" color="textSecondary">
                                        {percentage}% des applications
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </>
                      ) : (
                        <Typography variant="body1" align="center">
                          Aucune donnée disponible
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Scores par Thématique */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                {/* Tableau des scores moyens par thématique */}
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Scores moyens par thématique" />
                    <CardContent>
                      {scoresMoyens.length > 0 ? (
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Thématique</TableCell>
                                <TableCell>Score Moyen</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {scoresMoyens.map((score) => (
                                <TableRow key={score.thematique}>
                                  <TableCell>{score.thematique}</TableCell>
                                  <TableCell>
                                    <Box display="flex" alignItems="center">
                                      <Box width="50px" mr={1}>
                                        {score.score.toFixed(2)}
                                      </Box>
                                      <Box flex={1} mr={1}>
                                        <div style={{ 
                                          height: '10px', 
                                          width: `${score.score / 5 * 100}%`, 
                                          backgroundColor: '#8884d8',
                                          borderRadius: '5px'
                                        }} />
                                      </Box>
                                      <Box width="30px">
                                        <Chip 
                                          label={score.score >= 4 ? 'A' : 
                                                score.score >= 3 ? 'B' : 
                                                score.score >= 2 ? 'C' : 
                                                score.score >= 1 ? 'D' : 'E'}
                                          size="small"
                                          color={score.score >= 4 ? 'success' : 
                                                 score.score >= 3 ? 'info' : 
                                                 score.score >= 2 ? 'warning' : 
                                                 'error'}
                                        />
                                      </Box>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body1" align="center">
                          Aucune donnée disponible
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Détail des applications par thématique */}
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Détail par application et thématique" />
                    <CardContent>
                      {scoresMoyens.length > 0 ? (
                        <TableContainer sx={{ maxHeight: 440 }}>
                          <Table stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Application</TableCell>
                                <TableCell>Thématique</TableCell>
                                <TableCell>Score</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {analyses.flatMap((analyse) => 
                                analyse.thematiques.map((theme) => (
                                  <TableRow key={`${analyse.idAnalyse}-${theme.thematique}`}>
                                    <TableCell>{analyse.nomApplication}</TableCell>
                                    <TableCell>{theme.thematique}</TableCell>
                                    <TableCell>
                                      <Box display="flex" alignItems="center">
                                        <Box width="30px" mr={1}>
                                          {theme.score.toFixed(1)}
                                        </Box>
                                        <Box flex={1}>
                                          <div style={{ 
                                            height: '8px', 
                                            width: `${theme.score / 5 * 100}%`, 
                                            backgroundColor: '#82ca9d',
                                            borderRadius: '4px'
                                          }} />
                                        </Box>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body1" align="center">
                          Aucune donnée disponible
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Applications */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                {/* Liste des applications */}
                <Grid xs={12}>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Application</TableCell>
                          <TableCell>Score Global</TableCell>
                          <TableCell>Niveau de Maturité</TableCell>
                          <TableCell>Date d'Analyse</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyses.map((analyse) => (
                          <TableRow key={analyse.idAnalyse} hover>
                            <TableCell>{analyse.nomApplication}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Box width="50px" mr={1}>
                                  {analyse.scoreGlobal.toFixed(2)}
                                </Box>
                                <Box flex={1}>
                                  <div style={{ 
                                    height: '10px', 
                                    width: `${analyse.scoreGlobal / 5 * 100}%`,
                                    backgroundColor: COLORS[analyses.indexOf(analyse) % COLORS.length],
                                    borderRadius: '5px'
                                  }} />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={analyse.interpretation.niveau} 
                                color={
                                  analyse.scoreGlobal >= 4 ? 'success' : 
                                  analyse.scoreGlobal >= 3 ? 'info' : 
                                  analyse.scoreGlobal >= 2 ? 'warning' : 
                                  'error'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(analyse.dateAnalyse).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outlined" 
                                size="small"
                                onClick={() => navigate(`/analyses-interpretations/${analyse.idAnalyse}`)}
                              >
                                Détails
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Organisations;