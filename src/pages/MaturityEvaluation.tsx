// MaturityEvaluation.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, Button, Alert, CircularProgress,
  Card, CardContent, Grid, Chip, Divider
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MaturityEvaluation: React.FC = () => {
  const { enterpriseId } = useParams<{ enterpriseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);

  // ✅ NOUVELLE FONCTION : Analyser l'ID reçu et proposer des options
  const analyzeIdAndLoadOptions = useCallback(async () => {
    if (!enterpriseId || !currentUser) {
      setError('Paramètres manquants');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Analyse de l\'ID:', enterpriseId);
      
      let options = [];
      
      if (enterpriseId.startsWith('eval_')) {
        // ✅ CAS 1 : C'est un ID d'évaluation
        console.log('📋 ID d\'évaluation détecté');
        
        try {
          // Essayer de récupérer les informations de cette évaluation
          const evalResponse = await api.get(`maturity-global/evaluations/${enterpriseId}`);
          
          if (evalResponse) {
            const evaluation = evalResponse;
            
            options.push({
              type: 'resume_evaluation',
              title: 'Reprendre cette évaluation',
              description: `Évaluation ${evaluation.statut || 'EN_COURS'} pour ${evaluation.nom_entreprise || 'votre entreprise'}`,
              action: () => navigateToEvaluation(evaluation.id_entreprise, evaluation.id_evaluation),
              primary: true,
              data: evaluation
            });
          }
        } catch (evalError) {
          console.warn('⚠️ Évaluation non trouvée:', evalError);
        }
        
        // Option : Créer une nouvelle évaluation pour l'utilisateur connecté
        if (currentUser.id_entreprise) {
          options.push({
            type: 'new_evaluation',
            title: 'Créer une nouvelle évaluation',
            description: `Démarrer une nouvelle évaluation pour ${currentUser.nom_entreprise || 'votre entreprise'}`,
            action: () => createNewEvaluation(currentUser.id_entreprise),
            primary: false
          });
        }
        
      } else {
        // ✅ CAS 2 : C'est un ID d'entreprise
        console.log('🏢 ID d\'entreprise détecté');
        
        try {
          // Chercher une évaluation existante en cours
          const currentResponse = await api.get(`maturity-evaluation/current/${enterpriseId}`);
          
          if (currentResponse?.id_evaluation) {
            options.push({
              type: 'resume_current',
              title: 'Reprendre l\'évaluation en cours',
              description: 'Une évaluation est déjà en cours pour cette entreprise',
              action: () => navigateToEvaluation(enterpriseId, currentResponse.id_evaluation),
              primary: true,
              data: currentResponse
            });
          }
        } catch (currentError) {
          console.log('ℹ️ Aucune évaluation en cours trouvée');
        }
        
        // Toujours proposer de créer une nouvelle évaluation
        options.push({
          type: 'new_evaluation',
          title: 'Démarrer une nouvelle évaluation',
          description: 'Créer une nouvelle évaluation de maturité pour cette entreprise',
          action: () => createNewEvaluation(enterpriseId),
          primary: options.length === 0 // Primary si c'est la seule option
        });
      }
      
      // Options de navigation
      options.push({
        type: 'go_back',
        title: 'Retourner aux formulaires',
        description: 'Revenir à la liste des évaluations',
        action: () => navigate('/forms'),
        primary: false
      });
      
      setAvailableOptions(options);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'analyse:', error);
      setError(`Erreur lors de l'analyse: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [enterpriseId, currentUser]);

  // ✅ FONCTION : Naviguer vers une évaluation spécifique
  const navigateToEvaluation = async (enterpriseIdTarget: string, evaluationId?: string) => {
  try {
    console.log('🎯 Navigation vers évaluation:', { enterpriseIdTarget, evaluationId });
    
    if (evaluationId) {
      // ✅ SOLUTION 1 : Vérifier si l'évaluation existe et la charger directement
      try {
        // Essayer de récupérer les données de l'évaluation
        const evalResponse = await api.get(`maturity-global/evaluations/${evaluationId}`);
        
        if (evalResponse.data) {
          console.log('✅ Évaluation trouvée, chargement direct...');
          
          // Créer une interface d'évaluation simplifiée sur cette même page
          setEvaluationData({
            id_evaluation: evaluationId,
            id_entreprise: enterpriseIdTarget,
            statut: evalResponse.data.statut || 'EN_COURS',
            manager_id: currentUser.id_acteur,
            date_debut: evalResponse.data.date_debut || new Date().toISOString(),
            responses: {},
            scores: {}
          });
          
          // Charger les questions si possible
          try {
            const questionsResponse = await api.get('maturity-global/questions');
            if (questionsResponse.data) {
              // Transformer en format questionsByFunction
              const questionsByFunc: QuestionsByFunction = {};
              questionsResponse.data.forEach((q: any) => {
                if (!questionsByFunc[q.fonction]) {
                  questionsByFunc[q.fonction] = [];
                }
                questionsByFunc[q.fonction].push(q);
              });
              setQuestionsByFunction(questionsByFunc);
            }
          } catch (questionsError) {
            console.warn('⚠️ Impossible de charger les questions:', questionsError);
          }
          
          setLoading(false);
          setError('');
          return;
        }
      } catch (evalError) {
        console.warn('⚠️ Évaluation non trouvée:', evalError);
      }
    }
    
    // Si l'évaluation n'existe pas, créer une nouvelle
    console.log('📋 Création d\'une nouvelle évaluation...');
    
    const newResponse = await api.post('maturity-evaluation/start', {
      id_entreprise: enterpriseIdTarget,
      id_acteur: currentUser.id_acteur
    });
    
    const newEvaluationId = newResponse.data?.id_evaluation || newResponse.id_evaluation;
    
    if (newEvaluationId) {
      console.log('✅ Nouvelle évaluation créée:', newEvaluationId);
      
      // Mettre à jour l'état local
      setEvaluationData({
        id_evaluation: newEvaluationId,
        id_entreprise: enterpriseIdTarget,
        statut: 'EN_COURS',
        manager_id: currentUser.id_acteur,
        date_debut: new Date().toISOString(),
        responses: {},
        scores: {}
      });
      
      setLoading(false);
      setError('');
    } else {
      throw new Error('Impossible de créer l\'évaluation');
    }
    
  } catch (error: any) {
    console.error('❌ Erreur navigation vers évaluation:', error);
    setError(`Erreur lors du chargement de l'évaluation: ${error.message}`);
    setLoading(false);
  }
};

  // ✅ FONCTION : Créer une nouvelle évaluation
  const createNewEvaluation = async (enterpriseIdTarget: string) => {
    try {
      setLoading(true);
      console.log('🆕 Création nouvelle évaluation pour:', enterpriseIdTarget);
      
      const response = await api.post('maturity-evaluation/start', {
        id_entreprise: enterpriseIdTarget,
        id_acteur: currentUser.id_acteur
      });
      
      if (response?.id_evaluation) {
        console.log('✅ Nouvelle évaluation créée:', response.id_evaluation);
        
        // Rediriger vers Forms avec la nouvelle évaluation
        navigate('/forms', {
          state: {
            message: `Nouvelle évaluation créée avec succès !`,
            evaluationId: response.id_evaluation,
            newEvaluation: true
          }
        });
      } else {
        throw new Error('Réponse invalide du serveur');
      }
      
    } catch (error: any) {
      console.error('❌ Erreur création évaluation:', error);
      setError(`Erreur lors de la création: ${error.response?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ INITIALISATION
  useEffect(() => {
    analyzeIdAndLoadOptions();
  }, [analyzeIdAndLoadOptions]);

  // ✅ AFFICHAGE DE CHARGEMENT
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" py={8}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Analyse de l'évaluation en cours...
          </Typography>
        </Box>
      </Container>
    );
  }

  // ✅ AFFICHAGE D'ERREUR
  if (error && availableOptions.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Erreur lors du chargement de l'évaluation
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/forms')}
              startIcon={<ArrowBackIcon />}
            >
              Retour aux formulaires
            </Button>
            <Button 
              variant="contained" 
              onClick={analyzeIdAndLoadOptions}
              startIcon={<RefreshIcon />}
            >
              Réessayer
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }

  // ✅ AFFICHAGE PRINCIPAL AVEC OPTIONS
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <AssessmentIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Évaluation de Maturité
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choisissez une option pour continuer
        </Typography>
      </Box>

      {/* Message d'erreur si présent */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Options disponibles */}
      <Grid container spacing={3}>
        {availableOptions.map((option, index) => (
          <Grid item xs={12} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: option.primary ? 2 : 1,
                borderColor: option.primary ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={option.action}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {option.title}
                      {option.primary && (
                        <Chip 
                          label="Recommandé" 
                          size="small" 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {option.description}
                    </Typography>
                    
                    {/* Informations supplémentaires pour les évaluations */}
                    {option.data && (
                      <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          <InfoIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                          Statut: {option.data.statut} | 
                          Entreprise: {option.data.nom_entreprise || 'Non définie'}
                          {option.data.date_debut && (
                            ` | Créée le: ${new Date(option.data.date_debut).toLocaleDateString('fr-FR')}`
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Button 
                    variant={option.primary ? "contained" : "outlined"}
                    color={option.type === 'go_back' ? 'secondary' : 'primary'}
                    startIcon={
                      option.type === 'go_back' ? <ArrowBackIcon /> :
                      option.type === 'new_evaluation' ? <PlayIcon /> :
                      <AssessmentIcon />
                    }
                    sx={{ ml: 2 }}
                  >
                    {option.type === 'go_back' ? 'Retour' : 
                     option.type === 'new_evaluation' ? 'Créer' : 'Reprendre'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Informations supplémentaires */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          <InfoIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          ID reçu: <code>{enterpriseId}</code> | 
          Utilisateur: {currentUser?.nom_prenom} | 
          Entreprise: {currentUser?.nom_entreprise || 'Non définie'}
        </Typography>
      </Box>
    </Container>
  );
};

export default MaturityEvaluation;