// src/components/DebugAPITest.tsx
import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, Alert, Stack } from '@mui/material';
import api from '../services/api';

const DebugAPITest: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test: string, status: 'success' | 'error', message: string, data?: any) => {
    const result = {
      test,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [result, ...prev.slice(0, 9)]); // Garder les 10 derniers
  };

  const testEndpoint = async (name: string, url: string, method: 'GET' | 'POST' = 'GET', data?: any) => {
    try {
      console.log(`🧪 Test: ${name} - ${method} ${url}`);
      
      let result;
      if (method === 'POST') {
        result = await api.post(url, data);
      } else {
        result = await api.get(url);
      }
      
      addResult(name, 'success', `${method} ${url} - OK`, result);
      console.log(`✅ ${name} - Succès:`, result);
      
    } catch (error: any) {
      const message = `${method} ${url} - ${error.response?.status || 'ERROR'}: ${error.response?.statusText || error.message}`;
      addResult(name, 'error', message, error.response?.data);
      console.error(`❌ ${name} - Erreur:`, error);
    }
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    console.log('🚀 === DÉBUT DES TESTS DEBUG ===');
    
    // Test 1: Health check basic
    await testEndpoint('Health Basic', '/health');
    
    // Test 2: Health check API
    await testEndpoint('Health API', 'health');
    
    // Test 3: Test CORS
    await testEndpoint('Test CORS', 'test-cors');
    
    // Test 4: Auth Login avec normalization
    await testEndpoint('Login (auth/login)', 'auth/login', 'POST', {
      email: 'test@example.com',
      password: 'test'
    });
    
    // Test 5: User permissions
    await testEndpoint('User Permissions', 'user/permissions');
    
    console.log('🏁 === FIN DES TESTS DEBUG ===');
    setTesting(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <Card sx={{ mt: 2, border: '2px solid #2196f3' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔧 Debug API - Test des endpoints
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Base URL: <strong>{api.getBaseURL()}</strong><br/>
          Ce composant teste la normalisation des URLs et les endpoints du backend.
        </Typography>
        
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={runTests} 
            disabled={testing}
          >
            {testing ? 'Tests en cours...' : 'Lancer les tests'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={clearResults} 
            disabled={testing}
          >
            Effacer
          </Button>
        </Stack>

        {results.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Résultats des tests:
            </Typography>
            <Stack spacing={1} sx={{ maxHeight: 400, overflow: 'auto' }}>
              {results.map((result, index) => (
                <Alert 
                  key={index}
                  severity={result.status === 'success' ? 'success' : 'error'}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <Typography variant="body2" component="div">
                    <strong>{result.timestamp} - {result.test}</strong><br/>
                    {result.message}
                    {result.data && (
                      <details style={{ marginTop: 8 }}>
                        <summary>Données reçues</summary>
                        <pre style={{ fontSize: '0.75rem', marginTop: 4, overflow: 'auto' }}>
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Typography>
                </Alert>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugAPITest;