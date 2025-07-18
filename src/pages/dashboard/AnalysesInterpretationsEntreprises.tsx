// src/pages/AnalyseInterpretationsEntreprises.tsx
import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, Card, CardContent, 
  CircularProgress, Alert, Button, Chip, Divider, 
  LinearProgress, IconButton, Tooltip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Business, TrendingUp, Assessment, Info, Refresh,
  Download, Timeline, Category, EmojiEvents, GpsFixed,
  Lightbulb, Security, Computer, Storage, Code
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Legend, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line, Area, AreaChart
} from 'recharts';

interface EntrepriseData {
  id_entreprise: string;
  nom_entreprise: string;
  secteur: string;
  taille_entreprise: string;
  vision_transformation_numerique?: string;
  score_global_moyen?: number;
  nombre_evaluations?: number;
  derniere_evaluation?: string;
}

interface FonctionScore {
  fonction: string;
  code_fonction: string;
  label: string;
  score_moyen: number;
  score_cible: number;
  ecart: number;
  niveau: string;
  couleur: string;
  icon: any;
  motivation?: {
    motivation: string;
    but: string;
    objectif: string;
    mesure: string;
  };
}

interface BenchmarkData {
  fonction: string;
  score_entreprise: number;
  score_secteur: number;
  score_top_performers: number;
}

interface MotivationAnalyse {
  fonction: string;
  alignement_score: number;
  recommandations: string[];
  kpis_suggeres: string[];
}

const AnalyseInterpretationsEntreprises: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState<EntrepriseData | null>(null);
  const [fonctionsScores, setFonctionsScores] = useState<FonctionScore[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [motivationAnalyses, setMotivationAnalyses] = useState<MotivationAnalyse[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [showMotivationDialog, setShowMotivationDialog] = useState(false);
  const [selectedFonction, setSelectedFonction] = useState<FonctionScore | null>(null);

  const fonctionIcons = {
    cybersecurite: Security,
    maturite_digitale: Computer,
    gouvernance_donnees: Storage,
    devsecops: Code,
    innovation_numerique: Lightbulb
  };

  useEffect(() => {
    if (user?.id_entreprise) {
      loadEntrepriseData();
    }
  }, [user]);

  const loadEntrepriseData = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('🏢 Début chargement données entreprise:', user!.id_entreprise);

    // ✅ UN SEUL APPEL API - tout est dans entreprise-global !
    const [entrepriseResp, motivationsResp] = await Promise.all([
      api.get(`/entreprise-global/${user!.id_entreprise}`),
      api.get(`/benchmark/motivations/${user!.id_entreprise}`) // Garder celui-ci s'il fonctionne
    ]);

    console.log('🔍 DEBUG Structure complète:', entrepriseResp);
    console.log('🔍 DEBUG Clés:', Object.keys(entrepriseResp || {}));

    // ✅ EXTRACTION des données d'entreprise
    const entrepriseData = entrepriseResp.entreprise;
    if (!entrepriseData) {
      throw new Error('Données entreprise non trouvées dans la réponse');
    }
    
    console.log('✅ Entreprise extraite:', entrepriseData);
    setEntreprise(entrepriseData);

    // ✅ EXTRACTION des fonctions - elles sont dans fonctions_analysis !
    let fonctionsData = [];
    
    if (entrepriseResp.fonctions_analysis && Array.isArray(entrepriseResp.fonctions_analysis)) {
      fonctionsData = entrepriseResp.fonctions_analysis;
      console.log('✅ Fonctions extraites de fonctions_analysis:', fonctionsData.length);
    } else {
      console.warn('⚠️ fonctions_analysis non trouvé ou non array:', entrepriseResp.fonctions_analysis);
      fonctionsData = [];
    }

    // ✅ EXTRACTION des motivations
    let motivationsData = {};
    if (motivationsResp && typeof motivationsResp === 'object') {
      if (motivationsResp.motivations) {
        motivationsData = motivationsResp.motivations;
      } else {
        motivationsData = motivationsResp;
      }
    }

    console.log('🎯 Motivations extraites:', Object.keys(motivationsData));

    // ✅ TRAITEMENT des scores avec la structure réelle
    const scores = fonctionsData.map((f: any) => {
      if (!f) {
        console.warn('⚠️ Fonction vide ignorée');
        return null;
      }

      try {
        // Adapter selon la structure réelle de fonctions_analysis
        const codeFonction = f.fonction || f.code_fonction || f.nom;
        const scoreActuel = f.score_actuel || f.score_moyen || f.score || 0;
        const scoreCible = getScoreCible(codeFonction, motivationsData);
        const ecart = scoreActuel - scoreCible;

        return {
          // Adapter les champs selon votre structure réelle
          fonction: f.fonction || codeFonction,
          code_fonction: codeFonction,
          label: f.label || f.nom || f.fonction || 'Fonction inconnue',
          score_moyen: scoreActuel,
          score_cible: scoreCible,
          ecart: ecart,
          niveau: f.niveau || 'Non défini',
          couleur: f.couleur || '#666',
          icon: fonctionIcons[codeFonction as keyof typeof fonctionIcons] || TrendingUp,
          motivation: motivationsData[codeFonction] || null,
          
          // Champs additionnels si disponibles
          score_max: f.score_max || 5,
          recommandations: f.recommandations || '',
          thematiques: f.thematiques || []
        };
      } catch (err) {
        console.error('❌ Erreur traitement fonction:', f, err);
        return null;
      }
    }).filter(Boolean); // Supprimer les éléments null

    console.log('✅ Scores traités:', scores.length, 'fonctions valides');
    console.log('🔍 Premier score pour debug:', scores[0]);
    
    setFonctionsScores(scores);

    // Charger les données de benchmark si secteur disponible
    if (entrepriseData.secteur && scores.length > 0) {
      try {
        await loadBenchmarkData(entrepriseData.secteur, scores);
      } catch (benchError) {
        console.warn('⚠️ Erreur benchmark (non bloquant):', benchError);
      }
    }

    // Analyser l'alignement avec les motivations
    if (scores.length > 0) {
      try {
        analyzeMotivationAlignment(scores, motivationsData);
      } catch (alignError) {
        console.warn('⚠️ Erreur alignement (non bloquant):', alignError);
      }
    }

    console.log('✅ Chargement terminé avec succès');

  } catch (err: any) {
    console.error('❌ Erreur chargement données entreprise:', err);
    console.error('📊 Stack trace:', err.stack);
    
    // Message d'erreur plus descriptif
    let errorMessage = 'Erreur lors du chargement des données';
    if (err.response?.status === 404) {
      errorMessage = 'Entreprise non trouvée';
    } else if (err.response?.status === 403) {
      errorMessage = 'Accès non autorisé';
    } else if (err.message) {
      errorMessage = `Erreur: ${err.message}`;
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};










  const getScoreCible = (codeFonction: string, motivations: any): number => {
    // Déterminer le score cible basé sur l'objectif défini
    const motivation = motivations[codeFonction];
    if (!motivation?.objectif) return 4.0; // Cible par défaut

    // Analyser l'objectif pour déterminer une cible appropriée
    const objectifLower = motivation.objectif.toLowerCase();
    if (objectifLower.includes('excellence') || objectifLower.includes('leader')) {
      return 4.5;
    } else if (objectifLower.includes('amélioration') || objectifLower.includes('optimis')) {
      return 4.0;
    } else if (objectifLower.includes('standard') || objectifLower.includes('conform')) {
      return 3.5;
    }
    return 4.0;
  };

  const loadBenchmarkData = async (secteur: string, fonctions: FonctionScore[]) => {
    try {
      const benchmarks = await Promise.all(
        fonctions.map(async (f) => {
          const resp = await api.post('/benchmark/analyze', {
            secteur,
            fonction: f.label,
            thematiques: ['Global'],
            id_entreprise: user!.id_entreprise
          });

          return {
            fonction: f.label,
            score_entreprise: f.score_moyen,
            score_secteur: resp.thematiques[0]?.score_moyen || 3.0,
            score_top_performers: 4.5
          };
        })
      );

      setBenchmarkData(benchmarks);
    } catch (err) {
      console.error('Erreur chargement benchmark:', err);
    }
  };

  const analyzeMotivationAlignment = (scores: FonctionScore[], motivationData: any) => {
    const analyses = scores.map(score => {
      const motivation = score.motivation;
      const alignement = calculateAlignmentScore(score, motivation);
      
      return {
        fonction: score.label,
        alignement_score: alignement,
        recommandations: generateRecommendations(score, motivation, alignement),
        kpis_suggeres: generateKPIs(motivation)
      };
    });

    setMotivationAnalyses(analyses);
  };

  const calculateAlignmentScore = (score: FonctionScore, motivation: any): number => {
    if (!motivation) return 0;

    let alignmentScore = 0;
    
    // Vérifier si le score actuel progresse vers l'objectif
    const progressVersObjectif = score.score_moyen / score.score_cible;
    alignmentScore += progressVersObjectif * 40;

    // Vérifier si des mesures sont définies
    if (motivation.mesure) alignmentScore += 20;

    // Vérifier la clarté de l'objectif
    if (motivation.objectif && motivation.objectif.length > 50) alignmentScore += 20;

    // Vérifier l'alignement entre motivation et but
    if (motivation.motivation && motivation.but) alignmentScore += 20;

    return Math.min(100, alignmentScore);
  };

  const generateRecommendations = (score: FonctionScore, motivation: any, alignement: number): string[] => {
    const recommendations = [];

    if (alignement < 50) {
      recommendations.push("Redéfinir des objectifs plus clairs et mesurables");
    }

    if (score.ecart < -0.5) {
      recommendations.push(`Intensifier les efforts pour atteindre la cible de ${score.score_cible}`);
    }

    if (!motivation?.mesure) {
      recommendations.push("Définir des KPIs spécifiques pour mesurer les progrès");
    }

    if (score.niveau === 'Initial' || score.niveau === 'Défini') {
      recommendations.push("Mettre en place un plan d'action structuré pour améliorer la maturité");
    }

    return recommendations;
  };

  const generateKPIs = (motivation: any): string[] => {
    if (!motivation?.mesure) return ["Aucun KPI défini"];

    const kpis = [];
    const mesureLower = motivation.mesure.toLowerCase();

    if (mesureLower.includes('taux') || mesureLower.includes('pourcentage')) {
      kpis.push("Taux de progression mensuel");
    }
    if (mesureLower.includes('nombre') || mesureLower.includes('quantité')) {
      kpis.push("Nombre d'initiatives lancées");
    }
    if (mesureLower.includes('délai') || mesureLower.includes('temps')) {
      kpis.push("Temps moyen de mise en œuvre");
    }
    if (mesureLower.includes('satisfaction') || mesureLower.includes('qualité')) {
      kpis.push("Score de satisfaction utilisateur");
    }

    return kpis.length > 0 ? kpis : [motivation.mesure];
  };

  const handleRefresh = () => {
    loadEntrepriseData();
  };

  const handleExport = () => {
    // Logique d'export des données
    console.log('Export des données...');
  };

  const handleShowMotivation = (fonction: FonctionScore) => {
    setSelectedFonction(fonction);
    setShowMotivationDialog(true);
  };

  // Préparer les données pour les graphiques
  const radarData = fonctionsScores.map(f => ({
    fonction: f.label,
    'Score Actuel': f.score_moyen,
    'Score Cible': f.score_cible,
    'Benchmark Secteur': benchmarkData.find(b => b.fonction === f.label)?.score_secteur || 0
  }));

  const barData = fonctionsScores.map(f => ({
    fonction: f.label.substring(0, 15),
    écart: f.ecart,
    color: f.ecart >= 0 ? '#4CAF50' : '#f44336'
  }));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !entreprise) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" onClick={handleRefresh}>
          Réessayer
        </Button>
      }>
        {error || 'Données non disponibles'}
      </Alert>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* En-tête */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              <Business sx={{ mr: 2, verticalAlign: 'middle' }} />
              Analyse de Maturité - {entreprise.nom_entreprise}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Secteur: {entreprise.secteur} | Taille: {entreprise.taille_entreprise}
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Actualiser">
              <IconButton onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exporter">
              <IconButton onClick={handleExport}>
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {entreprise.vision_transformation_numerique && (
          <Alert severity="info" sx={{ mt: 2 }} icon={<GpsFixed />}>
            <Typography variant="subtitle2" fontWeight="bold">
              Vision de transformation :
            </Typography>
            <Typography variant="body2">
              {entreprise.vision_transformation_numerique}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Onglets */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label="Vue d'ensemble" />
          <Tab label="Analyse par fonction" />
          <Tab label="Benchmark sectoriel" />
          <Tab label="Alignement stratégique" />
        </Tabs>
      </Paper>

      {/* Contenu des onglets */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {/* KPIs globaux */}
          <Grid size={12}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography color="text.secondary" gutterBottom>
                          Score Global
                        </Typography>
                        <Typography variant="h4">
                          {entreprise.score_global_moyen?.toFixed(1) || '0.0'}
                        </Typography>
                      </Box>
                      <Assessment fontSize="large" color="primary" />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(entreprise.score_global_moyen || 0) * 20} 
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography color="text.secondary" gutterBottom>
                          Évaluations
                        </Typography>
                        <Typography variant="h4">
                          {entreprise.nombre_evaluations || 0}
                        </Typography>
                      </Box>
                      <Category fontSize="large" color="secondary" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Dernière: {entreprise.derniere_evaluation || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography color="text.secondary" gutterBottom>
                          Progression
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          +12%
                        </Typography>
                      </Box>
                      <TrendingUp fontSize="large" color="success" />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      vs. période précédente
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography color="text.secondary" gutterBottom>
                          Objectif atteint
                        </Typography>
                        <Typography variant="h4">
                          {Math.round(
                            (fonctionsScores.filter(f => f.ecart >= 0).length / 
                            fonctionsScores.length) * 100
                          )}%
                        </Typography>
                      </Box>
                      <EmojiEvents fontSize="large" color="warning" />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      des fonctions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Graphique radar */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Analyse comparative par fonction
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="fonction" />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} />
                  <Radar 
                    name="Score Actuel" 
                    dataKey="Score Actuel" 
                    stroke="#2196F3" 
                    fill="#2196F3" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Score Cible" 
                    dataKey="Score Cible" 
                    stroke="#4CAF50" 
                    fill="#4CAF50" 
                    fillOpacity={0.3} 
                  />
                  <Radar 
                    name="Benchmark Secteur" 
                    dataKey="Benchmark Secteur" 
                    stroke="#FF9800" 
                    fill="#FF9800" 
                    fillOpacity={0.3} 
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Liste des fonctions */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Détail par fonction
              </Typography>
              {fonctionsScores.map((fonction) => (
                <Box key={fonction.code_fonction} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      {React.createElement(fonction.icon, { 
                        sx: { color: fonction.couleur } 
                      })}
                      <Typography variant="body2">{fonction.label}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={fonction.niveau} 
                        size="small" 
                        sx={{ backgroundColor: fonction.couleur, color: 'white' }}
                      />
                      <Tooltip title="Voir la motivation">
                        <IconButton size="small" onClick={() => handleShowMotivation(fonction)}>
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={fonction.score_moyen * 20} 
                    sx={{ 
                      mt: 1,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: fonction.couleur
                      }
                    }}
                  />
                  <Box display="flex" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption">
                      Score: {fonction.score_moyen.toFixed(1)}/5
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color={fonction.ecart >= 0 ? 'success.main' : 'error.main'}
                    >
                      Écart: {fonction.ecart >= 0 ? '+' : ''}{fonction.ecart.toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          {fonctionsScores.map((fonction) => (
            <Grid size={{ xs: 12, md: 6 }} key={fonction.code_fonction}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {React.createElement(fonction.icon, { 
                        sx: { color: fonction.couleur, fontSize: 32 } 
                      })}
                      <Typography variant="h6">{fonction.label}</Typography>
                    </Box>
                    <Chip 
                      label={fonction.niveau} 
                      sx={{ backgroundColor: fonction.couleur, color: 'white' }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="body2" color="text.secondary">
                        Score actuel
                      </Typography>
                      <Typography variant="h4">
                        {fonction.score_moyen.toFixed(1)}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="text.secondary">
                        Objectif
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {fonction.score_cible.toFixed(1)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Progression</Typography>
                      <Typography variant="body2">
                        {Math.round((fonction.score_moyen / fonction.score_cible) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(fonction.score_moyen / fonction.score_cible) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {fonction.motivation && (
                    <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Motivation définie
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>But:</strong> {fonction.motivation.but || 'Non défini'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Mesure:</strong> {fonction.motivation.mesure || 'Non définie'}
                      </Typography>
                    </Box>
                  )}

                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => handleShowMotivation(fonction)}
                  >
                    Voir les détails
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Comparaison avec le secteur {entreprise.secteur}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Période</InputLabel>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    label="Période"
                  >
                    <MenuItem value="3months">3 derniers mois</MenuItem>
                    <MenuItem value="6months">6 derniers mois</MenuItem>
                    <MenuItem value="1year">1 an</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={benchmarkData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fonction" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 5]} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="score_entreprise" name="Votre entreprise" fill="#2196F3" />
                  <Bar dataKey="score_secteur" name="Moyenne secteur" fill="#FF9800" />
                  <Bar dataKey="score_top_performers" name="Top performers" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Analyse comparative
                </Typography>
                <Grid container spacing={2}>
                  {benchmarkData.map((bench) => {
                    const ecartSecteur = bench.score_entreprise - bench.score_secteur;
                    const performance = ecartSecteur > 0 ? 'Supérieur' : 'Inférieur';
                    
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bench.fonction}>
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Typography variant="subtitle2">{bench.fonction}</Typography>
                          <Typography 
                            variant="body2" 
                            color={ecartSecteur > 0 ? 'success.main' : 'error.main'}
                          >
                            {performance} au secteur de {Math.abs(ecartSecteur).toFixed(1)} points
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Paper>
          </Grid>

          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Évolution des scores
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fonction" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="écart" 
                    stroke="#2196F3" 
                    strokeWidth={2}
                    dot={{ fill: '#2196F3' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {selectedTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Alert severity="info" sx={{ mb: 3 }}>
              L'alignement stratégique mesure la cohérence entre vos objectifs définis et vos scores actuels.
            </Alert>
          </Grid>

          {motivationAnalyses.map((analyse, index) => (
            <Grid size={{ xs: 12, md: 6 }} key={index}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{analyse.fonction}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress 
                        variant="determinate" 
                        value={analyse.alignement_score} 
                        size={60}
                        thickness={4}
                        sx={{
                          color: analyse.alignement_score > 70 ? 'success.main' : 
                                 analyse.alignement_score > 40 ? 'warning.main' : 'error.main'
                        }}
                      />
                      <Typography variant="body2">
                        {analyse.alignement_score}%
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Recommandations
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {analyse.recommandations.map((rec, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{rec}</Typography>
                      </li>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    KPIs suggérés
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {analyse.kpis_suggeres.map((kpi, idx) => (
                      <Chip key={idx} label={kpi} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Matrice d'alignement stratégique
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={fonctionsScores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area 
                    type="monotone" 
                    dataKey="score_cible" 
                    stackId="1"
                    stroke="#4CAF50" 
                    fill="#4CAF50" 
                    fillOpacity={0.3}
                    name="Score cible"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score_moyen" 
                    stackId="2"
                    stroke="#2196F3" 
                    fill="#2196F3"
                    fillOpacity={0.6}
                    name="Score actuel"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Dialog Motivation */}
      <Dialog 
        open={showMotivationDialog} 
        onClose={() => setShowMotivationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedFonction && React.createElement(selectedFonction.icon, { 
              sx: { color: selectedFonction.couleur } 
            })}
            Détails de la motivation - {selectedFonction?.label}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFonction?.motivation ? (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Motivation
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedFonction.motivation.motivation || 'Non définie'}
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  But
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedFonction.motivation.but || 'Non défini'}
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Objectif
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedFonction.motivation.objectif || 'Non défini'}
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Mesure
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedFonction.motivation.mesure || 'Non définie'}
                  </Typography>
                </Paper>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Statut actuel
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Score actuel
                    </Typography>
                    <Typography variant="h6">
                      {selectedFonction.score_moyen.toFixed(1)}/5
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Score cible
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {selectedFonction.score_cible.toFixed(1)}/5
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">
              Aucune motivation définie pour cette fonction
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMotivationDialog(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AnalyseInterpretationsEntreprises;