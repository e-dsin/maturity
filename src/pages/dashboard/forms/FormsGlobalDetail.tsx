// src/pages/dashboard/forms/FormsGlobalDetails.tsx - Version corrigée
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Alert,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Breadcrumbs,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon,
  Home as HomeIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Score as ScoreIcon
} from '@mui/icons-material';
import api from '../../../services/api';

// Interfaces
interface Evaluation {
  id_evaluation: string;
  id_entreprise: string;
  nom_entreprise: string;
  id_acteur: string;
  nom_acteur: string;
  email_acteur: string;
  statut: 'EN_COURS' | 'TERMINE' | 'ENVOYE';
  date_debut: string;
  date_soumission?: string;
  date_fin?: string;
  duree_evaluation?: number;
  score_global?: number;
  score_cybersecurite?: number;
  score_maturite_digitale?: number;
  score_gouvernance_donnees?: number;
  score_devsecops?: number;
  score_innovation_numerique?: number;
  niveau_global?: string;
  lien_evaluation?: string;
}

interface Question {
  id_question: string;
  fonction: string;
  numero_question: number;
  texte_question: string;
  description?: string;
  poids: number;
  type_reponse: 'ECHELLE_1_5';
  ordre_affichage: number;
}

interface QuestionsByFunction {
  [fonction: string]: Question[];
}

interface Response {
  id_question: string;
  valeur_reponse: string;
  score_question: number;
  commentaire?: string;
}

// Configuration des fonctions
const functionsConfig = {
  cybersecurite: {
    label: 'Cybersécurité',
    icon: SecurityIcon,
    color: '#d32f2f',
    description: 'Sécurité des systèmes et données'
  },
  maturite_digitale: {
    label: 'Maturité Digitale',
    icon: ComputerIcon,
    color: '#1976d2',
    description: 'Transformation et stratégie digitale'
  },
  gouvernance_donnees: {
    label: 'Gouvernance des Données',
    icon: StorageIcon,
    color: '#388e3c',
    description: 'Gestion et qualité des données'
  },
  devsecops: {
    label: 'DevSecOps',
    icon: CodeIcon,
    color: '#f57c00',
    description: 'Développement et opérations sécurisées'
  },
  innovation_numerique: {
    label: 'Innovation Numérique',
    icon: LightbulbIcon,
    color: '#7b1fa2',
    description: 'Veille et adoption technologique'
  }
};

const scaleOptions = [
  { value: '1', label: '1 - Pas du tout', description: 'Aucune mise en place' },
  { value: '2', label: '2 - Partiellement', description: 'Début de mise en place' },
  { value: '3', label: '3 - Moyennement', description: 'Mise en place partielle' },
  { value: '4', label: '4 - Largement', description: 'Largement mis en place' },
  { value: '5', label: '5 - Entièrement', description: 'Complètement mis en place' }
];

// 🔧 FONCTIONS UTILITAIRES CORRIGÉES
const formatScore = (score: any): string => {
  if (score === null || score === undefined) return 'N/A';
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numScore)) return 'N/A';
  return numScore.toFixed(1);
};

const getNumericScore = (score: any): number => {
  if (score === null || score === undefined) return 0;
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  return isNaN(numScore) ? 0 : numScore;
};

const getScoreColor = (score: any): 'error' | 'warning' | 'info' | 'success' => {
  const numScore = getNumericScore(score);
  if (numScore >= 4) return 'success';
  if (numScore >= 3) return 'info';
  if (numScore >= 2) return 'warning';
  return 'error';
};

const getNiveauFromScore = (score: any): string => {
  const numScore = getNumericScore(score);
  if (numScore >= 4.5) return 'Optimisé';
  if (numScore >= 3.5) return 'Géré';
  if (numScore >= 2.5) return 'Mesuré';
  if (numScore >= 1.5) return 'Défini';
  return 'Initial';
};

const getStatutColor = (statut: string): 'success' | 'warning' | 'info' => {
  switch (statut) {
    case 'TERMINE': return 'success';
    case 'EN_COURS': return 'warning';
    case 'ENVOYE': return 'info';
    default: return 'warning';
  }
};

const getStatutIcon = (statut: string) => {
  switch (statut) {
    case 'TERMINE': return CheckCircleIcon;
    case 'EN_COURS': return WarningIcon;
    case 'ENVOYE': return SendIcon;
    default: return WarningIcon;
  }
};

const FormsGlobalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // États
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Données
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [questionsByFunction, setQuestionsByFunction] = useState<QuestionsByFunction>({});
  const [responses, setResponses] = useState<Record<string, Response>>({});

  // UI
  const [isEditing, setIsEditing] = useState(false);
  const [expandedFunction, setExpandedFunction] = useState<string | false>('cybersecurite');

  // Dialog de confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'save' | 'submit' | null;
  }>({ open: false, action: null });

  // Chargement initial
  useEffect(() => {
    if (id) {
      loadEvaluationData();
    } else {
      // Mode création avec paramètres URL
      const id_entreprise = searchParams.get('id_entreprise');
      const id_acteur = searchParams.get('id_acteur');
      if (id_entreprise && id_acteur) {
        createNewEvaluation(id_entreprise, id_acteur);
      } else {
        setError('Paramètres manquants pour créer l\'évaluation');
        setLoading(false);
      }
    }
  }, [id, searchParams]);

  // 🔧 FONCTION LOADEEVALUATION DATA CORRIGÉE
  const loadEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Chargement évaluation:', id);

      // Charger l'évaluation
      const evalResponse = await api.get(`maturity-global/evaluations/${id}`);
      console.log('📋 Réponse API évaluation:', evalResponse);
      
      const evaluationData = evalResponse.data || evalResponse;
      
      // ✅ CORRECTION : Normaliser et mapper correctement les données
      const normalizedEvaluation: Evaluation = {
        id_evaluation: evaluationData.id_evaluation || id,
        id_entreprise: evaluationData.id_entreprise || '',
        nom_entreprise: evaluationData.nom_entreprise || evaluationData.entreprise_nom || 'Entreprise inconnue',
        id_acteur: evaluationData.id_acteur || '',
        nom_acteur: evaluationData.nom_acteur || evaluationData.evaluateur_nom || evaluationData.acteur_nom || 'Acteur inconnu',
        email_acteur: evaluationData.email_acteur || evaluationData.evaluateur_email || evaluationData.acteur_email || '',
        statut: evaluationData.statut || 'EN_COURS',
        date_debut: evaluationData.date_debut || evaluationData.date_creation || new Date().toISOString(),
        date_soumission: evaluationData.date_soumission,
        date_fin: evaluationData.date_fin,
        duree_evaluation: evaluationData.duree_evaluation,
        score_global: getNumericScore(evaluationData.score_global),
        score_cybersecurite: getNumericScore(evaluationData.score_cybersecurite),
        score_maturite_digitale: getNumericScore(evaluationData.score_maturite_digitale),
        score_gouvernance_donnees: getNumericScore(evaluationData.score_gouvernance_donnees),
        score_devsecops: getNumericScore(evaluationData.score_devsecops),
        score_innovation_numerique: getNumericScore(evaluationData.score_innovation_numerique),
        niveau_global: evaluationData.niveau_global || getNiveauFromScore(evaluationData.score_global),
        lien_evaluation: evaluationData.lien_evaluation
      };
      
      console.log('✅ Évaluation normalisée:', normalizedEvaluation);
      setEvaluation(normalizedEvaluation);

      // Charger les questions
      await loadQuestions();

      // Charger les réponses si l'évaluation est terminée ou en cours
      if (normalizedEvaluation.statut === 'TERMINE' || normalizedEvaluation.statut === 'EN_COURS') {
        await loadResponses(id);
      }

    } catch (error: any) {
      console.error('❌ Erreur chargement évaluation:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement de l\'évaluation');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const questionsResponse = await api.get('maturity-global/questions');
      let questionsApiData = questionsResponse.data || questionsResponse;
      
      console.log('🔍 Structure API questions reçue:', questionsApiData);
      
      let questionsArray: Question[] = [];
      
      if (questionsApiData && typeof questionsApiData === 'object') {
        if (questionsApiData.questions && typeof questionsApiData.questions === 'object') {
          console.log('📋 Format détecté: questions organisées par fonction dans un objet');
          
          const questionsObject = questionsApiData.questions;
          
          Object.keys(questionsObject).forEach(functionKey => {
            console.log(`🔍 Traitement fonction: ${functionKey}`);
            const functionQuestions = questionsObject[functionKey];
            
            if (Array.isArray(functionQuestions)) {
              console.log(`✅ ${functionQuestions.length} questions trouvées pour ${functionKey}`);
              questionsArray.push(...functionQuestions);
            } else if (typeof functionQuestions === 'object' && functionQuestions !== null) {
              Object.values(functionQuestions).forEach((question: any) => {
                if (question && typeof question === 'object' && question.id_question) {
                  questionsArray.push(question);
                }
              });
            }
          });
        } else if (questionsApiData.questions && Array.isArray(questionsApiData.questions)) {
          questionsArray = questionsApiData.questions;
        } else if (questionsApiData.data && Array.isArray(questionsApiData.data)) {
          questionsArray = questionsApiData.data;
        } else if (Array.isArray(questionsApiData)) {
          questionsArray = questionsApiData;
        } else {
          console.log('🔍 Recherche de questions dans toutes les propriétés...');
          Object.values(questionsApiData).forEach((value: any) => {
            if (Array.isArray(value) && value.length > 0 && value[0]?.id_question) {
              console.log(`✅ Tableau de questions trouvé: ${value.length} questions`);
              questionsArray.push(...value);
            }
          });
        }
      }
      
      console.log('📊 Total questions extraites:', questionsArray.length);
      
      if (!questionsArray || questionsArray.length === 0) {
        console.error('❌ Aucune question trouvée dans:', questionsApiData);
        throw new Error('Aucune question trouvée dans les données de l\'API');
      }
      
      const validQuestions = questionsArray.filter((question: any) => {
        return question && 
               typeof question === 'object' && 
               question.id_question && 
               question.fonction && 
               question.texte_question;
      });
      
      console.log('✅ Questions valides:', validQuestions.length, 'sur', questionsArray.length);
      
      const grouped: QuestionsByFunction = {};
      validQuestions.forEach((question: Question) => {
        if (!grouped[question.fonction]) {
          grouped[question.fonction] = [];
        }
        grouped[question.fonction].push(question);
      });

      console.log('🎯 Questions groupées par fonction:', Object.keys(grouped).map(f => `${f}: ${grouped[f].length}`));

      Object.keys(grouped).forEach(fonction => {
        grouped[fonction].sort((a, b) => (a.ordre_affichage || 0) - (b.ordre_affichage || 0));
      });

      setQuestionsByFunction(grouped);

    } catch (error: any) {
      console.error('❌ Erreur chargement questions:', error);
      setError('Erreur lors du chargement des questions');
    }
  };

  const loadResponses = async (evaluationId: string) => {
  try {
    console.log('🔍 Chargement réponses pour évaluation:', evaluationId);
    const responsesResponse = await api.get(`maturity-evaluation/${evaluationId}/responses`);
    const responsesData = Array.isArray(responsesResponse.data) ? responsesResponse.data : [];

    console.log('📋 Réponses reçues (brut):', responsesData);

    if (responsesData.length === 0) {
      console.warn('⚠️ Aucune réponse trouvée pour cette évaluation:', evaluationId);
      setError('Aucune réponse trouvée pour cette évaluation.');
      setResponses({});
      return;
    }

    const responsesMap: Record<string, Response> = {};
    responsesData.forEach((response: any) => {
      if (response.id_question && response.valeur_reponse !== undefined) {
        responsesMap[response.id_question] = {
          id_question: response.id_question,
          valeur_reponse: response.valeur_reponse.toString(), // For RadioGroup
          score_question: parseFloat(response.score_normalise) || (parseInt(response.valeur_reponse, 10) / 5) * 100,
          commentaire: response.commentaire || '',
          fonction_nom: response.fonction_nom || '', // Include function name for display
        };
      }
    });

    console.log('✅ Réponses chargées:', Object.keys(responsesMap).length, responsesMap);
    setResponses(responsesMap);

    if (Object.keys(responsesMap).length === 0) {
      console.warn('⚠️ Aucune réponse valide trouvée pour cette évaluation.');
      setError('Aucune réponse valide trouvée pour cette évaluation.');
    }
  } catch (error: any) {
    console.error('❌ Erreur chargement réponses:', error);
    setError('Erreur lors du chargement des réponses: ' + (error.response?.data?.message || error.message));
    setResponses({});
  }
};

  const createNewEvaluation = async (id_entreprise: string, id_acteur: string) => {
    try {
      setLoading(true);
      const response = await api.post('maturity-evaluation/start', {
        id_entreprise,
        id_acteur
      });

      const newId = response.data?.id_evaluation || response.id_evaluation;
      navigate(`/forms/maturity/${newId}/details`, { replace: true });
    } catch (error: any) {
      console.error('Erreur création évaluation:', error);
      setError('Erreur lors de la création de l\'évaluation');
      setLoading(false);
    }
  };

  // Gestion des réponses
  const handleResponseChange = (questionId: string, value: string) => {
    const score = parseInt(value);
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        id_question: questionId,
        valeur_reponse: value,
        score_question: score,
        commentaire: prev[questionId]?.commentaire || ''
      }
    }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        commentaire: comment
      }
    }));
  };

  // Actions
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await api.post(`maturity-evaluation/${id}/responses-batch`, {
      responses: Object.values(responses)
      });

      setSuccess('Réponses sauvegardées avec succès');
      setTimeout(() => setSuccess(null), 3000);

    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      // Calculer les scores
      const scores = calculateScores();

      // Soumettre l'évaluation
      await api.post(`maturity-evaluation/${id}/submit`, {
        scores,
        duree_minutes: 45
      });

      // Recharger l'évaluation
      await loadEvaluationData();
      setIsEditing(false);
      setSuccess('Évaluation soumise avec succès');

    } catch (error: any) {
      console.error('Erreur soumission:', error);
      setError('Erreur lors de la soumission');
    } finally {
      setSaving(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const calculateScores = () => {
  const scores: Record<string, number> = {};
  
  Object.keys(functionsConfig).forEach(fonction => {
    const questions = questionsByFunction[fonction] || [];
    const functionResponses = questions.map(q => responses[q.id_question]).filter(r => r && r.score_question > 0);
    
    scores[fonction] = functionResponses.length > 0
      ? functionResponses.reduce((sum, r) => sum + (r.score_question || 0), 0) / functionResponses.length
      : 0;
  });

  const validScores = Object.values(scores).filter(s => s > 0);
  scores.score_global = validScores.length > 0 
    ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length 
    : 0;

  // Normaliser les scores pour éviter null/undefined
  const safeScores = {
    score_global: parseFloat(scores.score_global.toFixed(2)) || 0,
    cybersecurite: parseFloat(scores.cybersecurite.toFixed(2)) || 0,
    maturite_digitale: parseFloat(scores.maturite_digitale.toFixed(2)) || 0,
    gouvernance_donnees: parseFloat(scores.gouvernance_donnees.toFixed(2)) || 0,
    devsecops: parseFloat(scores.devsecops.toFixed(2)) || 0,
    innovation_numerique: parseFloat(scores.innovation_numerique.toFixed(2)) || 0,
  };

  console.log('📊 Scores calculés:', safeScores);
  return safeScores;
};

  // Calculs
  const getProgress = useMemo(() => {
    const totalQuestions = Object.values(questionsByFunction).flat().length;
    const answeredQuestions = Object.keys(responses).length;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  }, [questionsByFunction, responses]);

  const getFunctionProgress = (fonction: string) => {
    const questions = questionsByFunction[fonction] || [];
    const answered = questions.filter(q => responses[q.id_question]?.valeur_reponse).length;
    return questions.length > 0 ? (answered / questions.length) * 100 : 0;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Chargement de l'évaluation...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error && !evaluation) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            <RefreshIcon sx={{ mr: 1 }} />
            Recharger
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link color="inherit" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Link color="inherit" onClick={() => navigate('/forms')} sx={{ cursor: 'pointer' }}>
          Formulaires
        </Link>
        <Typography color="text.primary">Détails évaluation</Typography>
      </Breadcrumbs>

      {/* Alertes */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {evaluation && (
        <>
          {/* 🔧 EN-TÊTE CORRIGÉ AVEC TOUTES LES INFORMATIONS */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <IconButton onClick={() => navigate('/forms')} sx={{ mr: 2 }}>
                  <ArrowBackIcon />
                </IconButton>
                <AssessmentIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" component="h1">
                    Évaluation de Maturité Globale
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* Informations entreprise */}
                    <Box display="flex" alignItems="center">
                      <BusinessIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        <strong>Entreprise:</strong> {evaluation.nom_entreprise}
                      </Typography>
                    </Box>
                    {/* Informations acteur */}
                    <Box display="flex" alignItems="center">
                      <PersonIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        <strong>Évaluateur:</strong> {evaluation.nom_acteur}
                        {evaluation.email_acteur && ` (${evaluation.email_acteur})`}
                      </Typography>
                    </Box>
                    {/* Score global si disponible */}
                    {evaluation.score_global > 0 && (
                      <Box display="flex" alignItems="center">
                        <ScoreIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="subtitle1" color="text.secondary">
                          <strong>Score global:</strong> {formatScore(evaluation.score_global)}/5 
                          ({evaluation.niveau_global})
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                {/* Statut */}
                <Chip 
                  label={evaluation.statut} 
                  color={getStatutColor(evaluation.statut)}
                  icon={React.createElement(getStatutIcon(evaluation.statut))}
                  sx={{ fontSize: '0.875rem' }}
                />
                {/* Date */}
                <Typography variant="caption" color="text.secondary">
                  {evaluation.date_soumission ? 
                    `Terminé le: ${new Date(evaluation.date_soumission).toLocaleDateString('fr-FR')}` :
                    `Débuté le: ${new Date(evaluation.date_debut).toLocaleDateString('fr-FR')}`
                  }
                </Typography>
              </Box>
            </Box>

            {/* Barre de progression pour les évaluations en cours */}
            {evaluation.statut === 'EN_COURS' && (
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progression globale
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    {Math.round(getProgress)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getProgress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </Paper>

          {/* Score global pour les évaluations terminées */}
          {evaluation.statut === 'TERMINE' && evaluation.score_global > 0 && (
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'primary.50' }}>
              <Typography variant="h5" gutterBottom color="primary.main">
                Résultat de l'Évaluation
              </Typography>
              <Typography variant="h2" color="primary.main" gutterBottom fontWeight="bold">
                {formatScore(evaluation.score_global)}/5
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Niveau: {evaluation.niveau_global}
              </Typography>
              {evaluation.duree_evaluation && (
                <Typography variant="body2" color="text.secondary">
                  Durée de l'évaluation: {evaluation.duree_evaluation} minutes
                </Typography>
              )}
            </Paper>
          )}

          {/* Scores par fonction pour les évaluations terminées */}
          {evaluation.statut === 'TERMINE' && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {Object.entries(functionsConfig).map(([key, config]) => {
                const score = evaluation[`score_${key}` as keyof Evaluation] as number;
                return (
                  <Grid item xs={12} sm={6} md={2.4} key={key}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <config.icon sx={{ fontSize: 40, color: config.color, mb: 1 }} />
                        <Typography variant="subtitle2" gutterBottom sx={{ minHeight: 40 }}>
                          {config.label}
                        </Typography>
                        <Typography variant="h6" color={getScoreColor(score)}>
                          {formatScore(score)}/5
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getNiveauFromScore(score)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* 🔧 ACTIONS CORRIGÉES */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {evaluation.statut === 'EN_COURS' && (
              <>
                <Button
                  variant={isEditing ? "outlined" : "contained"}
                  onClick={() => setIsEditing(!isEditing)}
                  startIcon={<EditIcon />}
                  color={isEditing ? "inherit" : "primary"}
                >
                  {isEditing ? 'Annuler l\'édition' : 'Modifier les réponses'}
                </Button>
                
                {isEditing && (
                  <>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => setConfirmDialog({ open: true, action: 'save' })}
                      startIcon={<SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={20} /> : 'Sauvegarder'}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => setConfirmDialog({ open: true, action: 'submit' })}
                      startIcon={<SendIcon />}
                      disabled={saving || Object.keys(responses).length === 0}
                    >
                      {saving ? <CircularProgress size={20} /> : 'Soumettre définitivement'}
                    </Button>
                  </>
                )}
              </>
            )}
            
            {evaluation.statut === 'TERMINE' && (
              <Alert severity="success" sx={{ flexGrow: 1 }}>
                <Typography variant="body2">
                  ✅ Cette évaluation a été terminée et soumise avec succès. 
                  Les résultats sont disponibles ci-dessus.
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Questions par fonction */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Questions d'évaluation par fonction
            </Typography>
            
            {Object.entries(functionsConfig).map(([functionKey, config]) => {
              const questions = questionsByFunction[functionKey] || [];
              const progress = getFunctionProgress(functionKey);
              
              return (
                <Accordion
                  key={functionKey}
                  expanded={expandedFunction === functionKey}
                  onChange={(_, isExpanded) => setExpandedFunction(isExpanded ? functionKey : false)}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <config.icon sx={{ mr: 2, color: config.color }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{config.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {config.description} • {questions.length} question(s)
                        </Typography>
                        {evaluation.statut === 'EN_COURS' && (
                          <Box sx={{ mt: 1, width: '60%' }}>
                            <Typography variant="caption">
                              Progression: {Math.round(progress)}%
                            </Typography>
                            <LinearProgress variant="determinate" value={progress} size="small" />
                          </Box>
                        )}
                      </Box>
                      {evaluation.statut === 'TERMINE' && (
                        <Chip
                          label={formatScore(evaluation[`score_${functionKey}` as keyof Evaluation])}
                          color={getScoreColor(evaluation[`score_${functionKey}` as keyof Evaluation])}
                        />
                      )}
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    {questions.length > 0 ? questions.map((question) => (
                      <Box key={question.id_question} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          Question {question.numero_question}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {question.texte_question}
                        </Typography>
                        {question.description && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {question.description}
                          </Typography>
                        )}

                        {/* Réponses */}
                        <RadioGroup
                          value={responses[question.id_question]?.valeur_reponse || ''}
                          onChange={(e) => handleResponseChange(question.id_question, e.target.value)}
                        >
                          {scaleOptions.map((option) => (
                            <FormControlLabel
                              key={option.value}
                              value={option.value}
                              control={<Radio />}
                              label={
                                <Box>
                                  <Typography variant="body2">{option.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.description}
                                  </Typography>
                                </Box>
                              }
                              disabled={!isEditing && evaluation.statut === 'EN_COURS'}
                            />
                          ))}
                        </RadioGroup>

                        {/* Commentaire */}
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Commentaire (optionnel)"
                          value={responses[question.id_question]?.commentaire || ''}
                          onChange={(e) => handleCommentChange(question.id_question, e.target.value)}
                          disabled={!isEditing && evaluation.statut === 'EN_COURS'}
                          sx={{ mt: 2 }}
                        />
                      </Box>
                    )) : (
                      <Alert severity="warning">
                        Aucune question disponible pour cette fonction.
                      </Alert>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Paper>
        </>
      )}

      {/* Dialog de confirmation */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null })}
      >
        <DialogTitle>
          {confirmDialog.action === 'save' ? 'Sauvegarder les réponses' : 'Soumettre l\'évaluation'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'save'
              ? 'Voulez-vous sauvegarder vos réponses ? Vous pourrez continuer plus tard.'
              : 'Voulez-vous soumettre définitivement cette évaluation ? Cette action ne peut pas être annulée.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>
            Annuler
          </Button>
          <Button
            onClick={confirmDialog.action === 'save' ? handleSave : handleSubmit}
            color="primary"
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FormsGlobalDetail;