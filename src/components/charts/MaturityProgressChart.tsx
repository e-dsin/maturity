// src/components/charts/MaturityProgressChart.tsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useApi } from '../../hooks/useApi';

interface HistoricalData {
  date: string;
  score: number;
}

interface Props {
  organisation: string;
}

// Fonction pour simuler des données historiques
// Dans un cas réel, vous récupéreriez ces données de votre API
const generateMockData = (organisation: string, months: number = 6): HistoricalData[] => {
  const data: HistoricalData[] = [];
  const today = new Date();
  
  // Démarrer avec un score aléatoire entre 100 et 300
  let score = Math.floor(Math.random() * 200) + 100;
  
  for (let i = months; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(today.getMonth() - i);
    
    // Ajouter une variation aléatoire au score (progression générale vers le haut)
    score += Math.floor(Math.random() * 30) - 5;
    
    // Limiter le score entre 100 et 450
    score = Math.max(100, Math.min(450, score));
    
    data.push({
      date: date.toISOString().split('T')[0], // Format YYYY-MM-DD
      score
    });
  }
  
  return data;
};

const MaturityProgressChart: React.FC<Props> = ({ organisation }) => {
  const [data, setData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Ici, vous devriez faire un appel API pour récupérer les données historiques réelles
        // Exemple : const historicalData = await api.get(`/api/interpretation/organisation/${organisation}/history`);
        
        // Pour l'instant, on utilise des données simulées
        const mockData = generateMockData(organisation);
        
        // Délai artificiel pour simuler le chargement
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données historiques:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [organisation]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="text.secondary">
          Aucune donnée historique disponible pour {organisation}
        </Typography>
      </Box>
    );
  }

  // Définir les niveaux de maturité pour l'affichage dans le graphique
  const maturityLevels = [
    { y: 100, label: 'Niveau 1', color: '#e57373' },
    { y: 200, label: 'Niveau 2', color: '#ffb74d' },
    { y: 300, label: 'Niveau 3', color: '#fff176' },
    { y: 400, label: 'Niveau 4', color: '#81c784' },
    { y: 500, label: 'Niveau 5', color: '#66bb6a' },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          label={{ value: 'Date', position: 'insideBottomRight', offset: -10 }}
        />
        <YAxis 
          domain={[0, 500]} 
          label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
          ticks={[0, 100, 200, 300, 400, 500]}
        />
        <Tooltip 
          formatter={(value) => [`${value} points`, 'Score']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        
        {/* Lignes de référence pour les niveaux de maturité */}
        {maturityLevels.map((level, index) => (
          <Line
            key={`level-${index}`}
            type="monotone"
            dataKey="score"
            name={`Score ${organisation}`}
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MaturityProgressChart; // Export par défaut