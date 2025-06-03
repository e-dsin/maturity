// src/components/OrganizationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import {
  AnalyseComplete,
  ThematiqueResult
} from '../services/interpretationService';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Génère des couleurs pour les graphiques
 */
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
];

/**
 * Composant d'affichage des résultats au niveau de l'organisation
 */
const OrganizationDashboard: React.FC = () => {
  // Récupération des paramètres d'URL
  const { orgName } = useParams<{ orgName: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [analyses, setAnalyses] = useState<AnalyseComplete[]>([]);
  const [scoresMoyens, setScoresMoyens] = useState<ThematiqueResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  // Calcul du score global moyen de l'organisation
  const calculateAverageScore = (analyses: AnalyseComplete[]): number => {
    if (analyses.length === 0) return 0;
    const sum = analyses.reduce((acc, curr) => acc + curr.scoreGlobal, 0);
    return sum / analyses.length;
  };

  // Formatage des données pour le graphique radar
  const formatRadarData = (scoresMoyens: ThematiqueResult[]) => {
    return scoresMoyens.map(item => ({
      subject: item.thematique.split('&')[0].trim(), // Raccourcir les noms pour le graphique
      score: parseFloat(item.score.toFixed(1)),
      fullMark: 50
    }));
  };

  // Formatage des données pour le graphique à barres
  const formatBarData = (analyses: AnalyseComplete[]) => {
    return analyses.map((analyse, index) => ({
      name: analyse.nomApplication.split('-')[0].trim(), // Nom abrégé de l'application
      score: analyse.scoreGlobal,
      color: COLORS[index % COLORS.length]
    }));
  };

  // Fonction pour déterminer la couleur selon le score
  const getScoreColor = (score: number): string => {
    if (score <= 100) return '#e57373'; // Rouge
    if (score <= 200) return '#ffb74d'; // Orange
    if (score <= 300) return '#fff176'; // Jaune
    if (score <= 400) return '#81c784'; // Vert clair
    return '#66bb6a'; // Vert
  };

  // Fonction pour déterminer le niveau de maturité selon le score
  const getMaturityLevel = (score: number): string => {
    if (score <= 100) return 'Niveau 1: Initial';
    if (score <= 200) return 'Niveau 2: Basique';
    if (score <= 300) return 'Niveau 3: Défini';
    if (score <= 400) return 'Niveau 4: Géré';
    return 'Niveau 5: Optimisé';
  };

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analysesData, scoresMoyensData] = await Promise.all([
          api.get<AnalyseComplete[]>(`/api/interpretation/organisation/${orgName}`),
          api.get<ThematiqueResult[]>(`/api/interpretation/organisation/${orgName}/scores-moyens`)
        ]);
        
        setAnalyses(analysesData);
        setScoresMoyens(scoresMoyensData);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    if (orgName) {
      fetchData();
    }
  }, [orgName, api]);

  // Gestionnaire de changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Affichage du chargement
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Affichage si aucune donnée
  if (analyses.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">Aucune analyse disponible pour cette organisation.</Alert>
      </Container>
    );
  }

  // Calcul du score moyen
  const averageScore = calculateAverageScore(analyses);
  
  // Données formatées pour les graphiques
  const radarData = formatRadarData(scoresMoyens);
  const barData = formatBarData(analyses);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* En-tête avec le nom de l'organisation et le score global moyen */}
        <Grid xs={12}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: 2
            }}
          >
            <Typography component="h1" variant="h4" color="primary" gutterBottom>
              Maturité DevSecOps de l'organisation
            </Typography>
            <Typography component="h2" variant="h5" gutterBottom>
              {orgName}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mt: 2
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  m: 2
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={(averageScore / 500) * 100}
                  size={120}
                  thickness={5}
                  sx={{
                    color: getScoreColor(averageScore),
                    circle: {
                      strokeLinecap: 'round'
                    }
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h4" component="div" color="text.secondary">
                    {averageScore.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ ml: 3, maxWidth: '60%' }}>
                <Typography variant="h6" gutterBottom>
                  {getMaturityLevel(averageScore)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score moyen sur {analyses.length} applications évaluées
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Onglets pour navigation entre les différentes vues */}
        <Grid xs={12}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
            >
              <Tab label="Vue d'ensemble" />
              <Tab label="Applications" />
              <Tab label="Thématiques" />
            </Tabs>

            {/* Onglet Vue d'ensemble */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={4}>
                <Grid xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Maturité par thématique
                  </Typography>
                  <Paper sx={{ p: 2, height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 50]} />
                        <Radar
                          name="Score moyen"
                          dataKey="score"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Comparaison des applications
                  </Typography>
                  <Paper sx={{ p: 2, height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        width={500}
                        height={300}
                        data={barData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 500]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="score" name="Score global" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Applications */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                {analyses.map((analyse, index) => (
                  <Grid xs={12} sm={6} md={4} key={analyse.idApplication}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderTop: `5px solid ${getScoreColor(analyse.scoreGlobal)}`
                      }}
                    >
                      <CardHeader
                        title={analyse.nomApplication}
                        subheader={`Score: ${analyse.scoreGlobal} / 500`}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {getMaturityLevel(analyse.scoreGlobal)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(analyse.scoreGlobal / 500) * 100}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            mt: 1, mb: 2,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              backgroundColor: getScoreColor(analyse.scoreGlobal),
                            },
                          }}
                        />
                        <Typography variant="body2">
                          Date d'analyse: {new Date(analyse.dateAnalyse).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          component={Link} 
                          to={`/interpretation/application/${analyse.idApplication}`}
                        >
                          Voir détails
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </TabPanel>

            {/* Onglet Thématiques */}
            <TabPanel value={tabValue} index={2}>
              <TableContainer component={Paper}>
                <Table aria-label="table des thématiques">
                  <TableHead>
                    <TableRow>
                      <TableCell>Thématique</TableCell>
                      <TableCell align="right">Score moyen</TableCell>
                      <TableCell align="right">Score max</TableCell>
                      <TableCell align="right">Pourcentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scoresMoyens.map((thematique) => {
                      // Calculer le score maximum pour chaque thématique
                      let maxScore = 50; // Par défaut
                      if (thematique.thematique.includes('Opérations & CI/CD')) maxScore = 80;
                      if (thematique.thematique.includes('Gestion des vulnérabilités') || 
                          thematique.thematique.includes('Satisfaction Client')) maxScore = 60;

                      const percentage = (thematique.score / maxScore) * 100;

                      return (
                        <TableRow
                          key={thematique.thematique}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {thematique.thematique}
                          </TableCell>
                          <TableCell align="right">{thematique.score.toFixed(1)}</TableCell>
                          <TableCell align="right">{maxScore}</TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={percentage} 
                                  sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: '#e0e0e0',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 5,
                                      backgroundColor: percentage < 40 ? '#f44336' : 
                                                       percentage < 60 ? '#ff9800' : 
                                                       percentage < 80 ? '#4caf50' : '#2196f3',
                                    },
                                  }}
                                />
                              </Box>
                              <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">{`${Math.round(percentage)}%`}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrganizationDashboard;