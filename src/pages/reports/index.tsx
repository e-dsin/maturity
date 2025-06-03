// src/pages/reports/index.tsx
import React, { useState, useEffect } from 'react';
import { useInterpretationApi } from '../../hooks/useApi';
import { AnalyseComplete, ThematiqueResult } from '../../services/interpretationService';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Link } from 'react-router-dom';
import ThematiqueBreakdownChart from '../../components/charts/ThematiqueBreakdownChart';
import MaturityProgressChart from '../../components/charts/MaturityProgressChart';
import OrganisationMaturityComparisonChart from '../../components/charts/OrganisationMaturityComparisonChart';

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Liste des organisations (à récupérer dynamiquement dans un vrai scénario)
const ORGANISATIONS = [
  'TotalEnergies',
  'LVMH',
  'Sanofi',
  'BNP Paribas',
  'Airbus',
];

const ReportsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState(ORGANISATIONS[0]);
  const [applications, setApplications] = useState<AnalyseComplete[]>([]);
  const [scoresMoyens, setScoresMoyens] = useState<ThematiqueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const interpretationApi = useInterpretationApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [analysesData, scoresMoyensData] = await Promise.all([
          interpretationApi.getAnalysesOrganisation(selectedOrg),
          interpretationApi.getScoresMoyensOrganisation(selectedOrg)
        ]);
        
        setApplications(analysesData);
        setScoresMoyens(scoresMoyensData);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedOrg]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOrgChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedOrg(event.target.value as string);
  };

  // Calcul du score global moyen
  const averageScore = applications.length > 0
    ? applications.reduce((sum, app) => sum + app.scoreGlobal, 0) / applications.length
    : 0;
  
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Rapports de Maturité DevSecOps
        </Typography>
        <FormControl variant="outlined" sx={{ minWidth: 200 }}>
          <InputLabel id="organisation-select-label">Organisation</InputLabel>
          <Select
            labelId="organisation-select-label"
            value={selectedOrg}
            onChange={handleOrgChange}
            label="Organisation"
          >
            {ORGANISATIONS.map((org) => (
              <MenuItem key={org} value={org}>
                {org}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
          <Box
            sx={{
              position: 'relative',
              display: 'inline-flex',
              mr: 3
            }}
          >
            <CircularProgress
              variant="determinate"
              value={(averageScore / 500) * 100}
              size={80}
              thickness={5}
              sx={{
                color: getScoreColor(averageScore),
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
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" component="div" color="text.secondary">
                {Math.round(averageScore)}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="h5" component="div">
              {selectedOrg}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {getMaturityLevel(averageScore)}
            </Typography>
            <Typography variant="body2">
              {applications.length} applications évaluées
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            component={Link} 
            to={`/interpretation/organisation/${selectedOrg}`} 
            variant="contained"
          >
            Voir détails
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ width: '100%', mb: 4 }}>
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

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid xs={12} md={6}>
              <Card>
                <CardHeader title="Répartition par thématique" />
                <CardContent sx={{ height: 350 }}>
                  <ThematiqueBreakdownChart data={scoresMoyens} />
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} md={6}>
              <Card>
                <CardHeader title="Comparaison des organisations" />
                <CardContent sx={{ height: 350 }}>
                  <OrganisationMaturityComparisonChart currentOrg={selectedOrg} />
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12}>
              <Card>
                <CardHeader title="Progression de la maturité" />
                <CardContent sx={{ height: 350 }}>
                  <MaturityProgressChart organisation={selectedOrg} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {applications.map((app) => (
              <Grid xs={12} md={4} key={app.idApplication}>
                <Card>
                  <CardHeader 
                    title={app.nomApplication} 
                    sx={{ 
                      borderBottom: `4px solid ${getScoreColor(app.scoreGlobal)}`,
                      pb: 1
                    }}
                  />
                  <CardContent>
                    <Typography variant="h5" align="center" sx={{ mb: 1 }}>
                      {app.scoreGlobal}/500
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {app.interpretation.niveau}
                    </Typography>
                    <Typography variant="body2">
                      Dernière évaluation: {new Date(app.dateAnalyse).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      component={Link} 
                      to={`/interpretation/application/${app.idApplication}`}
                    >
                      Voir détails
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {applications.length === 0 && (
              <Grid xs={12}>
                <Alert severity="info">
                  Aucune application évaluée pour cette organisation.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {scoresMoyens.map((theme) => {
              // Calculer le score maximum pour chaque thématique
              let maxScore = 50; // Par défaut
              if (theme.thematique.includes('Opérations & CI/CD')) maxScore = 80;
              if (theme.thematique.includes('Gestion des vulnérabilités') || 
                  theme.thematique.includes('Satisfaction Client')) maxScore = 60;

              const percentage = (theme.score / maxScore) * 100;
              
              return (
                <Grid xs={12} md={6} key={theme.thematique}>
                  <Card>
                    <CardHeader 
                      title={theme.thematique}
                      subheader={`Score: ${theme.score.toFixed(1)}/${maxScore} (${Math.round(percentage)}%)`}
                    />
                    <CardContent>
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
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default ReportsPage;