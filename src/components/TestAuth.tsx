// TestAuth.jsx ou TestAuth.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const TestAuth = () => {
  const auth = useAuth();
  
  console.log('TestAuth - contexte d\'authentification complet:', auth);
  
  return (
    <div style={{ margin: '20px', padding: '20px', border: '1px solid red' }}>
      <h2>Test d'Authentification</h2>
      <pre style={{ background: '#f0f0f0', padding: '10px' }}>
        {JSON.stringify(auth, null, 2)}
      </pre>
      <p>isAuthenticated: {auth.isAuthenticated ? 'OUI' : 'NON'}</p>
      <p>isLoading: {auth.isLoading ? 'OUI' : 'NON'}</p>
      <p>currentUser: {auth.currentUser ? 'PRÉSENT' : 'ABSENT'}</p>
    </div>
  );
};

export default TestAuth;