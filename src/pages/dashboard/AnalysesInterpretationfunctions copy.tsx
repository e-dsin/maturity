import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, CardHeader,
  Tabs, Tab, List, ListItem, ListItemText, Divider, Alert, FormControl, InputLabel,
  MenuItem, Select, Chip,
} from '@mui/material';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
} from 'recharts';
import { getNiveauColor } from '../../utils/AnalyseUtils';
import api from '../../services/api';

// Types corrigés selon la vraie structure des données
interface Thematique {
  id: string;
  nom: string;
  score: number;
  score_moyen: number;
  niveau: string;
  recommandations: string;
  description?: string;
}

interface Fonction {
  id: string;
  nom: string;
  score_global: number;
  niveau: string;
  recommandations: string;
  description?: string;
  thematiques: Thematique[];
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  secteur?: string;  // Nouveau champ pour le secteur
  score_global: string;
  niveau_global: string;
  recommandations_globales: string;
  fonctions: Fonction[];
}

// Nouveaux types pour le benchmark
interface BenchmarkScore {
  niveau_entreprise: number;
  niveau_fonction: number;
  niveau_thematique: number;
}

interface BenchmarkThematique {
  nom: string;
  score: number;
}

interface BenchmarkData {
  secteur: string;
  fonction: string;
  thematiques: BenchmarkThematique[];
  scores: BenchmarkScore;
}

// Données mockées pour commencer (à remplacer par l'API plus tard)
const mockBenchmarkData: Record<string, BenchmarkData> = {
  "Finance_RH": {
    secteur: "Finance",
    fonction: "Ressources Humaines",
    thematiques: [
      { nom: "Recrutement", score: 3.8 },
      { nom: "Formation", score: 3.5 },
      { nom: "Évaluation", score: 3.2 },
      { nom: "Rémunération", score: 4.0 },
      { nom: "Communication", score: 3.6 }
    ],
    scores: {
      niveau_entreprise: 3.6,
      niveau_fonction: 3.6,
      niveau_thematique: 3.6
    }
  },
  "IT_DevOps": {
    secteur: "Technologie",
    fonction: "DevOps",
    thematiques: [
      { nom: "CI/CD", score: 4.2 },
      { nom: "Monitoring", score: 3.9 },
      { nom: "Security", score: 3.7 },
      { nom: "Infrastructure", score: 4.1 },
      { nom: "Collaboration", score: 3.8 }
    ],
    scores: {
      niveau_entreprise: 3.9,
      niveau_fonction: 3.9,
      niveau_thematique: 3.9
    }
  }
};

// Helper function améliorée pour gérer les scores
const formatScore = (score: string | number | undefined | null): string => {
  if (score === undefined || score === null || score === '') return 'N/A';
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  return isNaN(numScore) ? 'N/A' : numScore.toFixed(1);
};

// Helper function pour s'assurer qu'un score est un nombre valide
const ensureValidScore = (score: any): number => {
  if (typeof score === 'number' && !isNaN(score)) return score;
  if (typeof score === 'string') {
    const parsed = parseFloat(score);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Fonction pour obtenir les données benchmark (mockées pour l'instant)
const getBenchmarkData = (secteur: string, fonction: string): BenchmarkThematique[] => {
  const key = `${secteur}_${fonction.replace(/\s+/g, '')}`;
  const benchmarkData = mockBenchmarkData[key];
  
  if (benchmarkData) {
    return benchmarkData.thematiques;
  }
  
  // Données par défaut si pas de correspondance exacte
  return [
    { nom: "Thématique 1", score: 3.5 },
    { nom: "Thématique 2", score: 3.2 },
    { nom: "Thématique 3", score: 3.8 },
    { nom: "Thématique 4", score: 3.6 },
    { nom: "Thématique 5", score: 3.4 }
  ];
};

// Derive global level and recommendations from score_global
const deriveGlobalLevelAndRecommendations = (scoreGlobal: number): { niveau_global: string; recommandations_globales: string } => {
  if (scoreGlobal >= 4.5) {
    return {
      niveau_global: 'Niveau 5 - Optimisé',
      recommandations_globales: 'Maintenir l\'excellence par l\'innovation continue et le partage des bonnes pratiques.'
    };
  } else if (scoreGlobal >= 3.5) {
    return {
      niveau_global: 'Niveau 4 - Géré',
      recommandations_globales: 'Perfectionner les processus existants et développer des capacités prédictives.'
    };
  } else if (scoreGlobal >= 2.5) {
    return {
      niveau_global: 'Niveau 3 - Mesuré',
      recommandations_globales: 'Renforcer la culture d\'amélioration continue et automatiser davantage les processus.'
    };
  } else if (scoreGlobal >= 1.5) {
    return {
      niveau_global: 'Niveau 2 - Défini',
      recommandations_globales: 'Standardiser les pratiques et formaliser les processus dans toute l\'organisation.'
    };
  } else {
    return {
      niveau_global: 'Niveau 1 - Initial',
      recommandations_globales: 'Initier une démarche d\'amélioration structurée et identifier les processus critiques.'
    };
  }
};

const AnalysesFonctions: React.FC = () => {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('');
  const [selectedFonction, setSelectedFonction] = useState<string>('');
  const [entrepriseDetails, setEntrepriseDetails] = useState<Entreprise | null>(null);
  const [fonctionDetails, setFonctionDetails] = useState<Fonction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    loadEntreprises();
  }, []);

  useEffect(() => {
    console.log('Selected entreprise changed:', selectedEntreprise); // Debug log
    if (selectedEntreprise) {
      loadEntrepriseDetails(selectedEntreprise);
    } else {
      setEntrepriseDetails(null);
      setFonctionDetails(null);
    }
  }, [selectedEntreprise]);

  useEffect(() => {
    if (entrepriseDetails && selectedFonction) {
      const fonction = entrepriseDetails.fonctions.find(f => f.id === selectedFonction);
      if (fonction) {
        setFonctionDetails(fonction);
      }
    }
  }, [selectedFonction, entrepriseDetails]);

  const loadEntreprises = async () => {
    try {
      const response = await api.get('entreprises');
      console.log('Response from entreprises API:', response); // Debug log
      
      // Normaliser la réponse selon le format observé dans les autres fichiers
      let entreprisesData: any[] = [];
      if (Array.isArray(response)) {
        entreprisesData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        entreprisesData = response.data;
      } else {
        console.warn('Format de réponse inattendu pour entreprises:', response);
        setError("Format de données invalide reçu du serveur.");
        return;
      }

      // Transformer les données d'entreprises au format attendu
      const formattedEntreprises = entreprisesData.map(ent => ({
        id_entreprise: ent.id_entreprise,
        nom_entreprise: ent.nom_entreprise || ent.nom || 'Entreprise inconnue',
        secteur: ent.secteur || 'Non défini',
        score_global: '0',
        niveau_global: 'Non évalué',
        recommandations_globales: 'Aucune évaluation disponible',
        fonctions: []
      }));

      console.log('Formatted entreprises:', formattedEntreprises); // Debug log
      setEntreprises(formattedEntreprises);
      
      if (formattedEntreprises.length > 0) {
        setSelectedEntreprise(formattedEntreprises[0].id_entreprise);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erreur lors du chargement des entreprises:', err.message);
      setError("Impossible de charger la liste des entreprises.");
    } finally {
      setLoading(false);
    }
  };

  const loadEntrepriseDetails = async (entrepriseId: string) => {
    try {
      setLoading(true);
      console.log('Loading details for enterprise:', entrepriseId); // Debug log
      
      // Récupérer les détails de l'entreprise et ses fonctions depuis le bon endpoint
      const [entrepriseResponse, fonctionsResponse] = await Promise.all([
        api.get(`entreprises/${entrepriseId}`),
        api.get(`entreprises/${entrepriseId}/fonctions`)
      ]);
      
      console.log('Enterprise response:', entrepriseResponse); // Debug log
      console.log('Functions response:', fonctionsResponse); // Debug log
      
      // Normaliser la réponse entreprise
      let entrepriseData: any = {};
      if (entrepriseResponse && entrepriseResponse.data) {
        entrepriseData = entrepriseResponse.data;
      } else if (entrepriseResponse) {
        entrepriseData = entrepriseResponse;
      }
      
      // Normaliser la réponse fonctions
      let fonctionsData: any = {};
      if (fonctionsResponse && fonctionsResponse.data) {
        fonctionsData = fonctionsResponse.data;
      } else if (fonctionsResponse) {
        fonctionsData = fonctionsResponse;
      }
      
      // Construire l'objet entreprise details
      const scoreGlobal = ensureValidScore(fonctionsData.score_global || 0);
      const derivedData = deriveGlobalLevelAndRecommendations(scoreGlobal);
      
      const entrepriseDetails: Entreprise = {
        id_entreprise: entrepriseId,
        nom_entreprise: entrepriseData.nom_entreprise || fonctionsData.entreprise || "Entreprise inconnue",
        secteur: entrepriseData.secteur || "Non défini",
        score_global: String(scoreGlobal),
        niveau_global: fonctionsData.niveau_global || derivedData.niveau_global,
        recommandations_globales: fonctionsData.recommandations_globales || derivedData.recommandations_globales,
        fonctions: Array.isArray(fonctionsData.fonctions) ? fonctionsData.fonctions : []
      };
      
      console.log('Final entreprise details:', entrepriseDetails); // Debug log
      setEntrepriseDetails(entrepriseDetails);
      
      // Auto-select first function if available
      if (entrepriseDetails.fonctions.length > 0) {
        setSelectedFonction(entrepriseDetails.fonctions[0].id);
      } else {
        setSelectedFonction('');
        setFonctionDetails(null);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erreur lors du chargement des détails de l\'entreprise:', err.message);
      setError("Impossible de charger les détails de l'entreprise.");
    } finally {
      setLoading(false);
    }
  };

  // Convert thematiques to radar chart data with benchmark
  const convertToRadarData = (
    thematiques: Thematique[] = [], 
    secteur: string = "Finance", 
    fonctionName: string = "RH"
  ) => {
    console.log('Converting radar data:', { thematiques, secteur, fonctionName }); // Debug log
    
    if (!Array.isArray(thematiques) || thematiques.length === 0) {
      console.warn('No thematiques data available for radar chart');
      return [];
    }

    // Obtenir les données benchmark
    const benchmarkData = getBenchmarkData(secteur, fonctionName);
    console.log('Benchmark data:', benchmarkData); // Debug log
    
    const radarData = thematiques.map((theme) => {
      const score = ensureValidScore(theme.score || theme.score_moyen);
      
      // Trouver le score benchmark correspondant
      const benchmarkScore = benchmarkData.find(b => 
        b.nom.toLowerCase().includes(theme.nom.toLowerCase()) || 
        theme.nom.toLowerCase().includes(b.nom.toLowerCase())
      )?.score || 3.5; // Score par défaut si pas de correspondance
      
      return {
        thematique: theme.nom || 'Thématique inconnue',
        score: score,
        benchmark: benchmarkScore,
        fullMark: 5,
      };
    }).filter(item => item.score > 0);
    
    console.log('Final radar data:', radarData); // Debug log
    return radarData;
  };

  // Handle enterprise selection
  const handleEntrepriseChange = (event: any) => {
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des données d'analyse...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <br />
          <Typography variant="caption">
            Vérifiez que l'entreprise sélectionnée possède des analyses de maturité.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Enterprise selection */}
        <Grid size={{ xs: 12 }}>
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
                {entreprises && entreprises.length > 0 ? (
                  entreprises.map((entreprise, index) => (
                    <MenuItem key={`${entreprise.id_entreprise}-${index}`} value={entreprise.id_entreprise}>
                      {entreprise.nom_entreprise}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="">
                    <em>Aucune entreprise disponible</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Debug: {entreprises.length} entreprises chargées | 
                Sélectionnée: {selectedEntreprise || 'Aucune'}
              </Alert>
            )}

            {entrepriseDetails && (
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={`Entreprise: ${entrepriseDetails.nom_entreprise}`}
                  subheader={`Secteur: ${entrepriseDetails.secteur || 'Non défini'}`}
                  action={
                    <Chip
                      label={`Score Global: ${formatScore(entrepriseDetails.score_global)}`}
                      color={getNiveauColor(entrepriseDetails.niveau_global || '')}
                    />
                  }
                />
                <CardContent>
                  <Typography variant="body2">
                    <strong>Niveau:</strong> {entrepriseDetails.niveau_global || 'Non défini'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Recommandations:</strong> {entrepriseDetails.recommandations_globales || 'Aucune recommandation disponible'}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Paper>
        </Grid>

        {/* Function list */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title="Fonctions Analysées" />
            <CardContent sx={{ p: 0 }}>
              {entrepriseDetails?.fonctions && entrepriseDetails.fonctions.length > 0 ? (
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
        <Grid size={{ xs: 12, md: 8 }}>
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

                {/* Overview tab avec graphique RADAR corrigé */}
                {tabValue === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Score par Thématique vs Benchmark Marché
                    </Typography>

                    {fonctionDetails.thematiques && fonctionDetails.thematiques.length > 0 ? (
                      <>
                        <Box sx={{ width: '100%', height: 400 }}>
                          <ResponsiveContainer width="100%" height={350}>
                            <RadarChart
                              outerRadius={140}
                              width={500}
                              height={350}
                              data={convertToRadarData(
                                fonctionDetails.thematiques, 
                                entrepriseDetails?.secteur || "Finance", 
                                fonctionDetails.nom
                              )}
                            >
                              <PolarGrid />
                              <PolarAngleAxis dataKey="thematique" />
                              <PolarRadiusAxis angle={30} domain={[0, 5]} />
                              
                              {/* Représentation des scores actuels (bleu) */}
                              <Radar
                                name="Score Actuel"
                                dataKey="score"
                                stroke="#0B4E87"
                                fill="#0B4E87"
                                fillOpacity={0.6}
                              />
                              
                              {/* Représentation benchmark (vert avec trait interrompu) */}
                              <Radar
                                name="Benchmark IA"
                                dataKey="benchmark"
                                stroke="#4CAF50"
                                fill="#4CAF50"
                                fillOpacity={0.3}
                                strokeDasharray="5 5"
                                strokeWidth={2}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                          
                          {/* Légende séparée avec espacement contrôlé */}
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: 3, 
                            mt: '10px',
                            alignItems: 'center' 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                backgroundColor: '#0B4E87', 
                                opacity: 0.6,
                                borderRadius: 1 
                              }} />
                              <Typography variant="body2">Score Actuel</Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                backgroundColor: '#4CAF50', 
                                opacity: 0.3,
                                border: '2px dashed #4CAF50',
                                borderRadius: 1 
                              }} />
                              <Typography variant="body2">Benchmark IA</Typography>
                            </Box>
                          </Box>
                        </Box>
                        
                        {/* Détails des thématiques */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Détail des scores par thématique:
                          </Typography>
                          <List>
                            {fonctionDetails.thematiques.map((theme, index) => (
                              <ListItem key={index}>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="body1">{theme.nom}</Typography>
                                      <Chip
                                        label={formatScore(theme.score)}
                                        color={getNiveauColor(theme.niveau || '')}
                                        size="small"
                                      />
                                    </Box>
                                  }
                                  secondary={theme.niveau}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      </>
                    ) : (
                      <Alert severity="info">
                        Aucune donnée de thématique disponible pour cette fonction.
                        <br />
                        <Typography variant="caption">
                          Vérifiez que des formulaires ont été soumis et analysés pour cette fonction.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Recommandations Qwanza tab */}
                {tabValue === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Recommandations Qwanza
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      <strong>Recommandations générales pour la fonction:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {fonctionDetails.recommandations || 'Aucune recommandation spécifique disponible pour cette fonction.'}
                    </Typography>

                    {fonctionDetails.thematiques && fonctionDetails.thematiques.length > 0 ? (
                      <List>
                        {fonctionDetails.thematiques.map((theme, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle1" fontWeight="bold">{theme.nom}</Typography>
                                    <Chip
                                      label={formatScore(theme.score)}
                                      color={getNiveauColor(theme.niveau || '')}
                                      size="small"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    {theme.recommandations || 'Aucune recommandation spécifique pour cette thématique.'}
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

                {/* LLM Recommendations tab */}
                {tabValue === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Recommandations LLM Publics
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Cette fonctionnalité sera bientôt disponible. Elle fournira des recommandations générées par des modèles de langage publics.
                    </Alert>
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