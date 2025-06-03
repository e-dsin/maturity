// src/components/InterpretationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import {
  AnalyseComplete,
  ThematiqueResult,
  InterpretationResult
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
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
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
 * Composant d'affichage des résultats d'interprétation
 */
const InterpretationDashboard: React.FC = () => {
  // Récupération des paramètres d'URL
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [analyseData, setAnalyseData] = useState<AnalyseComplete | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  // Formatage des données pour le graphique radar
  const formatChartData = (thematiques: ThematiqueResult[]) => {
    return thematiques.map(item => ({
      subject: item.thematique,
      score: parseFloat(item.score.toFixed(1)),
      fullMark: 50
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

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.get<AnalyseComplete>(`/api/interpretation/application/${id}`);
        setAnalyseData(data);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, api]);

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
  if (error || !analyseData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Données non disponibles'}</Alert>
      </Container>
    );
  }

  // Données formatées pour le graphique
  const chartData = formatChartData(analyseData.thematiques);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* En-tête avec le nom de l'application et le score global */}
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
              Évaluation de maturité DevSecOps
            </Typography>
            <Typography component="h2" variant="h5" gutterBottom>
              {analyseData.nomApplication}
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
                  value={(analyseData.scoreGlobal / 500) * 100}
                  size={120}
                  thickness={5}
                  sx={{
                    color: getScoreColor(analyseData.scoreGlobal),
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
                    {analyseData.scoreGlobal}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ ml: 3, maxWidth: '60%' }}>
                <Typography variant="h6" gutterBottom>
                  {analyseData.interpretation.niveau}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date d'analyse: {new Date(analyseData.dateAnalyse).toLocaleDateString()}
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
              <Tab label="Synthèse" />
              <Tab label="Par thématique" />
              <Tab label="Recommandations" />
            </Tabs>

            {/* Onglet Synthèse */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={4}>
                <Grid xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Graphique de maturité
                  </Typography>
                  <Paper sx={{ p: 2, height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 50]} />
                        <Radar
                          name="Score"
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
                    Interprétation globale
                  </Typography>
                  <Paper sx={{ p: 2, height: 400, overflow: 'auto' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {analyseData.interpretation.niveau}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {analyseData.interpretation.description}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Score global: {analyseData.scoreGlobal} / 500
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ce score correspond à un niveau de maturité {analyseData.interpretation.niveau.split(':')[0]}.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Par thématique */}
            <TabPanel value={tabValue} index={1}>
              <TableContainer component={Paper}>
                <Table aria-label="table des thématiques">
                  <TableHead>
                    <TableRow>
                      <TableCell>Thématique</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell align="right">Score max</TableCell>
                      <TableCell align="right">Pourcentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyseData.thematiques.map((thematique) => {
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

            {/* Onglet Recommandations */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <Card>
                    <CardHeader title="Recommandations globales" />
                    <CardContent>
                      <Typography variant="body1">
                        {analyseData.interpretation.recommandations || 'Aucune recommandation disponible'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Recommandations par thématique
                  </Typography>
                  <Divider />
                  <List>
                    {analyseData.thematiques.map((thematique) => (
                      <React.Fragment key={thematique.thematique}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" color="primary">
                                {thematique.thematique} - Score: {thematique.score.toFixed(1)}
                              </Typography>
                            }
                            secondary={
                              <>
                                {thematique.recommandations ? (
                                  <Typography variant="body2" color="text.primary" component="span">
                                    {thematique.recommandations}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary" component="span">
                                    Pas de recommandations spécifiques disponibles pour cette thématique.
                                  </Typography>
                                )}
                              </>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default InterpretationDashboard;