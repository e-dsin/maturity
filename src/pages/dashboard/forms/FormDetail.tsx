import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Grid, Paper, Typography, Box, CircularProgress, Button,
  Card, CardContent, Divider, TextField, FormControl, FormControlLabel, RadioGroup, Radio,
  IconButton, Chip, Alert, Accordion, AccordionSummary, AccordionDetails, Tooltip, Badge,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Breadcrumbs, Link
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Save as SaveIcon, Send as SendIcon, Check as CheckIcon,
  ExpandMore as ExpandMoreIcon, Home as HomeIcon, Business as BusinessIcon,
  AccountTree as FunctionIcon, Person as PersonIcon, Warning as WarningIcon,
  Comment as CommentIcon, InfoOutlined as InfoIcon
} from '@mui/icons-material';
import api from '../../../services/api';

// Interfaces mises à jour
interface Thematique {
  id: string;
  nom: string;
}

interface Formulaire {
  id_formulaire: string;
  id_acteur: string;
  acteur_nom: string;
  id_application: string;
  nom_application: string;
  id_entreprise: string;
  nom_entreprise: string;
  id_questionnaire: string;
  questionnaire_nom: string;
  thematiques: Thematique[];
  fonctions: string[];
  date_creation: string;
  date_modification: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression: number;
}

interface Reponse {
  id_reponse: string;
  id_formulaire: string;
  id_question: string;
  question_texte: string;
  valeur_reponse: string;
  score: number;
  commentaire?: string;
}

interface Question {
  id_question: string;
  id_thematique: string;
  texte: string;
  ponderation: number;
  ordre: number;
  aide_reponse?: string;
  date_creation: string;
  date_modification: string;
}

const FormDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formulaire, setFormulaire] = useState<Formulaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reponses, setReponses] = useState<Reponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState<{ open: boolean; action: 'Soumis' | 'Validé' | null }>({ open: false, action: null });

  // Charger les données du formulaire
  useEffect(() => {
    const fetchFormulaire = async () => {
      if (!id) {
        setError('Identifiant du formulaire manquant');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Récupérer les informations du formulaire
        const formulaireResponse = await api.get(`formulaires/${id}`);
        const formulaireData = formulaireResponse.data || formulaireResponse;

        if (!formulaireData || typeof formulaireData !== 'object') {
          throw new Error('Format de données du formulaire inattendu');
        }

        // Normaliser les données
        const normalizedFormulaire: Formulaire = {
          id_formulaire: formulaireData.id_formulaire || '',
          id_acteur: formulaireData.acteur?.id_acteur || '',
          acteur_nom: formulaireData.acteur?.nom_prenom || 'Utilisateur inconnu',
          id_application: formulaireData.application?.id_application || '',
          nom_application: formulaireData.application?.nom_application || 'Application inconnue',
          id_entreprise: formulaireData.entreprise?.id_entreprise || '',
          nom_entreprise: formulaireData.entreprise?.nom_entreprise || 'Entreprise inconnue',
          id_questionnaire: formulaireData.questionnaire?.id_questionnaire || '',
          questionnaire_nom: formulaireData.questionnaire?.nom || 'Questionnaire inconnu',
          thematiques: Array.isArray(formulaireData.questionnaire?.thematiques)
            ? formulaireData.questionnaire.thematiques.map((t: { id: string; nom: string }) => ({
                id: t.id || '',
                nom: t.nom || 'Thématique inconnue',
              }))
            : [],
          fonctions: Array.isArray(formulaireData.questionnaire?.fonctions)
            ? formulaireData.questionnaire.fonctions.map((f: { nom: string }) => f.nom).filter(Boolean)
            : [],
          date_creation: formulaireData.date_creation || new Date().toISOString(),
          date_modification: formulaireData.date_modification || formulaireData.date_creation || new Date().toISOString(),
          statut: formulaireData.statut || 'Brouillon',
          progression: Number(formulaireData.progression) || 0,
        };

        setFormulaire(normalizedFormulaire);

        if (!normalizedFormulaire.id_questionnaire) {
          throw new Error('Questionnaire non valide associé au formulaire');
        }

        // Récupérer les questions pour chaque thématique
        const questionsPromises = normalizedFormulaire.thematiques.map(async (thematique) => {
          try {
            const response = await api.get(`questions/thematique/${thematique.id}`);
            const questions = Array.isArray(response) ? response : [];
            return questions.map((q: any) => ({
              id_question: q.id_question || '',
              id_thematique: q.id_thematique || thematique.id,
              texte: q.texte || 'Question inconnue',
              ponderation: Number(q.ponderation) || 1,
              ordre: Number(q.ordre) || 0,
              aide_reponse: q.aide_reponse || undefined,
              date_creation: q.date_creation || new Date().toISOString(),
              date_modification: q.date_modification || q.date_creation || new Date().toISOString(),
            }));
          } catch (err) {
            console.warn(`Erreur lors du chargement des questions pour la thématique ${thematique.nom}:`, err);
            return [];
          }
        });

        const questionsArrays = await Promise.all(questionsPromises);
        const normalizedQuestions = questionsArrays.flat().sort((a: Question, b: Question) => a.ordre - b.ordre);
        setQuestions(normalizedQuestions);

        // Récupérer les réponses
        const reponsesResponse = await api.get(`reponses/formulaire/${id}`);
        const reponsesData = Array.isArray(reponsesResponse) ? reponsesResponse : [];
        const normalizedReponses = reponsesData.map((r: any) => ({
          id_reponse: r.id_reponse || '',
          id_formulaire: r.id_formulaire || id,
          id_question: r.id_question || '',
          question_texte: r.question_texte || '',
          valeur_reponse: r.valeur_reponse || '',
          score: Number(r.score) || 0,
          commentaire: r.commentaire || undefined,
        }));
        setReponses(normalizedReponses);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement du formulaire.');
      } finally {
        setLoading(false);
      }
    };

    fetchFormulaire();
  }, [id]);

  // Calculs mémorisés
  const isFormComplete = useMemo(
    () => questions.length > 0 && questions.every((q) => reponses.some((r) => r.id_question === q.id_question)),
    [questions, reponses]
  );
  const progression = useMemo(
    () => (questions.length > 0 ? (reponses.length / questions.length) * 100 : 0),
    [questions.length, reponses.length]
  );
  const commentCount = useMemo(
    () => reponses.filter((r) => r.commentaire && r.commentaire.trim().length > 0).length,
    [reponses]
  );
  const criticalQuestions = useMemo(
    () => reponses.filter((r) => {
      const score = parseFloat(r.valeur_reponse) || 0;
      const question = questions.find((q) => q.id_question === r.id_question);
      return score <= 2 && question && question.ponderation >= 3;
    }).length,
    [reponses, questions]
  );

  // Regrouper les questions par thématique
  const questionsByThematique = useMemo(() => {
    if (!formulaire) return {};

    const grouped: { [key: string]: Question[] } = {};
    formulaire.thematiques.forEach((thematique) => {
      grouped[thematique.id] = questions
        .filter((q) => q.id_thematique === thematique.id)
        .sort((a, b) => a.ordre - b.ordre);
    });
    return grouped;
  }, [formulaire, questions]);

  // Trouver une réponse
  const findReponse = (questionId: string) => reponses.find((r) => r.id_question === questionId);

  // Mettre à jour une réponse
  const updateReponse = (questionId: string, value: string) => {
    const existingReponseIndex = reponses.findIndex((r) => r.id_question === questionId);
    const question = questions.find((q) => q.id_question === questionId);

    if (!question) return;

    if (existingReponseIndex >= 0) {
      const updatedReponses = [...reponses];
      updatedReponses[existingReponseIndex] = {
        ...updatedReponses[existingReponseIndex],
        valeur_reponse: value,
        score: parseInt(value) || 0,
      };
      setReponses(updatedReponses);
    } else {
      const newReponse: Reponse = {
        id_reponse: `temp_${Date.now()}`,
        id_formulaire: id || '',
        id_question: questionId,
        question_texte: question.texte,
        valeur_reponse: value,
        score: parseInt(value) || 0,
      };
      setReponses([...reponses, newReponse]);
    }
  };

  // Mettre à jour un commentaire
  const updateCommentaire = (questionId: string, commentaire: string) => {
    const existingReponseIndex = reponses.findIndex((r) => r.id_question === questionId);
    if (existingReponseIndex >= 0) {
      const updatedReponses = [...reponses];
      updatedReponses[existingReponseIndex] = {
        ...updatedReponses[existingReponseIndex],
        commentaire: commentaire || undefined,
      };
      setReponses(updatedReponses);
    }
  };

  // Gestion des actions de confirmation
  const handleConfirmAction = (action: 'Soumis' | 'Validé') => {
    setOpenConfirmDialog({ open: true, action });
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog({ open: false, action: null });
  };

  // Sauvegarder le formulaire
  const saveFormulaire = async (newStatus?: 'Brouillon' | 'Soumis' | 'Validé') => {
  if (!formulaire || !id) return;

  setSaving(true);
  setError(null);

  try {
    // ✅ ÉTAPE 1 : Mettre à jour le statut (IDENTIQUE à l'existant)
    if (newStatus && newStatus !== formulaire.statut) {
      await api.put(`formulaires/${id}`, { statut: newStatus, progression: Math.round(progression) });
      setFormulaire({ ...formulaire, statut: newStatus, progression: Math.round(progression) });
    }

    // ✅ ÉTAPE 2 : Sauvegarder les réponses (IDENTIQUE à l'existant)
    const savePromises = reponses.map(async (reponse, index) => {
      try {
        // Validation préalable
        if (!reponse.id_question || !reponse.id_formulaire) {
          console.warn(`Réponse ${index + 1} incomplète, ignorée:`, reponse);
          return { skipped: true, index };
        }

        let response;
        let result;

        if (reponse.id_reponse.startsWith('temp_')) {
          // POST pour nouvelles réponses
          response = await api.post('reponses', {
            id_formulaire: reponse.id_formulaire,
            id_question: reponse.id_question,
            valeur_reponse: reponse.valeur_reponse,
            score: reponse.score,
            commentaire: reponse.commentaire || '',
          });

          // ✅ Gestion robuste de la structure de réponse pour POST
          if (response && response.data && response.data.id_reponse) {
            result = response.data;
          } else if (response && response.id_reponse) {
            result = response;
          } else if (response) {
            console.warn(`Format de réponse inattendu pour POST réponse ${index + 1}:`, response);
            result = { id_reponse: 'created', success: true, originalResponse: response };
          } else {
            throw new Error('Aucune réponse reçue de l\'API');
          }
        } else {
          // PUT pour réponses existantes
          response = await api.put(`reponses/${reponse.id_reponse}`, {
            valeur_reponse: reponse.valeur_reponse,
            score: reponse.score,
            commentaire: reponse.commentaire || '',
          });

          // ✅ Gestion robuste de la structure de réponse pour PUT
          if (response && response.data) {
            result = response.data;
          } else if (response) {
            result = response;
          } else {
            result = { id_reponse: reponse.id_reponse, success: true };
          }
        }

        return { success: true, index, result };

      } catch (err: any) {
        console.error(`❌ Erreur sauvegarde réponse ${index + 1}:`, {
          error: err,
          reponse: reponse,
          message: err?.message,
          status: err?.response?.status
        });
        
        return { 
          success: false, 
          index, 
          error: err?.message || 'Erreur inconnue',
          reponse 
        };
      }
    });

    const results = await Promise.all(savePromises);

    // ✅ ÉTAPE 3 : Analyser les résultats (IDENTIQUE à l'existant)
    const successfulSaves = results.filter(r => r.success === true);
    const failedSaves = results.filter(r => r.success === false);
    const skippedSaves = results.filter(r => r.skipped === true);

    console.log(`📊 Résultats sauvegarde: ${successfulSaves.length} réussies, ${failedSaves.length} échouées, ${skippedSaves.length} ignorées`);

    // ✅ ÉTAPE 4 : Gestion des messages d'erreur/succès (IDENTIQUE à l'existant)
    if (failedSaves.length > 0) {
      console.error('❌ Détails des échecs:', failedSaves);
      
      const errorDetails = failedSaves.map(f => `Réponse ${f.index + 1}: ${f.error}`).join('; ');
      setError(`${failedSaves.length} réponses n'ont pas pu être sauvegardées. Détails: ${errorDetails}`);
      
    } else if (skippedSaves.length > 0) {
      setError(`${skippedSaves.length} réponses incomplètes ont été ignorées.`);
      
    } else {
      // 🆕 ÉTAPE 5 : NOUVEAU - Calcul du score après sauvegarde réussie
      try {
        console.log('🔢 Déclenchement du calcul de score...');
        
        // Déclencher le calcul de score via une mise à jour du formulaire
        const updatedFormulaire = await api.put(`formulaires/${id}`, { 
          statut: formulaire.statut,
          progression: Math.round(progression),
          trigger_score_calculation: true // Flag pour indiquer qu'on veut recalculer
        });

        // Mettre à jour le formulaire avec les nouveaux scores
        if (updatedFormulaire.score_actuel !== undefined && updatedFormulaire.score_maximum !== undefined) {
          setFormulaire(prev => ({
            ...prev,
            ...updatedFormulaire,
            // Conserver les données locales importantes
            thematiques: prev.thematiques,
            fonctions: prev.fonctions
          }));
          
          console.log(`✅ Score calculé: ${updatedFormulaire.score_actuel}/${updatedFormulaire.score_maximum}`);
        }
        
      } catch (scoreError: any) {
        console.warn('⚠️ Erreur lors du calcul de score (réponses sauvegardées avec succès):', scoreError);
        // On n'interrompt pas le processus si le calcul de score échoue
      }

      // 🆕 Messages de succès améliorés
      const successMessage = newStatus === 'Soumis'
        ? 'Formulaire soumis avec succès ! Score calculé.'
        : newStatus === 'Validé'
        ? 'Formulaire validé avec succès ! Score calculé.'
        : 'Formulaire enregistré avec succès ! Score calculé.';
        
      setSuccess(successMessage);
    }

  } catch (err: any) {
    console.error('❌ Erreur générale lors de la sauvegarde:', err);
    setError(err.message || 'Erreur lors de la sauvegarde du formulaire.');
  } finally {
    setSaving(false);
  }
};

  // Statut du formulaire
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Validé':
        return { label: 'Validé', color: 'success' as const };
      case 'Soumis':
        return { label: 'Soumis', color: 'primary' as const };
      default:
        return { label: 'Brouillon', color: 'warning' as const };
    }
  };

  // Formatage des dates
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!formulaire) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Formulaire non trouvé.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/formulaires')} sx={{ mt: 2 }}>
          Retour à la liste
        </Button>
      </Container>
    );
  }

  const statusInfo = getStatusInfo(formulaire.statut);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center' }} href="/">
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Accueil
        </Link>
        <Link underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center' }} href="/formulaires">
          Formulaires
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          {formulaire.questionnaire_nom}
        </Typography>
      </Breadcrumbs>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center">
                <IconButton color="primary" onClick={() => navigate('/formulaires')} sx={{ mr: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography component="h1" variant="h5" color="primary">
                  {formulaire.questionnaire_nom}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                {criticalQuestions > 0 && (
                  <Tooltip title={`${criticalQuestions} question(s) critique(s)`}>
                    <Badge badgeContent={criticalQuestions} color="error" sx={{ mr: 2 }}>
                      <WarningIcon color="error" />
                    </Badge>
                  </Tooltip>
                )}
                {commentCount > 0 && (
                  <Tooltip title={`${commentCount} commentaire(s)`}>
                    <Badge badgeContent={commentCount} color="info" sx={{ mr: 2 }}>
                      <CommentIcon color="info" />
                    </Badge>
                  </Tooltip>
                )}
                <Chip label={statusInfo.label} color={statusInfo.color} variant="outlined" />
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="center" mb={1}>
                  <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="subtitle1">
                    <strong>Entreprise:</strong> {formulaire.nom_entreprise}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <FunctionIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="subtitle1">
                    <strong>Fonctions:</strong> {formulaire.fonctions.join(', ') || 'Aucune'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="center" mb={1}>
                  <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="subtitle1">
                    <strong>Thématiques:</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {formulaire.thematiques.map((thematique, index) => (
                    <Chip key={index} label={thematique.nom} size="small" color="secondary" variant="outlined" />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="center" mb={1}>
                  <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="subtitle1">
                    <strong>Acteur:</strong> {formulaire.acteur_nom}
                  </Typography>
                </Box>
                <Typography variant="subtitle1">
                  <strong>Date de création:</strong> {formatDate(formulaire.date_creation)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ width: '100%' }}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Progression: {Math.round(progression)}% 
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    {reponses.length} / {questions.length} questions répondues
                </Typography>
              </Box>
              <Box sx={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: 1, height: 8 }}>
                <Box
                  sx={{
                    width: `${progression}%`,
                    backgroundColor: progression < 30 ? '#f44336' : progression < 70 ? '#ff9800' : '#4caf50',
                    borderRadius: 1,
                    height: '100%',
                    transition: 'width 0.5s ease-in-out',
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Questions par thématique
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {formulaire.thematiques.length > 0 ? (
              formulaire.thematiques.map((thematique) => (
                <Accordion key={thematique.id} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">{thematique.nom}</Typography>
                    <Box sx={{ ml: 2 }}>
                      <Chip
                        label={`${questionsByThematique[thematique.id]?.length || 0} questions`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {questionsByThematique[thematique.id]?.length > 0 ? (
                      questionsByThematique[thematique.id].map((question) => {
                        const reponse = findReponse(question.id_question);
                        const isHighPriority = question.ponderation >= 3;
                        const isCritical = reponse && (parseInt(reponse.valeur_reponse) || 0) <= 2 && isHighPriority;

                        return (
                          <Card
                            key={question.id_question}
                            sx={{
                              mb: 3,
                              position: 'relative',
                              border: isCritical ? '1px solid #f44336' : isHighPriority ? '1px solid #ff9800' : 'none',
                            }}
                          >
                            <CardContent>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -10,
                                  left: -10,
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  backgroundColor: isHighPriority ? 'warning.main' : 'primary.main',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                }}
                              >
                                {question.ordre}
                              </Box>
                              <Box sx={{ ml: 3 }}>
                                <Typography variant="subtitle1" gutterBottom fontWeight={isHighPriority ? 'bold' : 'normal'}>
                                  {question.texte}
                                  {isHighPriority && (
                                    <Tooltip title="Question à forte pondération">
                                      <InfoIcon color="warning" fontSize="small" sx={{ ml: 1 }} />
                                    </Tooltip>
                                  )}
                                </Typography>
                                {question.aide_reponse && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2}}>
                                    <strong>Aide:</strong> {question.aide_reponse}
                                  </Typography>
                                )}
                                <Typography
                                  variant="caption"
                                  color={isHighPriority ? 'warning.main' : 'text.secondary'}
                                  sx={{ display: 'block', mb: 2 }}
                                >
                                  Pondération: {question.ponderation} {isHighPriority ? '(Question importante)' : ''}
                                </Typography>
                                <FormControl component="fieldset" sx={{ width: "100%" }}>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    Évaluation (1 = Niveau initial, 5 = Niveau optimisé)
                                  </Typography>
                                  <RadioGroup
                                    row
                                    name={`question-${question.id_question}`}
                                    value={reponse?.valeur_reponse || ''}
                                    onChange={(e) => updateReponse(question.id_question, e.target.value)}
                                  >
                                    {[1, 2, 3, 4, 5].map((value) => (
                                      <FormControlLabel
                                        key={value}
                                        value={value.toString()}
                                        control={
                                          <Radio
                                            sx={{
                                              color: value <= 2 && isHighPriority ? 'error.main' : undefined,
                                              '&.Mui-checked': {
                                                color: value <= 2 && isHighPriority ? 'error.main' : undefined,
                                              },
                                            }}
                                          />
                                        }
                                        label={value.toString()}
                                        disabled={formulaire.statut === 'Validé'}
                                      />
                                    ))}
                                  </RadioGroup>
                                </FormControl>
                                <TextField
                                  fullWidth
                                  label="Commentaire (optionnel)"
                                  multiline
                                  rows={2}
                                  margin="normal"
                                  value={reponse?.commentaire || ''}
                                  onChange={(e) => updateCommentaire(question.id_question, e.target.value)}
                                  disabled={formulaire.statut === 'Validé'}
                                  helperText={isCritical ? 'Un commentaire est recommandé pour cette question critique' : ''}
                                  error={isCritical && (!reponse?.commentaire || reponse.commentaire.trim() === '')}
                                />
                                {isCritical && (!reponse?.commentaire || reponse.commentaire.trim() === '') && (
                                  <Alert severity="warning" sx={{ mt: 1 }}>
                                    Veuillez ajouter un commentaire pour justifier cette évaluation critique.
                                  </Alert>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Aucune question pour cette thématique.
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography variant="body1" align="center" sx={{ py: 2 }}>
                Aucune thématique associée à ce formulaire.
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => saveFormulaire('Brouillon')}
                disabled={saving || formulaire.statut === 'Validé'}
                startIcon={<SaveIcon />}
                sx={{ mr: 1 }}
              >
                Enregistrer
              </Button>
              {formulaire.statut === 'Brouillon' && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleConfirmAction('Soumis')}
                  disabled={saving || !isFormComplete}
                  startIcon={<SendIcon />}
                  sx={{ mr: 1 }}
                >
                  Soumettre
                </Button>
              )}
              {formulaire.statut === 'Soumis' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleConfirmAction('Validé')}
                  disabled={saving || !isFormComplete}
                  startIcon={<CheckIcon />}
                >
                  Valider
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="reponses-content" id="reponses-header">
              <Typography>Aperçu des réponses</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ width: '100%' }}>
                {formulaire.thematiques.map((thematique) => (
                  <Box key={thematique.id} sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {thematique.nom}
                    </Typography>
                    {questionsByThematique[thematique.id]?.length > 0 ? (
                      questionsByThematique[thematique.id].map((question) => {
                        const reponse = findReponse(question.id_question);
                        const isHighPriority = question.ponderation >= 3;
                        const isCritical = reponse && (parseInt(reponse.valeur_reponse) || 0) <= 2 && isHighPriority;

                        return (
                          <Box
                            key={question.id_question}
                            sx={{
                              mb: 2,
                              p: 2,
                              border: isCritical ? '1px solid #f44336' : isHighPriority ? '1px solid #ff9800' : '1px solid #eee',
                              borderRadius: 1,
                              bgcolor: isCritical ? 'rgba(244, 67, 54, 0.05)' : isHighPriority ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight={isHighPriority ? 'bold' : 'normal'}>
                              {question.ordre}. {question.texte}
                              {isHighPriority && (
                                <Tooltip title="Question à forte pondération">
                                  <InfoIcon color="warning" fontSize="small" sx={{ ml: 1 }} />
                                </Tooltip>
                              )}
                            </Typography>
                            {reponse ? (
                              <>
                                <Typography variant="body2" sx={{ mt: 1, color: isCritical ? 'error.main' : 'inherit' }}>
                                  <strong>Réponse:</strong> {reponse.valeur_reponse} / 5
                                </Typography>
                                {reponse.commentaire ? (
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Commentaire:</strong> {reponse.commentaire}
                                  </Typography>
                                ) : (
                                  isCritical && (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                      <strong>Commentaire manquant</strong> pour une question critique
                                    </Typography>
                                  )
                                )}
                              </>
                            ) : (
                              <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                                Pas de réponse
                              </Typography>
                            )}
                          </Box>
                        );
                      })
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Aucune question pour cette thématique.
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <Dialog
        open={openConfirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {openConfirmDialog.action === 'Soumis' ? 'Soumettre le formulaire ?' : 'Valider le formulaire ?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {openConfirmDialog.action === 'Soumis'
              ? 'Êtes-vous sûr de vouloir soumettre ce formulaire ? Après soumission, il sera en attente de validation.'
              : 'Êtes-vous sûr de vouloir valider ce formulaire ? Cette action est définitive.'}
          </DialogContentText>
          {criticalQuestions > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Attention : {criticalQuestions} question(s) critique(s) ont une note faible. Assurez-vous que tous les commentaires sont bien renseignés.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="inherit">
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (openConfirmDialog.action) {
                saveFormulaire(openConfirmDialog.action);
                handleCloseConfirmDialog();
              }
            }}
            color={openConfirmDialog.action === 'Validé' ? 'success' : 'primary'}
            variant="contained"
            autoFocus
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FormDetail;