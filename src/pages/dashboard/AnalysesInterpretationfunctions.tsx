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
  secteur?: string;
  score_global: string;
  niveau_global: string;
  recommandations_globales: string;
  fonctions: Fonction[];
}

// Nouveaux types pour l'API Benchmark avec LLMs
interface LLMRecommendation {
  source: 'ChatGPT' | 'Grok' | 'Claude';
  score: number;
  recommandation: string;
  niveau_confiance: number; // 0-100
}

interface BenchmarkThematiqueLLM {
  nom: string;
  score_moyen: number; // Moyenne des 3 LLMs
  recommandations_llm: LLMRecommendation[];
  ecart_type: number; // Variabilité entre les LLMs
}

interface BenchmarkDataLLM {
  secteur: string;
  fonction: string;
  date_analyse: string;
  thematiques: BenchmarkThematiqueLLM[];
  scores: {
    niveau_entreprise: number;
    niveau_fonction: number;
    niveau_thematique: number;
  };
  metadata: {
    version_api: string;
    sources_utilisees: string[];
    fiabilite_globale: number;
  };
}

// Structure de la requête API
interface BenchmarkRequest {
  secteur: string;
  fonction: string;
  thematiques: string[];
}

// Cache pour éviter les appels répétitifs
const benchmarkCache = new Map<string, BenchmarkDataLLM>();

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

// Fonction pour récupérer les données benchmark depuis l'API
const fetchBenchmarkData = async (
  secteur: string, 
  fonction: string, 
  thematiques: string[]
): Promise<BenchmarkDataLLM | null> => {
  const cacheKey = `${secteur}_${fonction}_${thematiques.join('|')}`;
  
  // Vérifier le cache d'abord
  if (benchmarkCache.has(cacheKey)) {
    console.log('Benchmark data retrieved from cache');
    return benchmarkCache.get(cacheKey)!;
  }

  try {
    console.log('Fetching benchmark data from API...', { secteur, fonction, thematiques });
    
    const requestBody: BenchmarkRequest = {
      secteur,
      fonction,
      thematiques
    };

    const response = await api.post('benchmark/analyze', requestBody);
    
    // Normaliser la réponse
    let benchmarkData: BenchmarkDataLLM;
    if (response && response.data) {
      benchmarkData = response.data;
    } else if (response) {
      benchmarkData = response;
    } else {
      throw new Error('Aucune donnée reçue de l\'API benchmark');
    }

    // Mettre en cache
    benchmarkCache.set(cacheKey, benchmarkData);
    
    console.log('Benchmark data retrieved successfully:', benchmarkData);
    return benchmarkData;
    
  } catch (error) {
    console.error('Erreur lors de la récupération des données benchmark:', error);
    
    // Fallback avec données mockées en cas d'erreur
    return generateMockBenchmarkData(secteur, fonction, thematiques);
  }
};

// Données de fallback en cas d'erreur API
const generateMockBenchmarkData = (
  secteur: string, 
  fonction: string, 
  thematiques: string[]
): BenchmarkDataLLM => {
  return {
    secteur,
    fonction,
    date_analyse: new Date().toISOString(),
    thematiques: thematiques.map(theme => ({
      nom: theme,
      score_moyen: 3.0 + Math.random() * 1.5, // Score entre 3.0 et 4.5
      ecart_type: 0.2 + Math.random() * 0.3,
      recommandations_llm: [
        {
          source: 'ChatGPT',
          score: 3.0 + Math.random() * 1.5,
          recommandation: `Recommandation ChatGPT pour ${theme}: Optimiser les processus et améliorer l'efficacité opérationnelle en mettant l'accent sur l'automatisation et la standardisation.`,
          niveau_confiance: 85 + Math.floor(Math.random() * 15)
        },
        {
          source: 'Grok',
          score: 3.0 + Math.random() * 1.5,
          recommandation: `Recommandation Grok pour ${theme}: Implémenter des solutions innovantes et agiles en adoptant une approche disruptive et en exploitant les technologies émergentes.`,
          niveau_confiance: 80 + Math.floor(Math.random() * 20)
        },
        {
          source: 'Claude',
          score: 3.0 + Math.random() * 1.5,
          recommandation: `Recommandation Claude pour ${theme}: Structurer l'approche avec des méthodes éprouvées en privilégiant la qualité, la cohérence et une amélioration progressive.`,
          niveau_confiance: 88 + Math.floor(Math.random() * 12)
        }
      ]
    })),
    scores: {
      niveau_entreprise: 3.5,
      niveau_fonction: 3.6,
      niveau_thematique: 3.4
    },
    metadata: {
      version_api: '1.0.0',
      sources_utilisees: ['ChatGPT-4', 'Grok-2', 'Claude-3.5'],
      fiabilite_globale: 87
    }
  };
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
  
  // Nouveaux états pour l'API Benchmark
  const [benchmarkDataLLM, setBenchmarkDataLLM] = useState<BenchmarkDataLLM | null>(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState<boolean>(false);
  const [radarData, setRadarData] = useState<any[]>([]);

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

  // Appeler convertToRadarData quand les données changent
  useEffect(() => {
    if (fonctionDetails?.thematiques && entrepriseDetails) {
      convertToRadarData(
        fonctionDetails.thematiques,
        entrepriseDetails.secteur || "Finance",
        fonctionDetails.nom
      );
    }
  }, [fonctionDetails, entrepriseDetails]);

  // Fonction pour obtenir les données benchmark depuis l'API
  const getBenchmarkData = async (
    secteur: string, 
    fonction: string, 
    thematiques: Thematique[]
  ): Promise<BenchmarkThematiqueLLM[]> => {
    
    if (!thematiques || thematiques.length === 0) {
      return [];
    }

    try {
      setLoadingBenchmark(true);
      
      const thematiqueNames = thematiques.map(t => t.nom);
      const benchmarkData = await fetchBenchmarkData(secteur, fonction, thematiqueNames);
      
      if (benchmarkData) {
        setBenchmarkDataLLM(benchmarkData);
        return benchmarkData.thematiques;
      }
      
      return [];
      
    } catch (error) {
      console.error('Erreur lors de la récupération du benchmark:', error);
      return [];
    } finally {
      setLoadingBenchmark(false);
    }
  };

  // Fonction utilitaire pour obtenir le score benchmark d'une thématique
  const getBenchmarkScore = (
    themeName: string, 
    benchmarkThematiques: BenchmarkThematiqueLLM[]
  ): number => {
    const benchmark = benchmarkThematiques.find(b => 
      b.nom.toLowerCase().includes(themeName.toLowerCase()) || 
      themeName.toLowerCase().includes(b.nom.toLowerCase())
    );
    
    return benchmark ? benchmark.score_moyen : 3.5; // Score par défaut
  };

  // Convert thematiques to radar chart data with benchmark API
  const convertToRadarData = async (
    thematiques: Thematique[] = [], 
    secteur: string = "Finance", 
    fonctionName: string = "RH"
  ) => {
    console.log('Converting radar data with API benchmark:', { thematiques, secteur, fonctionName });
    
    if (!Array.isArray(thematiques) || thematiques.length === 0) {
      console.warn('No thematiques data available for radar chart');
      setRadarData([]);
      return;
    }

    try {
      // Obtenir les données benchmark depuis l'API
      const benchmarkThematiques = await getBenchmarkData(secteur, fonctionName, thematiques);
      
      const newRadarData = thematiques.map((theme) => {
        const score = ensureValidScore(theme.score || theme.score_moyen);
        
        // Trouver le score benchmark correspondant depuis l'API
        const benchmarkScore = getBenchmarkScore(theme.nom, benchmarkThematiques);
        
        return {
          thematique: theme.nom || 'Thématique inconnue',
          score: score,
          benchmark: benchmarkScore,
          fullMark: 5,
        };
      }).filter(item => item.score > 0);
      
      console.log('Final radar data with API benchmark:', newRadarData);
      setRadarData(newRadarData);
      
    } catch (error) {
      console.error('Erreur lors de la conversion des données radar:', error);
      // Fallback vers données locales en cas d'erreur
      const fallbackData = thematiques.map((theme) => ({
        thematique: theme.nom || 'Thématique inconnue',
        score: ensureValidScore(theme.score || theme.score_moyen),
        benchmark: 3.5,
        fullMark: 5,
      })).filter(item => item.score > 0);
      
      setRadarData(fallbackData);
    }
  };

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
  // const convertToRadarData = (
  //   thematiques: Thematique[] = [], 
  //   secteur: string = "Finance", 
  //   fonctionName: string = "RH"
  // ) => {
  //   console.log('Converting radar data:', { thematiques, secteur, fonctionName }); // Debug log
    
  //   if (!Array.isArray(thematiques) || thematiques.length === 0) {
  //     console.warn('No thematiques data available for radar chart');
  //     return [];
  //   }

  //   // Obtenir les données benchmark
  //   const benchmarkData = getBenchmarkData(secteur, fonctionName);
  //   console.log('Benchmark data:', benchmarkData); // Debug log
    
  //   const radarData = thematiques.map((theme) => {
  //     const score = ensureValidScore(theme.score || theme.score_moyen);
      
  //     // Trouver le score benchmark correspondant
  //     const benchmarkScore = benchmarkData.find(b => 
  //       b.nom.toLowerCase().includes(theme.nom.toLowerCase()) || 
  //       theme.nom.toLowerCase().includes(b.nom.toLowerCase())
  //     )?.score || 3.5; // Score par défaut si pas de correspondance
      
  //     return {
  //       thematique: theme.nom || 'Thématique inconnue',
  //       score: score,
  //       benchmark: benchmarkScore,
  //       fullMark: 5,
  //     };
  //   }).filter(item => item.score > 0);
    
  //   console.log('Final radar data:', radarData); // Debug log
  //   return radarData;
  // };

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
        <Grid item xs={12}>
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
        <Grid item xs={12} md={4}>
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
        <Grid item xs={12} md={8}>
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
                              data={radarData} // Utilise les données de l'état
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
                                name="Benchmark Marché"
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
                              <Typography variant="body2">Benchmark Marché</Typography>
                            </Box>
                            
                            {loadingBenchmark && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                                <CircularProgress size={16} />
                                <Typography variant="caption" color="text.secondary">
                                  Chargement benchmark...
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        
                        {/* Métadonnées benchmark si disponibles */}
                        {benchmarkDataLLM && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Benchmark basé sur :</strong> {benchmarkDataLLM.metadata.sources_utilisees.join(', ')} | 
                              <strong> Fiabilité :</strong> {benchmarkDataLLM.metadata.fiabilite_globale}% | 
                              <strong> Analyse du :</strong> {new Date(benchmarkDataLLM.date_analyse).toLocaleDateString('fr-FR')}
                            </Typography>
                          </Alert>
                        )}
                        
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
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Chip
                                          label={`Actuel: ${formatScore(theme.score)}`}
                                          color={getNiveauColor(theme.niveau || '')}
                                          size="small"
                                        />
                                        {benchmarkDataLLM && (
                                          <Chip
                                            label={`Benchmark: ${getBenchmarkScore(theme.nom, benchmarkDataLLM.thematiques).toFixed(1)}`}
                                            variant="outlined"
                                            color="success"
                                            size="small"
                                          />
                                        )}
                                      </Box>
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
                    
                    {benchmarkDataLLM && benchmarkDataLLM.thematiques.length > 0 ? (
                      <Box>
                        {/* Métadonnées de l'analyse */}
                        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Informations sur l'analyse benchmark
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="body2">
                                  <strong>Sources:</strong> {benchmarkDataLLM.metadata.sources_utilisees.join(', ')}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="body2">
                                  <strong>Fiabilité globale:</strong> {benchmarkDataLLM.metadata.fiabilite_globale}%
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="body2">
                                  <strong>Date d'analyse:</strong> {new Date(benchmarkDataLLM.date_analyse).toLocaleDateString('fr-FR')}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>

                        {/* Recommandations par thématique */}
                        {benchmarkDataLLM.thematiques.map((thematique, index) => (
                          <Card key={index} sx={{ mb: 2 }}>
                            <CardHeader
                              title={thematique.nom}
                              action={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Chip
                                    label={`Score moyen: ${thematique.score_moyen.toFixed(1)}`}
                                    color="primary"
                                    size="small"
                                  />
                                  <Chip
                                    label={`Écart-type: ${thematique.ecart_type.toFixed(2)}`}
                                    variant="outlined"
                                    size="small"
                                  />
                                </Box>
                              }
                            />
                            <CardContent>
                              {/* Recommandations de chaque LLM */}
                              <Grid container spacing={2}>
                                {thematique.recommandations_llm.map((rec, recIndex) => (
                                  <Grid item xs={12} md={4} key={recIndex}>
                                    <Card variant="outlined" sx={{ height: '100%' }}>
                                      <CardHeader
                                        title={rec.source}
                                        avatar={
                                          <Box sx={{ 
                                            width: 32, 
                                            height: 32, 
                                            borderRadius: '50%',
                                            bgcolor: rec.source === 'ChatGPT' ? '#10a37f' : 
                                                     rec.source === 'Grok' ? '#1da1f2' : '#ff6b35',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                          }}>
                                            {rec.source === 'ChatGPT' ? 'GPT' : 
                                             rec.source === 'Grok' ? 'GRK' : 'CLD'}
                                          </Box>
                                        }
                                        action={
                                          <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="body2" fontWeight="bold">
                                              {rec.score.toFixed(1)}/5
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              Confiance: {rec.niveau_confiance}%
                                            </Typography>
                                          </Box>
                                        }
                                        sx={{ pb: 1 }}
                                      />
                                      <CardContent sx={{ pt: 0 }}>
                                        <Typography variant="body2">
                                          {rec.recommandation}
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                ))}
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    ) : (
                      <Box>
                        {loadingBenchmark ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                            <CircularProgress size={24} />
                            <Typography>Chargement des recommandations LLM...</Typography>
                          </Box>
                        ) : (
                          <Alert severity="info">
                            Aucune recommandation LLM disponible pour cette fonction.
                            <br />
                            <Typography variant="caption">
                              Les recommandations seront générées automatiquement lors de la sélection d'une fonction avec des thématiques.
                            </Typography>
                          </Alert>
                        )}
                      </Box>
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