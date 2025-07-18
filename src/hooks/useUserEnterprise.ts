// src/hooks/useUserEnterprise.ts
// Hook réutilisable pour déterminer l'entreprise de l'utilisateur via /api/acteurs/

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import api from '../services/api';

interface EnterpriseInfo {
  id_entreprise: string;
  nom_entreprise: string;
  hasGlobalAccess: boolean;
  availableEnterprises?: Array<{
    id_entreprise: string;
    nom_entreprise: string;
  }>;
  source: 'user_enterprise' | 'global_access' | 'url_parameter';
}

interface UseUserEnterpriseReturn {
  enterpriseInfo: EnterpriseInfo | null;
  loading: boolean;
  error: string | null;
  refreshEnterprise: () => Promise<void>;
  setSelectedEnterprise: (enterpriseId: string) => void;
}

/**
 * ✅ Hook personnalisé utilisant l'endpoint /api/acteurs/ existant
 * avec la logique filterByEntreprise intégrée
 */
export const useUserEnterprise = (urlEnterpriseId?: string): UseUserEnterpriseReturn => {
  const { user: authUser } = useAuth();
  const [enterpriseInfo, setEnterpriseInfo] = useState<EnterpriseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * ✅ Fonction principale pour déterminer l'entreprise
   */
  const determineEnterprise = useCallback(async () => {
    if (!authUser) {
      setError('Utilisateur non authentifié');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [useUserEnterprise] Détermination entreprise via /api/acteurs/');
      
      // ✅ Utiliser l'endpoint existant avec la logique filterByEntreprise
      const response = await api.get('/acteurs/');
      const acteurs = response.data;
      
      if (!acteurs || acteurs.length === 0) {
        throw new Error('Aucun acteur accessible');
      }

      console.log('📊 [useUserEnterprise] Acteurs trouvés:', acteurs.length);

      // ✅ Trouver l'utilisateur connecté
      const currentUser = acteurs.find((acteur: any) => 
        acteur.id_acteur === authUser.id_acteur || 
        acteur.email === authUser.email
      ) || acteurs[0];

      // ✅ Déterminer le type d'accès
      const globalRoles = ['SUPER-ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT'];
      const hasGlobalAccess = globalRoles.includes(currentUser.nom_role);

      let enterpriseData: EnterpriseInfo;

      if (hasGlobalAccess) {
        // ✅ Accès global : extraire toutes les entreprises
        const allEnterprises = Array.from(
          new Map(
            acteurs
              .filter((acteur: any) => acteur.id_entreprise && acteur.nom_entreprise)
              .map((acteur: any) => [
                acteur.id_entreprise,
                {
                  id_entreprise: acteur.id_entreprise,
                  nom_entreprise: acteur.nom_entreprise
                }
              ])
          ).values()
        );

        console.log('🌐 [useUserEnterprise] Accès global, entreprises:', allEnterprises.length);

        // Priorité : URL > entreprise utilisateur > première disponible
        let targetEnterprise;
        if (urlEnterpriseId) {
          targetEnterprise = allEnterprises.find(ent => ent.id_entreprise === urlEnterpriseId);
          console.log('🔗 [useUserEnterprise] Entreprise depuis URL:', targetEnterprise?.nom_entreprise);
        }
        
        if (!targetEnterprise && currentUser.id_entreprise) {
          targetEnterprise = allEnterprises.find(ent => ent.id_entreprise === currentUser.id_entreprise);
          console.log('👤 [useUserEnterprise] Entreprise depuis utilisateur:', targetEnterprise?.nom_entreprise);
        }
        
        if (!targetEnterprise && allEnterprises.length > 0) {
          targetEnterprise = allEnterprises[0];
          console.log('🏢 [useUserEnterprise] Première entreprise:', targetEnterprise?.nom_entreprise);
        }

        if (!targetEnterprise) {
          throw new Error('Aucune entreprise disponible malgré l\'accès global');
        }

        enterpriseData = {
          id_entreprise: targetEnterprise.id_entreprise,
          nom_entreprise: targetEnterprise.nom_entreprise,
          hasGlobalAccess: true,
          availableEnterprises: allEnterprises,
          source: urlEnterpriseId ? 'url_parameter' : 'global_access'
        };

      } else {
        // ✅ Accès spécifique à une entreprise
        if (!currentUser.id_entreprise) {
          throw new Error('Utilisateur sans entreprise et sans accès global');
        }

        console.log('🏢 [useUserEnterprise] Accès spécifique:', currentUser.nom_entreprise);

        enterpriseData = {
          id_entreprise: currentUser.id_entreprise,
          nom_entreprise: currentUser.nom_entreprise,
          hasGlobalAccess: false,
          source: 'user_enterprise'
        };
      }

      setEnterpriseInfo(enterpriseData);
      console.log('✅ [useUserEnterprise] Entreprise déterminée:', enterpriseData);

    } catch (err: any) {
      console.error('❌ [useUserEnterprise] Erreur:', err);
      
      let errorMessage = 'Erreur lors de la détermination de votre entreprise';
      
      if (err.response?.status === 403) {
        errorMessage = 'Accès non autorisé';
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expirée';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [authUser, urlEnterpriseId]);

  /**
   * ✅ Fonction pour changer d'entreprise (accès global)
   */
  const setSelectedEnterprise = useCallback((newEnterpriseId: string) => {
    if (!enterpriseInfo?.hasGlobalAccess || !enterpriseInfo.availableEnterprises) {
      console.warn('⚠️ [useUserEnterprise] Changement entreprise non autorisé');
      return;
    }

    const newEnterprise = enterpriseInfo.availableEnterprises.find(
      ent => ent.id_entreprise === newEnterpriseId
    );

    if (newEnterprise) {
      console.log('🔄 [useUserEnterprise] Changement vers:', newEnterprise.nom_entreprise);
      
      setEnterpriseInfo({
        ...enterpriseInfo,
        id_entreprise: newEnterprise.id_entreprise,
        nom_entreprise: newEnterprise.nom_entreprise,
        source: 'url_parameter'
      });
    }
  }, [enterpriseInfo]);

  /**
   * ✅ Fonction pour rafraîchir les données
   */
  const refreshEnterprise = useCallback(async () => {
    await determineEnterprise();
  }, [determineEnterprise]);

  // ✅ Chargement initial
  useEffect(() => {
    if (authUser) {
      determineEnterprise();
    }
  }, [authUser, determineEnterprise]);

  return {
    enterpriseInfo,
    loading,
    error,
    refreshEnterprise,
    setSelectedEnterprise
  };
};

// ✅ Hook simplifié pour récupérer uniquement l'ID entreprise
export const useUserEnterpriseId = (urlEnterpriseId?: string): {
  enterpriseId: string | null;
  loading: boolean;
  error: string | null;
} => {
  const { enterpriseInfo, loading, error } = useUserEnterprise(urlEnterpriseId);
  
  return {
    enterpriseId: enterpriseInfo?.id_entreprise || null,
    loading,
    error
  };
};