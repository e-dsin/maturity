// Ajoutez ce composant dans votre Dashboard temporairement
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, Alert, Box, Chip } from '@mui/material';
import api from '../services/api';

const QuickConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [message, setMessage] = useState<string>('Test en cours...');
  const [details, setDetails] = useState<any>(null);

  const runTest = async () => {
    setStatus('testing');
    setMessage('Test en cours...');
    
    try {
      console.log('🧪 Test de connexion Frontend → Backend');
      console.log('🌐 URL API configurée:', api.getBaseURL());
      
      // Test 1: Health check basique
      const health = await api.get('/health');
      console.log('✅ Health check réussi:', health);
      
      // Test 2: Test de login
      const loginTest = await api.post('/auth/login', {
        email: 'test@example.com',
        password: 'test'
      });
      console.log('✅ Test login réussi:', loginTest);
      
      setStatus('success');
      setMessage('Connexion Frontend ↔ Backend réussie !');
      setDetails({
        backendUrl: api.getBaseURL(),
        healthStatus: health.status,
        loginUser: loginTest.user?.nom_prenom || 'Utilisateur temporaire',
        environment: health.environment,
        uptime: Math.round(health.uptime) + 's'
      });
      
    } catch (error: any) {
      console.error('❌ Test de connexion échoué:', error);
      
      setStatus('error');
      setMessage(`Erreur: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      setDetails({
        backendUrl: api.getBaseURL(),
        errorStatus: error.response?.status,
        errorMessage: error.response?.data?.message || error.message,
        errorType: error.code || 'UNKNOWN'
      });
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  return (
    <Card sx={{ mt: 2, border: '2px solid', borderColor: status === 'success' ? 'success.main' : status === 'error' ? 'error.main' : 'warning.main' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">🔗 Test Connexion Frontend ↔ Backend</Typography>
          <Chip 
            label={status === 'testing' ? 'EN COURS' : status === 'success' ? 'SUCCÈS' : 'ERREUR'} 
            color={status === 'success' ? 'success' : status === 'error' ? 'error' : 'warning'} 
          />
        </Box>
        
        <Alert severity={status === 'success' ? 'success' : status === 'error' ? 'error' : 'info'} sx={{ mb: 2 }}>
          {message}
        </Alert>
        
        {details && (
          <Box>
            <Typography variant="body2" gutterBottom><strong>URL Backend:</strong> {details.backendUrl}</Typography>
            {details.healthStatus && (
              <>
                <Typography variant="body2"><strong>Status:</strong> {details.healthStatus}</Typography>
                <Typography variant="body2"><strong>Environnement:</strong> {details.environment}</Typography>
                <Typography variant="body2"><strong>Uptime:</strong> {details.uptime}</Typography>
                <Typography variant="body2"><strong>Utilisateur test:</strong> {details.loginUser}</Typography>
              </>
            )}
            {details.errorStatus && (
              <>
                <Typography variant="body2" color="error"><strong>Code erreur:</strong> {details.errorStatus}</Typography>
                <Typography variant="body2" color="error"><strong>Message:</strong> {details.errorMessage}</Typography>
                <Typography variant="body2" color="error"><strong>Type:</strong> {details.errorType}</Typography>
              </>
            )}
          </Box>
        )}
        
        <Button 
          variant="outlined" 
          onClick={runTest} 
          sx={{ mt: 2 }}
          disabled={status === 'testing'}
        >
          Relancer le test
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickConnectionTest;