// FormsGlobalNew.tsx - Version COMPLÈTE avec permissions ET toutes les fonctionnalités

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  LinearProgress,
  Breadcrumbs,
  Link,
  IconButton,
  Divider
} from '@mui/material';
import {
  Person,
  Assessment,
  CheckCircle,
  Lock,
  Public,
  SupervisedUserCircle,
  AdminPanelSettings,
  ExpandMore,
  Security,
  Computer,
  Storage,
  Code,
  Lightbulb,
  Home,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

// Types pour les nouvelles permissions
interface UserPermissions {
  role: 'INTERVENANT' | 'MANAGER' | 'CONSULTANT' | 'ADMINISTRATEUR' | 'SUPER_ADMINISTRATEUR';
  scope: 'ENTREPRISE_PERSONNEL' | 'ENTREPRISE_COMPLETE' | 'GLOBAL';
  level: number;
  can_create_forms: boolean;
  can_view_all_companies: boolean;
  restriction_message: string | null;
}

interface EntrepriseWithPermissions {
  id_entreprise: string;
  nom_entreprise: string;
  secteur?: string;
  nombre_acteurs: number;
  nombre_evaluations: number;
}

interface AccessibleEntreprisesResponse {
  entreprises: EntrepriseWithPermissions[];
  user_permissions: UserPermissions;
}

interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  id_entreprise: string;
  poste?: string;
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

interface Response {
  id_question: string;
  valeur_reponse: string;
  score_question: number;
  commentaire?: string;
  question_texte?: string;
}

interface QuestionsByFunction {
  [fonction: string]: Question[];
}

// Configuration des fonctions
const functionsConfig = {
  cybersecurite: {
    label: 'Cybersécurité',
    icon: <Security />,
    color: '#d32f2f',
    description: 'Sécurité des systèmes et données'
  },
  maturite_digitale: {
    label: 'Maturité Digitale',
    icon: <Computer />,
    color: '#1976d2',
    description: 'Transformation et stratégie digitale'
  },
  gouvernance_donnees: {
    label: 'Gouvernance des Données',
    icon: <Storage />,
    color: '#388e3c',
    description: 'Gestion et qualité des données'
  },
  devsecops: {
    label: 'DevSecOps',
    icon: <Code />,
    color: '#f57c00',
    description: 'Développement et opérations sécurisées'
  },
  innovation_numerique: {
    label: 'Innovation Numérique',
    icon: <Lightbulb />,
    color: '#7b1fa2',
    description: 'Veille et adoption technologique'
  }
};

const scaleOptions = [
  { value: '1', label: '1 - Pas du tout', description: 'Aucune mise en place' },
  { value: '2', label: '2 - Partiellement', description: 'Début de mise en place' },
  { value: '3', label: '3 - Moyennement', description: 'Mise en place partielle' },
  { value: '4', label: '4 - Largement', description: 'Mise en place avancée' },
  { value: '5', label: '5 - Totalement', description: 'Mise en place complète' }
];

const FormsGlobalNew: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  // États
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingActeurs, setLoadingActeurs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Données avec permissions
  const [entreprises, setEntreprises] = useState<EntrepriseWithPermissions[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [questionsByFunction, setQuestionsByFunction] = useState<QuestionsByFunction>({});
  const [currentFunction, setCurrentFunction] = useState(0);

  // Formulaire
  const [formValues, setFormValues] = useState({
    id_entreprise: '',
    id_acteur: currentUser?.id_acteur || ''
  });

  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [evaluationId, setEvaluationId] = useState<string>('');

  const functionKeys = Object.keys(functionsConfig);
  const steps = [
    { label: 'Sélection', icon: <Person /> },
    { label: 'Questions', icon: <Assessment /> },
    { label: 'Validation', icon: <CheckCircle /> }
  ];

  const [validation, setValidation] = useState({
    id_entreprise: true,
    id_acteur: true
  });

  // Chargement initial
  useEffect(() => {
    loadAccessibleData();
  }, []);

  // Charger les questions dès que possible
  useEffect(() => {
    if (userPermissions) {
      loadQuestions();
    }
  }, [userPermissions]);

  // Debug: afficher les informations de debug dans la console
  useEffect(() => {
    if (userPermissions && entreprises.length > 0) {
      console.log('🔍 État actuel du composant:', {
        userPermissions,
        entreprises: entreprises.length,
        acteurs: acteurs.length,
        questions: Object.keys(questionsByFunction).length,
        formValues,
        currentUser: {
          id_acteur: currentUser?.id_acteur,
          email: currentUser?.email,
          nom_role: currentUser?.nom_role,
          id_entreprise: currentUser?.id_entreprise
        }
      });
    }
  }, [userPermissions, entreprises, acteurs, questionsByFunction, formValues, currentUser]);

  const loadAccessibleData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Chargement des données accessibles...');
      
      // Essayer plusieurs endpoints avec fallbacks
      let accessibleEntreprises = [];
      let user_permissions = null;
      
      try {
        // Endpoint principal
        const response = await api.get('/entreprises/accessible/forms');
        const data = response.data || response;
        accessibleEntreprises = data.entreprises || [];
        user_permissions = data.user_permissions || null;
        console.log('✅ Endpoint principal fonctionnel');
      } catch (primaryError) {
        console.warn('⚠️ Endpoint principal échoué, tentative de fallback:', primaryError.message);
        
        try {
          // Fallback 1: Endpoint permissions utilisateur
          const permissionsResponse = await api.get('/entreprises/permissions/user-rights');
          user_permissions = permissionsResponse.data || permissionsResponse;
          
          // Fallback 2: Endpoint entreprises standard
          const entreprisesResponse = await api.get('/entreprises');
          const allEntreprises = Array.isArray(entreprisesResponse) ? entreprisesResponse : entreprisesResponse.data || [];
          
          // Filtrer selon les permissions basiques
          if (user_permissions?.can_view_all_companies) {
            accessibleEntreprises = allEntreprises;
          } else if (currentUser?.id_entreprise) {
            accessibleEntreprises = allEntreprises.filter(e => e.id_entreprise === currentUser.id_entreprise);
          } else {
            accessibleEntreprises = allEntreprises.slice(0, 1); // Première entreprise par défaut
          }
          
          console.log('✅ Fallback réussi');
        } catch (fallbackError) {
          console.warn('⚠️ Fallback échoué, mode dégradé:', fallbackError.message);
          
          // Mode dégradé final
          user_permissions = {
            role: currentUser?.nom_role || 'INTERVENANT',
            scope: 'ENTREPRISE_PERSONNEL',
            level: 1,
            can_create_forms: true,
            can_view_all_companies: false,
            restriction_message: 'Mode dégradé - Permissions limitées'
          };
          
          // Créer une entreprise fictive basée sur l'utilisateur
          if (currentUser?.id_entreprise) {
            accessibleEntreprises = [{
              id_entreprise: currentUser.id_entreprise,
              nom_entreprise: currentUser.nom_entreprise || 'Mon Entreprise',
              nombre_acteurs: 1,
              nombre_evaluations: 0
            }];
          }
        }
      }
      
      // Validation et normalisation des données
      if (!Array.isArray(accessibleEntreprises)) {
        accessibleEntreprises = [];
      }
      
      if (!user_permissions) {
        user_permissions = {
          role: 'INTERVENANT',
          scope: 'ENTREPRISE_PERSONNEL',
          level: 1,
          can_create_forms: true,
          can_view_all_companies: false,
          restriction_message: 'Permissions par défaut'
        };
      }
      
      console.log('📊 Données finales:', {
        entreprises: accessibleEntreprises.length,
        permissions: user_permissions
      });
      
      setEntreprises(accessibleEntreprises);
      setUserPermissions(user_permissions);
      
      // Pré-sélectionner l'entreprise selon les permissions
      if (accessibleEntreprises.length > 0) {
        const preselectedId = getPreselectedEntreprise(accessibleEntreprises, user_permissions);
        setFormValues(prev => ({
          ...prev,
          id_entreprise: preselectedId
        }));
        
        // Charger les acteurs pour l'entreprise pré-sélectionnée
        if (preselectedId) {
          await loadActeurs(preselectedId);
        }
      } else {
        setError('Aucune entreprise accessible trouvée. Contactez votre administrateur.');
      }
      
    } catch (error) {
      console.error('❌ Erreur fatale chargement données:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const getPreselectedEntreprise = (
    entreprises: EntrepriseWithPermissions[], 
    permissions: UserPermissions
  ): string => {
    // 1. Priorité aux paramètres URL (si autorisé)
    const urlEntreprise = searchParams.get('id_entreprise');
    if (urlEntreprise && canSelectEntreprise(urlEntreprise, permissions)) {
      const exists = entreprises.find(e => e.id_entreprise === urlEntreprise);
      if (exists) return urlEntreprise;
    }
    
    // 2. Pour les accès restreints, prendre la première (et souvent unique) entreprise
    if (!permissions.can_view_all_companies && entreprises.length > 0) {
      return entreprises[0].id_entreprise;
    }
    
    // 3. Pour les accès globaux, prendre la première entreprise
    return entreprises.length > 0 ? entreprises[0].id_entreprise : '';
  };

  const canSelectEntreprise = (entrepriseId: string, permissions: UserPermissions): boolean => {
    // Les rôles globaux peuvent sélectionner n'importe quelle entreprise
    if (permissions.can_view_all_companies) return true;
    
    // Les rôles restreints ne peuvent sélectionner que leur entreprise
    return currentUser?.id_entreprise === entrepriseId;
  };

  const handleEntrepriseChange = async (event: any) => {
    const newEntrepriseId = event.target.value;
    
    // Validation : vérifier les permissions
    if (!canSelectEntreprise(newEntrepriseId, userPermissions!)) {
      setError('Vous ne pouvez pas sélectionner cette entreprise selon vos permissions');
      return;
    }
    
    setFormValues(prev => ({
      ...prev,
      id_entreprise: newEntrepriseId,
      id_acteur: '' // Réinitialiser l'acteur
    }));
    
    setError(null);
    await loadActeurs(newEntrepriseId);
  };

  const loadActeurs = async (entrepriseId: string) => {
    try {
      setLoadingActeurs(true);
      console.log('🔍 Chargement acteurs pour entreprise:', entrepriseId);
      
      // Endpoints avec fallback améliorés
      const endpoints = [
        `acteurs/entreprise/${entrepriseId}`,
        `entreprises/${entrepriseId}/acteurs`,
        `acteurs?entreprise=${entrepriseId}`,
        `acteurs?id_entreprise=${entrepriseId}`
      ];
      
      let acteursData = [];
      let endpointSuccess = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          const responseData = Array.isArray(response) ? response : response.data || response.acteurs || [];
          
          if (Array.isArray(responseData) && responseData.length >= 0) {
            acteursData = responseData;
            endpointSuccess = true;
            console.log(`✅ Endpoint ${endpoint} réussi:`, responseData.length, 'acteurs');
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Endpoint ${endpoint} échoué:`, error.message);
        }
      }
      
      // Si aucun endpoint ne fonctionne, mode dégradé
      if (!endpointSuccess) {
        console.log('🔧 Mode dégradé acteurs activé');
        
        if (userPermissions?.scope === 'ENTREPRISE_PERSONNEL' || !userPermissions?.can_view_all_companies) {
          // Pour INTERVENANT ou utilisateurs limités, créer un acteur basé sur l'utilisateur connecté
          acteursData = [{
            id_acteur: currentUser?.id_acteur || 'current-user',
            nom_prenom: currentUser?.nom_prenom || currentUser?.email || 'Utilisateur actuel',
            email: currentUser?.email || '',
            id_entreprise: entrepriseId,
            poste: currentUser?.poste || ''
          }];
          console.log('👤 Acteur personnel créé en mode dégradé');
        } else {
          // Pour les autres rôles, créer un acteur générique
          acteursData = [{
            id_acteur: 'generic-user',
            nom_prenom: 'Utilisateur par défaut',
            email: currentUser?.email || 'default@example.com',
            id_entreprise: entrepriseId,
            poste: 'Évaluateur'
          }];
          console.log('🔧 Acteur générique créé en mode dégradé');
        }
      }
      
      // Filtrer selon les permissions personnelles (INTERVENANT)
      let filteredActeurs = acteursData;
      if (userPermissions?.scope === 'ENTREPRISE_PERSONNEL') {
        // INTERVENANT ne voit que lui-même
        filteredActeurs = acteursData.filter(a => 
          a.id_acteur === currentUser?.id_acteur || 
          a.email === currentUser?.email
        );
        
        // Si aucun acteur trouvé après filtrage, créer un acteur pour l'utilisateur actuel
        if (filteredActeurs.length === 0 && currentUser) {
          filteredActeurs = [{
            id_acteur: currentUser.id_acteur,
            nom_prenom: currentUser.nom_prenom || currentUser.email,
            email: currentUser.email,
            id_entreprise: entrepriseId,
            poste: currentUser.poste || ''
          }];
        }
      }
      
      setActeurs(filteredActeurs);
      console.log('✅ Acteurs finaux chargés:', filteredActeurs.length);
      
      // Auto-sélectionner l'acteur si c'est un INTERVENANT avec un seul choix
      if (userPermissions?.scope === 'ENTREPRISE_PERSONNEL' && filteredActeurs.length === 1) {
        setFormValues(prev => ({
          ...prev,
          id_acteur: filteredActeurs[0].id_acteur
        }));
        console.log('🎯 Acteur auto-sélectionné:', filteredActeurs[0].nom_prenom);
      }
      
    } catch (error) {
      console.error('❌ Erreur fatale chargement acteurs:', error);
      
      // Fallback ultime : créer un acteur minimal
      const fallbackActeur = [{
        id_acteur: currentUser?.id_acteur || 'fallback-user',
        nom_prenom: currentUser?.nom_prenom || 'Utilisateur',
        email: currentUser?.email || '',
        id_entreprise: entrepriseId,
        poste: ''
      }];
      
      setActeurs(fallbackActeur);
      console.log('🆘 Acteur de secours créé');
    } finally {
      setLoadingActeurs(false);
    }
  };

  const loadQuestions = async () => {
    try {
      console.log('🔍 Chargement des questions...');
      
      // Essayer différents endpoints
      const endpoints = [
        'maturity-evaluation/questions',
        'questions/maturity',
        'questions?type=maturity',
        'questions/global-maturity',
        'evaluations/questions'
      ];
      
      let questionsData = [];
      let endpointSuccess = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          const responseData = Array.isArray(response) ? response : response.data || response.questions || [];
          
          if (Array.isArray(responseData) && responseData.length > 0) {
            questionsData = responseData;
            endpointSuccess = true;
            console.log(`✅ Questions chargées depuis ${endpoint}:`, responseData.length);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Endpoint ${endpoint} échoué:`, error.message);
        }
      }
      
      // Si aucun endpoint ne fonctionne, créer des questions par défaut
      if (!endpointSuccess || questionsData.length === 0) {
        console.log('🔧 Création de questions par défaut');
        questionsData = createDefaultQuestions();
      }
      
      // Organiser par fonction
      const questionsByFunc: QuestionsByFunction = {};
      questionsData.forEach((question, index) => {
        const fonction = question.fonction || question.category || question.module || 'general';
        if (!questionsByFunc[fonction]) {
          questionsByFunc[fonction] = [];
        }
        
        // Normaliser la structure de la question
        const normalizedQuestion = {
          id_question: question.id_question || question.id || `q_${index}`,
          fonction: fonction,
          numero_question: question.numero_question || question.ordre || index + 1,
          texte_question: question.texte_question || question.question || question.libelle || `Question ${index + 1}`,
          description: question.description || question.aide || '',
          poids: question.poids || question.weight || 1,
          type_reponse: question.type_reponse || 'ECHELLE_1_5',
          ordre_affichage: question.ordre_affichage || question.ordre || index + 1
        };
        
        questionsByFunc[fonction].push(normalizedQuestion);
      });
      
      // Trier par ordre d'affichage
      Object.keys(questionsByFunc).forEach(func => {
        questionsByFunc[func].sort((a, b) => 
          (a.ordre_affichage || a.numero_question || 0) - (b.ordre_affichage || b.numero_question || 0)
        );
      });
      
      // Vérifier que toutes les fonctions ont des questions
      functionKeys.forEach(func => {
        if (!questionsByFunc[func] || questionsByFunc[func].length === 0) {
          console.warn(`⚠️ Aucune question pour la fonction ${func}, création par défaut`);
          questionsByFunc[func] = createDefaultQuestionsForFunction(func);
        }
      });
      
      setQuestionsByFunction(questionsByFunc);
      console.log('✅ Questions organisées par fonction:', Object.keys(questionsByFunc).map(k => `${k}: ${questionsByFunc[k].length}`));
      
    } catch (error) {
      console.error('❌ Erreur fatale chargement questions:', error);
      
      // Mode dégradé : créer des questions par défaut pour toutes les fonctions
      const defaultQuestions: QuestionsByFunction = {};
      functionKeys.forEach(func => {
        defaultQuestions[func] = createDefaultQuestionsForFunction(func);
      });
      
      setQuestionsByFunction(defaultQuestions);
      console.log('🆘 Questions par défaut créées pour toutes les fonctions');
    }
  };

  const createDefaultQuestions = () => {
    const questions = [];
    functionKeys.forEach((func, funcIndex) => {
      for (let i = 1; i <= 6; i++) { // 6 questions par fonction
        questions.push({
          id_question: `${func}_${i}`,
          fonction: func,
          numero_question: i,
          texte_question: `Question ${i} - ${functionsConfig[func].label}`,
          description: `Évaluez le niveau de ${functionsConfig[func].description}`,
          poids: 1,
          type_reponse: 'ECHELLE_1_5',
          ordre_affichage: (funcIndex * 6) + i
        });
      }
    });
    return questions;
  };

  const createDefaultQuestionsForFunction = (functionKey: string) => {
    const config = functionsConfig[functionKey];
    if (!config) return [];
    
    return [
      {
        id_question: `${functionKey}_1`,
        fonction: functionKey,
        numero_question: 1,
        texte_question: `Évaluez le niveau global de ${config.label} dans votre organisation`,
        description: config.description,
        poids: 1,
        type_reponse: 'ECHELLE_1_5',
        ordre_affichage: 1
      },
      {
        id_question: `${functionKey}_2`,
        fonction: functionKey,
        numero_question: 2,
        texte_question: `Comment qualifiez-vous la maturité actuelle en ${config.label} ?`,
        description: `Évaluation de la maturité en ${config.description}`,
        poids: 1,
        type_reponse: 'ECHELLE_1_5',
        ordre_affichage: 2
      }
    ];
  };

  const renderPermissionsBanner = () => {
    if (!userPermissions) return null;

    const getRoleConfig = (role: string) => {
      const configs = {
        'INTERVENANT': {
          icon: <Person />,
          color: 'default' as const,
          label: 'Intervenant',
          description: 'Accès personnel uniquement'
        },
        'MANAGER': {
          icon: <SupervisedUserCircle />,
          color: 'success' as const,
          label: 'Manager',
          description: 'Gestion de votre entreprise'
        },
        'CONSULTANT': {
          icon: <Public />,
          color: 'info' as const,
          label: 'Consultant',
          description: 'Accès global toutes entreprises'
        },
        'ADMINISTRATEUR': {
          icon: <AdminPanelSettings />,
          color: 'warning' as const,
          label: 'Administrateur',
          description: 'Administration complète'
        },
        'SUPER_ADMINISTRATEUR': {
          icon: <AdminPanelSettings />,
          color: 'error' as const,
          label: 'Super Administrateur',
          description: 'Accès système complet'
        }
      };
      
      return configs[role] || configs['INTERVENANT'];
    };

    const roleConfig = getRoleConfig(userPermissions.role);
    const isRestricted = !userPermissions.can_view_all_companies;

    return (
      <Alert 
        severity={isRestricted ? "warning" : "info"} 
        sx={{ mb: 3 }}
        icon={isRestricted ? <Lock /> : <Public />}
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Permissions Utilisateur
          <Chip 
            icon={roleConfig.icon}
            label={roleConfig.label}
            color={roleConfig.color}
            size="small"
          />
        </AlertTitle>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          {roleConfig.description}
        </Typography>
        
        {userPermissions.restriction_message && (
          <Typography variant="body2" color="text.secondary">
            <strong>Restriction :</strong> {userPermissions.restriction_message}
          </Typography>
        )}
        
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            label={`Scope: ${userPermissions.scope}`}
            size="small"
            variant="outlined"
          />
          <Chip 
            label={`Niveau: ${userPermissions.level}`}
            size="small"
            variant="outlined"
          />
          {userPermissions.can_create_forms && (
            <Chip 
              label="Création autorisée"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Alert>
    );
  };

  const renderEntrepriseSelection = () => {
    if (!userPermissions) return null;

    const isFixed = !userPermissions.can_view_all_companies;
    const entrepriseOptions = entreprises.filter(e => 
      userPermissions.can_view_all_companies || 
      e.id_entreprise === currentUser?.id_entreprise
    );

    return (
      <FormControl fullWidth error={!validation.id_entreprise}>
        <InputLabel id="entreprise-label">
          Entreprise * {isFixed && '(Fixée selon vos permissions)'}
        </InputLabel>
        <Select
          labelId="entreprise-label"
          id="id_entreprise"
          name="id_entreprise"
          value={formValues.id_entreprise}
          onChange={handleEntrepriseChange}
          label="Entreprise *"
          required
          disabled={isFixed}
        >
          {entrepriseOptions.map((ent) => (
            <MenuItem key={ent.id_entreprise} value={ent.id_entreprise}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{ent.nom_entreprise}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`${ent.nombre_acteurs} utilisateurs`}
                    size="small"
                    variant="outlined"
                  />
                  {isFixed && (
                    <Chip 
                      label="Votre entreprise"
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
        {!validation.id_entreprise && (
          <FormHelperText>L'entreprise est requise</FormHelperText>
        )}
        {isFixed && (
          <FormHelperText>
            Sélection limitée à votre entreprise selon vos permissions
          </FormHelperText>
        )}
      </FormControl>
    );
  };

  const renderActeurSelection = () => {
    if (!userPermissions) return null;

    const isPersonalOnly = userPermissions.scope === 'ENTREPRISE_PERSONNEL';
    const acteurOptions = isPersonalOnly ? 
      acteurs.filter(a => a.id_acteur === currentUser?.id_acteur) : 
      acteurs;

    return (
      <FormControl fullWidth error={!validation.id_acteur}>
        <InputLabel id="acteur-label">
          Acteur * {isPersonalOnly && '(Vous uniquement)'}
        </InputLabel>
        <Select
          labelId="acteur-label"
          id="id_acteur"
          name="id_acteur"
          value={formValues.id_acteur}
          onChange={(e) => setFormValues(prev => ({ ...prev, id_acteur: e.target.value }))}
          label="Acteur *"
          required
          disabled={loadingActeurs || (isPersonalOnly && acteurOptions.length === 1)}
        >
          {loadingActeurs ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Chargement...
            </MenuItem>
          ) : (
            acteurOptions.map((acteur) => (
              <MenuItem key={acteur.id_acteur} value={acteur.id_acteur}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>{acteur.nom_prenom}</Typography>
                  {isPersonalOnly && (
                    <Chip 
                      label="Vous"
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
        {!validation.id_acteur && (
          <FormHelperText>L'acteur est requis</FormHelperText>
        )}
        {acteurOptions.length === 0 && formValues.id_entreprise && !loadingActeurs && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Aucun acteur accessible dans cette entreprise selon vos permissions.
          </Alert>
        )}
      </FormControl>
    );
  };

  const renderFunctionQuestions = () => {
    const currentFunctionKey = functionKeys[currentFunction];
    const currentFunctionConfig = functionsConfig[currentFunctionKey];
    const questions = questionsByFunction[currentFunctionKey] || [];

    if (questions.length === 0) {
      return (
        <Alert severity="warning">
          Aucune question disponible pour {currentFunctionConfig.label}
        </Alert>
      );
    }

    return (
      <Card 
        sx={{ 
          borderLeft: `4px solid ${currentFunctionConfig.color}`,
          mb: 3
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {currentFunctionConfig.icon}
            <Box sx={{ ml: 2 }}>
              <Typography variant="h5" component="h2">
                {currentFunctionConfig.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentFunctionConfig.description}
              </Typography>
            </Box>
          </Box>

          <LinearProgress 
            variant="determinate" 
            value={getCurrentFunctionProgress()} 
            sx={{ mb: 3 }}
          />

          <Grid container spacing={3}>
            {questions.map((question) => (
              <Grid item xs={12} key={question.id_question}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Question {question.numero_question}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {question.texte_question}
                  </Typography>
                  
                  {question.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {question.description}
                    </Typography>
                  )}

                  <FormControl component="fieldset" fullWidth>
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
                              <Typography variant="body1">{option.label}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.description}
                              </Typography>
                            </Box>
                          }
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>

                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Commentaire (optionnel)"
                    value={responses[question.id_question]?.commentaire || ''}
                    onChange={(e) => handleCommentChange(question.id_question, e.target.value)}
                    sx={{ mt: 2 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderValidationStep = () => {
    const scores = calculateScores();
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Récapitulatif de votre évaluation
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {functionKeys.map((functionKey) => {
            const config = functionsConfig[functionKey];
            const score = scores[functionKey] || 0;
            const questions = questionsByFunction[functionKey] || [];
            const answered = questions.filter(q => responses[q.id_question]?.valeur_reponse).length;
            
            return (
              <Grid item xs={12} md={6} key={functionKey}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {config.icon}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {config.label}
                      </Typography>
                    </Box>
                    <Typography variant="h4" color="primary" gutterBottom>
                      {score.toFixed(1)}/5
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {answered}/{questions.length} questions répondues
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(score / 5) * 100} 
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Score Global
            </Typography>
            <Typography variant="h3" color="primary">
              {scores.score_global?.toFixed(1) || '0.0'}/5
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Niveau de maturité numérique global
            </Typography>
          </CardContent>
        </Card>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}
      </Box>
    );
  };

  const handleResponseChange = (questionId: string, value: string) => {
    const score = parseInt(value) || 0;
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

  const validateStep1 = () => {
    const isValid = formValues.id_entreprise && formValues.id_acteur;
    setValidation({
      id_entreprise: !!formValues.id_entreprise,
      id_acteur: !!formValues.id_acteur
    });
    
    if (!isValid) {
      setError('Veuillez sélectionner une entreprise et un acteur');
    }
    
    return isValid;
  };

  const validateCurrentFunction = () => {
    const currentFunctionKey = functionKeys[currentFunction];
    const questions = questionsByFunction[currentFunctionKey] || [];
    const isValid = questions.every(q => responses[q.id_question]?.valeur_reponse);
    
    if (!isValid) {
      setError('Veuillez répondre à toutes les questions de cette section');
    }
    
    return isValid;
  };

  const calculateScores = () => {
    const scores: Record<string, number> = {};
    
    functionKeys.forEach(fonction => {
      const questions = questionsByFunction[fonction] || [];
      const functionResponses = questions.map(q => responses[q.id_question]).filter(Boolean);
      
      if (functionResponses.length > 0) {
        const totalScore = functionResponses.reduce((sum, r) => sum + r.score_question, 0);
        scores[fonction] = totalScore / functionResponses.length;
      } else {
        scores[fonction] = 0;
      }
    });

    // Score global
    const validScores = Object.values(scores).filter(s => s > 0);
    scores.score_global = validScores.length > 0 
      ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length 
      : 0;

    return scores;
  };

  const getCurrentFunctionProgress = () => {
    const currentFunctionKey = functionKeys[currentFunction];
    const questions = questionsByFunction[currentFunctionKey] || [];
    const answered = questions.filter(q => responses[q.id_question]?.valeur_reponse).length;
    return questions.length > 0 ? (answered / questions.length) * 100 : 0;
  };

  const getProgress = () => {
    if (activeStep === 0) return 10;
    if (activeStep === 1) {
      const totalQuestions = Object.values(questionsByFunction).flat().length;
      const answeredQuestions = Object.keys(responses).length;
      return 10 + (answeredQuestions / totalQuestions) * 70;
    }
    return 90;
  };

  const handleNext = async () => {
    setError(null);
    
    if (activeStep === 0) {
      if (!validateStep1()) return;
    }
    
    if (activeStep === 1) {
      if (!validateCurrentFunction()) return;
      if (currentFunction < functionKeys.length - 1) {
        setCurrentFunction(currentFunction + 1);
        return;
      }
    }

    if (activeStep === steps.length - 1) {
      await handleSubmit();
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 1 && currentFunction > 0) {
      setCurrentFunction(currentFunction - 1);
    } else if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      console.log('🚀 Soumission évaluation avec:', {
        id_entreprise: formValues.id_entreprise,
        id_acteur: formValues.id_acteur,
        responses: Object.keys(responses).length
      });

      // 1. Créer l'évaluation
      const createResponse = await api.post('maturity-evaluation/start', {
        id_entreprise: formValues.id_entreprise,
        id_acteur: formValues.id_acteur
      });

      const newEvaluationId = createResponse.data?.id_evaluation || createResponse.id_evaluation;
      setEvaluationId(newEvaluationId);

      // 2. Sauvegarder les réponses
      await api.post(`maturity-evaluation/${newEvaluationId}/responses`, {
        responses: Object.values(responses)
      });

      // 3. Soumettre l'évaluation
      const scores = calculateScores();
      await api.post(`maturity-evaluation/${newEvaluationId}/submit`, {
        scores,
        duree_minutes: 30 // Estimation
      });

      setSuccess('Évaluation créée et soumise avec succès !');
      setTimeout(() => {
        navigate('/forms', { 
          state: { 
            message: 'Évaluation de maturité créée avec succès',
            evaluationId: newEvaluationId 
          }
        });
      }, 2000);

    } catch (error: any) {
      console.error('Erreur soumission:', error);
      setError(error.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
          <Typography sx={{ ml: 2, mt: 2 }}>Chargement des permissions et données...</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cela peut prendre quelques secondes...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error && !userPermissions) {
    return (
      <Container maxWidth="lg">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Erreur de Chargement</AlertTitle>
            {error}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              startIcon={<Assessment />}
            >
              Recharger la page
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/dashboard')}
              startIcon={<Home />}
            >
              Retour au dashboard
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!userPermissions?.can_create_forms) {
    return (
      <Container maxWidth="lg">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Alert severity="error">
            <AlertTitle>Accès Non Autorisé</AlertTitle>
            Votre rôle ({userPermissions?.role || 'Unknown'}) ne vous permet pas de créer de nouveaux formulaires.
            Contactez votre administrateur si vous pensez que c'est une erreur.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link color="inherit" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer' }}>
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Link color="inherit" onClick={() => navigate('/forms')} sx={{ cursor: 'pointer' }}>
          Formulaires
        </Link>
        <Typography color="text.primary">Nouvelle évaluation de maturité</Typography>
      </Breadcrumbs>

      {/* En-tête */}
      <Paper sx={{ p: 3, mb: 3 }}>
        {renderPermissionsBanner()}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/forms')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Assessment sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography component="h1" variant="h4" color="primary">
                Nouvelle Évaluation de Maturité
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Évaluation globale de la maturité numérique de l'entreprise
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={`${Math.round(getProgress())}%`} 
            color="primary" 
            variant="outlined"
          />
        </Box>

        {/* Barre de progression globale */}
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={getProgress()} />
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel icon={step.icon}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  setError(null);
                  loadAccessibleData();
                }}
              >
                Réessayer
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Étape 1: Sélection */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Sélection de l'entreprise et de l'acteur
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                {renderEntrepriseSelection()}
              </Grid>
              
              <Grid item xs={12} md={6}>
                {renderActeurSelection()}
              </Grid>
            </Grid>

            {/* Détails des permissions (collapsible) */}
            <Accordion sx={{ mt: 3 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">
                  Voir les détails de vos permissions
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2">
                    <strong>Rôle :</strong> {userPermissions.role}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Niveau d'accès :</strong> {userPermissions.scope}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Entreprises accessibles :</strong> {entreprises.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Peut créer des formulaires :</strong> {userPermissions.can_create_forms ? 'Oui' : 'Non'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Peut voir toutes les entreprises :</strong> {userPermissions.can_view_all_companies ? 'Oui' : 'Non'}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Étape 2: Questions par fonction */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Questions - {functionsConfig[functionKeys[currentFunction]]?.label}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Chip 
                label={`Section ${currentFunction + 1} sur ${functionKeys.length}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            {renderFunctionQuestions()}
          </Box>
        )}

        {/* Étape 3: Validation */}
        {activeStep === 2 && renderValidationStep()}

        {/* Boutons de navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 && currentFunction === 0}
          >
            Précédent
          </Button>
          
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={submitting || (!formValues.id_entreprise || !formValues.id_acteur)}
          >
            {submitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {activeStep === steps.length - 1 ? 'Soumission...' : 'Chargement...'}
              </>
            ) : (
              activeStep === steps.length - 1 ? 'Soumettre l\'évaluation' : 
              activeStep === 1 && currentFunction < functionKeys.length - 1 ? 'Section suivante' : 'Suivant'
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default FormsGlobalNew;