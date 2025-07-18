// src/hooks/useEvaluationRedirect.ts
// Hook pour gérer automatiquement la redirection vers les évaluations

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import api from '../services/api';

interface EvaluationStatus {
  hasEvaluation: boolean;
  status: 'PENDING_ACCEPTANCE' | 'IN_PROGRESS' | 'READY_TO_START' | 'COMPLETED' | 'NO_EVALUATION' | 'ERROR';
  message: string;
  redirectTo: string;
  invitation?: {
    token: string;
    id_invite: string;
    statut_invitation: string;
    nom_entreprise: string;
  };
  shouldAutoRedirect?: boolean;
}

interface UseEvaluationRedirectReturn {
  evaluationStatus: EvaluationStatus | null;
  isChecking: boolean;
  error: string | null;
  checkEvaluationStatus: () => Promise<void>;
  goToEvaluation: () => void;
  canNavigateFreely: boolean;
  needsAttention: boolean;
}

/**
 * ✅ Hook pour gérer automatiquement les redirections d'évaluation
 */
export const useEvaluationRedirect = (autoCheck = true): UseEvaluationRedirectReturn => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ✅ Vérifier le statut d'évaluation de l'utilisateur
   */
  const checkEvaluationStatus = useCallback(async () => {
    if (!user?.id_acteur || !isAuthenticated) {
      console.log('👤 Utilisateur non authentifié, pas de vérification évaluation');
      return;
    }

    try {
      setIsChecking(true);
      setError(null);
      
      console.log('🔍 Vérification statut évaluation pour:', user.nom_prenom);
      
      const response = await api.get(`/evaluation-status/check/${user.id_acteur}`);
      const status: EvaluationStatus = response.data;
      
      console.log('📋 Statut évaluation reçu:', status);
      
      // ✅ Déterminer si une redirection automatique est nécessaire
      status.shouldAutoRedirect = [
        'PENDING_ACCEPTANCE',
        'IN_PROGRESS', 
        'READY_TO_START'
      ].includes(status.status);
      
      setEvaluationStatus(status);
      
      // ✅ REDIRECTION AUTOMATIQUE si nécessaire et autorisée
      if (autoCheck && status.shouldAutoRedirect && status.redirectTo) {
        console.log('🚀 Redirection automatique vers:', status.redirectTo);
        
        // Délai court pour permettre à l'utilisateur de voir le message
        setTimeout(() => {
          navigate(status.redirectTo, { replace: true });
        }, 1000);
      }
      
    } catch (err: any) {
      console.error('❌ Erreur vérification évaluation:', err);
      
      const errorMessage = err.response?.data?.message || 
                          'Erreur lors de la vérification du statut d\'évaluation';
      setError(errorMessage);
      
      // En cas d'erreur, permettre la navigation normale
      setEvaluationStatus({
        hasEvaluation: false,
        status: 'ERROR',
        message: errorMessage,
        redirectTo: '/dashboard'
      });
      
    } finally {
      setIsChecking(false);
    }
  }, [user?.id_acteur, isAuthenticated, autoCheck, navigate]);

  /**
   * ✅ Navigation manuelle vers l'évaluation
   */
  const goToEvaluation = useCallback(() => {
    if (evaluationStatus?.redirectTo) {
      console.log('🎯 Navigation manuelle vers:', evaluationStatus.redirectTo);
      navigate(evaluationStatus.redirectTo);
    }
  }, [evaluationStatus?.redirectTo, navigate]);

  /**
   * ✅ Déterminer si l'utilisateur peut naviguer librement
   */
  const canNavigateFreely = !evaluationStatus?.shouldAutoRedirect || 
                           evaluationStatus?.status === 'COMPLETED' ||
                           evaluationStatus?.status === 'NO_EVALUATION';

  /**
   * ✅ Déterminer si l'évaluation nécessite une attention
   */
  const needsAttention = evaluationStatus?.hasEvaluation && 
                        ['PENDING_ACCEPTANCE', 'IN_PROGRESS', 'READY_TO_START'].includes(evaluationStatus.status);

  /**
   * ✅ Vérification automatique au montage et changement d'utilisateur
   */
  useEffect(() => {
    if (autoCheck && user?.id_acteur && isAuthenticated) {
      console.log('🔄 Auto-vérification statut évaluation...');
      checkEvaluationStatus();
    }
  }, [user?.id_acteur, isAuthenticated, autoCheck, checkEvaluationStatus]);

  /**
   * ✅ Nettoyage à la déconnexion
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setEvaluationStatus(null);
      setError(null);
    }
  }, [isAuthenticated]);

  return {
    evaluationStatus,
    isChecking,
    error,
    checkEvaluationStatus,
    goToEvaluation,
    canNavigateFreely,
    needsAttention
  };
};

/**
 * ✅ Hook simplifié pour vérifier uniquement le statut
 */
export const useEvaluationStatus = () => {
  const { evaluationStatus, isChecking, error } = useEvaluationRedirect(false);
  
  return {
    hasEvaluation: evaluationStatus?.hasEvaluation || false,
    status: evaluationStatus?.status || 'NO_EVALUATION',
    message: evaluationStatus?.message || '',
    isChecking,
    error
  };
};

/**
 * ✅ Hook pour composants qui veulent bloquer la navigation si évaluation en cours
 */
export const useEvaluationGuard = () => {
  const { evaluationStatus, canNavigateFreely, goToEvaluation } = useEvaluationRedirect(false);
  
  const checkBeforeNavigation = useCallback((targetPath: string): boolean => {
    if (!canNavigateFreely && evaluationStatus?.shouldAutoRedirect) {
      console.warn('🚫 Navigation bloquée, évaluation en attente');
      goToEvaluation();
      return false;
    }
    return true;
  }, [canNavigateFreely, evaluationStatus?.shouldAutoRedirect, goToEvaluation]);
  
  return {
    canNavigate: canNavigateFreely,
    checkBeforeNavigation,
    evaluationStatus
  };
};