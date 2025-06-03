import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Chip,
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getNiveauColor } from '../../utils/AnalyseUtils';
import api from '../../services/api';

// Types
interface Thematique {
  id: string;
  nom: string;
  score: string;
  niveau: string;
  recommandations: string;
}

interface Fonction {
  id: string;
  nom: string;
  score_global: string;
  niveau: string;
  recommandations: string;
  thematiques: Thematique[];
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  score_global: string;
  niveau_global: string;
  recommandations_globales: string;
  fonctions: Fonction[];
}

// Helper function to ensure a value is a number and format it
const formatScore = (score: string | undefined | null): string => {
  if (score === undefined || score === null) return 'N/A';
  return parseFloat(score).toFixed(1);
};

const AnalysesFonctions: React.FC = () => {
  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('');
  const [entrepriseDetails, setEntrepriseDetails] = useState<Entreprise | null>(null);
  const [selectedFonction, setSelectedFonction] = useState<string>('');
  const [fonctionDetails, setFonctionDetails] = useState<Fonction | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  // Fetch enterprises on mount
  useEffect(() => {
    fetchEntreprises();
  }, []);

  // Fetch enterprise details when selected
  useEffect(() => {
    if (selectedEntreprise) {
      fetchEntrepriseDetails(selectedEntreprise);
    }
  }, [selectedEntreprise]);

  // Update function details when selected
  useEffect(() => {
    if (selectedFonction && entrepriseDetails?.fonctions) {
      const fonction = entrepriseDetails.fonctions.find((f) => f.id === selectedFonction) || null;
      setFonctionDetails(fonction);
    } else {
      setFonctionDetails(null);
    }
  }, [selectedFonction, entrepriseDetails]);

  // Fetch enterprises
  const fetchEntreprises = async () => {
    try {
      setLoading(true);
      const response = await api.get('entreprises');
      if (Array.isArray(response)) {
        const uniqueEntreprises = Array.from(
          new Map(response.map((item) => [item.id_entreprise, item])).values(),
        );
        const sortedEntreprises = uniqueEntreprises.sort((a, b) =>
          a.nom_entreprise.localeCompare(b.nom_entreprise),
        );
        setEntreprises(sortedEntreprises);
        if (sortedEntreprises.length > 0) {
          setSelectedEntreprise(sortedEntreprises[0].id_entreprise);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erreur lors du chargement des entreprises:', err.message);
      setError('Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  };

  // Fetch enterprise maturity details
  const fetchEntrepriseDetails = async (entrepriseId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`entreprises/${entrepriseId}/maturity-analysis`);
     
              // LOG COMPLET DE LA RÉPONSE
            console.log('=== RÉPONSE API COMPLÈTE ===');
            console.log(JSON.stringify(response, null, 2));
            
            // LOG SPÉCIFIQUE DES FONCTIONS
            if (response && response.fonctions) {
              console.log('=== FONCTIONS REÇUES ===');
              response.fonctions.forEach((f: any, index: number) => {
                console.log(`Fonction ${index}:`, {
                  id: f.id,
                  nom: f.nom,
                  score_global: f.score_global,
                  niveau: f.niveau,
                  // Vérifier si le niveau est sous un autre nom
                  level: f.level,
                  maturity_level: f.maturity_level,
                  niveau_global: f.niveau_global,
                  // Afficher toutes les clés de l'objet
                  toutes_les_cles: Object.keys(f)
                });
              });
            }
                
     
      if (response) {
        setEntrepriseDetails(response);
        if (response.fonctions.length > 0) {
          setSelectedFonction(response.fonctions[0].id);
        } else {
          setError("Aucune fonction évaluée pour cette entreprise.");
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erreur lors du chargement des détails de l\'entreprise:', err.message);
      setError("Impossible de charger les détails de l'entreprise.");
    } finally {
      setLoading(false);
    }
  };

  // Handle enterprise selection
  const handleEntrepriseChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const entrepriseId = event.target.value as string;
    setSelectedEntreprise(entrepriseId);
  };

  // Handle function selection
  const handleFonctionChange = (fonctionId: string) => {
    setSelectedFonction(fonctionId);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Convert thematiques to radar chart data
  const convertToRadarData = (thematiques: Thematique[] = []) => {
    return thematiques.map((theme) => ({
      thematique: theme.nom,
      score: theme.score 
      ? parseFloat(theme.score) 
      : (theme.score_moyen ? parseFloat(theme.score_moyen.toString()) : 0),
      fullMark: 5,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
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
        {/* Enterprise selection */}
        <Grid xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography component="h1" variant="h5" color="primary">
                Analyses de maturité par Fonctions évaluées
              </Typography>
            </Box>

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="entreprise-select-label">Entreprise</InputLabel>
              <Select
                labelId="entreprise-select-label"
                id="entreprise-select"
                value={selectedEntreprise}
                onChange={handleEntrepriseChange}
                label="Entreprise"
              >
                {entreprises.map((entreprise, index) => (
                  <MenuItem key={`${entreprise.id_entreprise}-${index}`} value={entreprise.id_entreprise}>
                    {entreprise.nom_entreprise}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* Global maturity score */}
        {entrepriseDetails && (
          <Grid xs={12}>
            <Card sx={{ bgcolor: '#f8f9fa', borderLeft: '5px solid #0B4E87' }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Score Global de Maturité
                      </Typography>
                      <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold', my: 1 }}>
                        {formatScore(entrepriseDetails.score_global)}
                      </Typography>
                      {entrepriseDetails.niveau_global && (
                        <Chip
                          label={entrepriseDetails.niveau_global}
                          color={getNiveauColor(entrepriseDetails.niveau_global)}
                          size="medium"
                          sx={{ fontSize: '1rem', px: 2 }}
                        />
                      )}
                    </Box>
                  </Grid>
                  <Grid xs={12} md={8}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Recommandations:
                    </Typography>
                    <Typography variant="body1">
                      {entrepriseDetails.recommandations_globales ||
                        'Aucune recommandation disponible pour cette entreprise.'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Function list */}
        <Grid xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Fonctions Évaluées" />
            <CardContent>
              {entrepriseDetails?.fonctions.length > 0 ? (
                <List>
                  {entrepriseDetails.fonctions.map((fonction, index) => (
                    <React.Fragment key={`fonction-${fonction.id}-${index}`}>
                      <ListItem
                        onClick={() => handleFonctionChange(fonction.id)}
                        sx={{
                          borderLeft:
                            selectedFonction === fonction.id ? '4px solid #0B4E87' : '4px solid transparent',
                          bgcolor: selectedFonction === fonction.id ? 'rgba(11, 78, 135, 0.05)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1">{fonction.nom}</Typography>
                              <Chip
                                label={formatScore(fonction.score_global)}
                                color={getNiveauColor(fonction.niveau || '')}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {fonction.niveau || 'Niveau non défini'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < entrepriseDetails.fonctions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">Aucune fonction évaluée pour cette entreprise.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Selected function analysis */}
        <Grid xs={12} md={8}>
          {fonctionDetails ? (
            <Card>
              <CardHeader
                title={`Analyse de la fonction: ${fonctionDetails.nom}`}
                action={
                  <Chip
                    label={`Score: ${formatScore(fonctionDetails.score_global)}`}
                    color={getNiveauColor(fonctionDetails.niveau || '')}
                  />
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
                  <Tab label="Vue d'ensemble" />
                  <Tab label="Recommandations Qwanza" />
                  <Tab label="Recommandations LLM Publics" />
                </Tabs>

                {/* Overview tab */}
                {tabValue === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Score par Thématique
                    </Typography>

                    {fonctionDetails.thematiques && fonctionDetails.thematiques.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <RadarChart
                          outerRadius={150}
                          width={500}
                          height={350}
                          data={convertToRadarData(fonctionDetails.thematiques)}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="thematique" />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="#0B4E87"
                            fill="#0B4E87"
                            fillOpacity={0.6}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Alert severity="info">Aucune donnée de thématique disponible pour cette fonction.</Alert>
                    )}
                  </Box>
                )}

                {/* Recommendations tab */}
                {tabValue === 1 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Recommandation globale pour la fonction:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {fonctionDetails.recommandations || 'Aucune recommandation globale disponible.'}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Recommandations par thématique:
                    </Typography>
                    {fonctionDetails.thematiques.length > 0 ? (
                      <List>
                        {fonctionDetails.thematiques.map((theme, index) => (
                          <React.Fragment key={`theme-${theme.id}-${index}`}>
                            <ListItem>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle2">{theme.nom}</Typography>
                                    <Chip
                                      label={theme.niveau}
                                      color={getNiveauColor(theme.niveau || '')}
                                      size="small"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="body2">
                                    <strong>Score:</strong> {formatScore(theme.score)}
                                    <br />
                                    <strong>Recommandations:</strong> {theme.recommandations}
                                  </Typography>
                                }
                              />
                            </ListItem>
                            {index < fonctionDetails.thematiques.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Alert severity="info">Aucune recommandation thématique disponible pour cette fonction.</Alert>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">Veuillez sélectionner une fonction pour voir son analyse détaillée.</Alert>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalysesFonctions;