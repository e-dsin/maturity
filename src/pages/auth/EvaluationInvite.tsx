// EvaluateInvite.jsx - Composant adapté pour les rôles MANAGE et INTERVENANT

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  Chip,
  Grid,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Business,
  Person,
  Email,
  Work,
  AccessTime,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import api from '../../services/api';

const EvaluateInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  // Mapper les rôles pour l'affichage
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'MANAGE':
        return {
          label: 'Manager',
          color: 'primary',
          icon: '👨‍💼',
          description: 'Responsable de l\'évaluation et gestionnaire d\'équipe'
        };
      case 'INTERVENANT':
        return {
          label: 'Intervenant',
          color: 'secondary',
          icon: '👥',
          description: 'Participant à l\'évaluation de maturité'
        };
      default:
        return {
          label: 'Participant',
          color: 'default',
          icon: '👤',
          description: 'Participant à l\'évaluation'
        };
    }
  };

  // Obtenir les permissions selon le rôle
  const getRolePermissions = (role) => {
    switch (role) {
      case 'MANAGE':
        return [
          'Consulter tous les modules d\'évaluation',
          'Éditer et configurer les évaluations',
          'Administrer l\'équipe d\'évaluation',
          'Accéder aux rapports détaillés',
          'Gérer les paramètres de l\'entreprise'
        ];
      case 'INTERVENANT':
        return [
          'Consulter les questionnaires assignés',
          'Répondre aux évaluations',
          'Éditer son profil personnel',
          'Consulter les rapports de base'
        ];
      default:
        return [
          'Consulter les évaluations assignées',
          'Participer aux questionnaires'
        ];
    }
  };

  useEffect(() => {
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      console.log('🔍 Validation de l\'invitation avec token:', token);
      
      const response = await api.get(`/evaluation-invite/validate/${token}`);
      const inviteData = response.data;
      
      console.log('✅ Invitation validée:', inviteData);
      setInvitation(inviteData);
      
      // Vérifier le statut de l'invitation
      if (inviteData.statut === 'ACCEPTE') {
        console.log('ℹ️ Invitation déjà acceptée');
      } else if (inviteData.statut === 'EXPIRE') {
        setError('Cette invitation a expiré');
      } else if (new Date(inviteData.date_expiration) < new Date()) {
        setError('Cette invitation a expiré');
      }
      
    } catch (error) {
      console.error('❌ Erreur validation invitation:', error);
      setError(
        error.response?.data?.message || 
        'Invitation invalide ou expirée'
      );
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    try {
      setAccepting(true);
      console.log('✅ Acceptation de l\'invitation...');
      
      const response = await api.post(`/evaluation-invite/accept/${token}`, {
        accepte: true
      });
      
      console.log('🎉 Invitation acceptée:', response.data);
      
      // Rediriger selon le rôle
      if (invitation.role === 'MANAGE') {
        navigate(`/dashboard/manager?enterprise=${invitation.id_entreprise}`);
      } else {
        navigate(`/dashboard/evaluation?enterprise=${invitation.id_entreprise}&evaluation=${invitation.id_evaluation}`);
      }
      
    } catch (error) {
      console.error('❌ Erreur acceptation:', error);
      setError(
        error.response?.data?.message || 
        'Erreur lors de l\'acceptation de l\'invitation'
      );
    } finally {
      setAccepting(false);
    }
  };

  const declineInvitation = async () => {
    try {
      console.log('❌ Refus de l\'invitation...');
      
      await api.post(`/evaluation-invite/accept/${token}`, {
        accepte: false
      });
      
      navigate('/declined', { 
        state: { message: 'Invitation déclinée avec succès' }
      });
      
    } catch (error) {
      console.error('❌ Erreur refus:', error);
      setError('Erreur lors du refus de l\'invitation');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Validation de votre invitation...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>Erreur</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!invitation) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          <AlertTitle>Invitation introuvable</AlertTitle>
          L'invitation demandée n'a pas pu être trouvée.
        </Alert>
      </Container>
    );
  }

  const roleInfo = getRoleDisplay(invitation.role);
  const permissions = getRolePermissions(invitation.role);
  const isExpired = new Date(invitation.date_expiration) < new Date();
  const isAccepted = invitation.statut === 'ACCEPTE';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        {/* En-tête */}
        <Box 
          sx={{ 
            background: `linear-gradient(135deg, ${
              invitation.role === 'MANAGER' ? '#1976d2' : '#9c27b0'
            } 0%, ${
              invitation.role === 'MANAGER' ? '#1565c0' : '#7b1fa2'
            } 100%)`,
            color: 'white',
            p: 4,
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" gutterBottom>
            {roleInfo.icon} Invitation à l'Évaluation
          </Typography>
          <Typography variant="h6">
            {invitation.nom_entreprise}
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {/* Statut de l'invitation */}
          {isAccepted && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Invitation déjà acceptée</AlertTitle>
              Vous avez déjà accepté cette invitation. Vous pouvez accéder à votre espace d'évaluation.
            </Alert>
          )}

          {isExpired && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Invitation expirée</AlertTitle>
              Cette invitation a expiré le {new Date(invitation.date_expiration).toLocaleDateString('fr-FR')}.
            </Alert>
          )}

          {/* Informations personnelles */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Vos Informations
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                      Nom:
                    </Typography>
                    <Typography variant="body1">
                      {invitation.nom_prenom}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Email sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {invitation.email}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Work sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {invitation.fonction}
                    </Typography>
                  </Box>
                  <Chip 
                    label={roleInfo.label}
                    color={roleInfo.color}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Informations sur le rôle */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                Votre Rôle dans l'Évaluation
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {roleInfo.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Permissions et Accès :
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {permissions.map((permission, index) => (
                  <Typography 
                    key={index} 
                    component="li" 
                    variant="body2" 
                    sx={{ mb: 0.5 }}
                  >
                    {permission}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Informations sur l'expiration */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccessTime sx={{ mr: 1, verticalAlign: 'middle' }} />
                Informations sur l'Invitation
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Expire le:
                </Typography>
                <Typography variant="body2">
                  {new Date(invitation.date_expiration).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Statut:
                </Typography>
                <Chip 
                  label={invitation.statut}
                  color={
                    invitation.statut === 'ACCEPTE' ? 'success' :
                    invitation.statut === 'ATTENTE' ? 'warning' : 'error'
                  }
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {!isExpired && !isAccepted && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={acceptInvitation}
                  disabled={accepting}
                  startIcon={<CheckCircle />}
                  sx={{ minWidth: 160 }}
                >
                  {accepting ? 'Acceptation...' : 'Accepter'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  onClick={declineInvitation}
                  startIcon={<Warning />}
                  sx={{ minWidth: 160 }}
                >
                  Décliner
                </Button>
              </>
            )}

            {isAccepted && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => {
                  if (invitation.role === 'MANAGER') {
                    navigate(`/dashboard/manager?enterprise=${invitation.id_entreprise}`);
                  } else {
                    navigate(`/dashboard/evaluation?enterprise=${invitation.id_entreprise}&evaluation=${invitation.id_evaluation}`);
                  }
                }}
                startIcon={<CheckCircle />}
                sx={{ minWidth: 160 }}
              >
                Accéder au Dashboard
              </Button>
            )}

            {isExpired && (
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => navigate('/contact')}
                sx={{ minWidth: 160 }}
              >
                Demander une Nouvelle Invitation
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EvaluateInvite;