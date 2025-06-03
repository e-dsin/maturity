// src/components/charts/OrganisationMaturityComparisonChart.tsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useApi } from '../../hooks/useApi';

interface OrganisationScore {
  name: string;
  score: number;
  color: string;
}

interface Props {
  currentOrg: string;
}

// Liste des organisations (à récupérer dynamiquement dans un vrai scénario)
const ORGANISATIONS = [
  'TotalEnergies',
  'LVMH',
  'Sanofi',
  'BNP Paribas',
  'Airbus',
];

// Couleurs pour les barres du graphique
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

// Fonction pour simuler des données comparatives
// Dans un cas réel, vous récupéreriez ces données de votre API
const generateMockData = (currentOrg: string): OrganisationScore[] => {
  return ORGANISATIONS.map((org, index) => {
    // Générateur de score aléatoire entre 150 et 400
    const score = Math.floor(Math.random() * 250) + 150;
    
    // Augmenter légèrement le score de l'organisation courante pour la mettre en valeur
    const adjustedScore = org === currentOrg ? score + 50 : score;
    
    return {
      name: org,
      score: Math.min(adjustedScore, 480), // Limiter à 480 pour rester sous 500
      color: COLORS[index % COLORS.length]
    };
  });
};

export const OrganisationMaturityComparisonChart: React.FC<Props> = ({ currentOrg }) => {
  const [data, setData] = useState<OrganisationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Ici, vous devriez faire un appel API pour récupérer les vraies données de comparaison
        // Exemple : const comparisonData = await api.get('/api/interpretation/organisations/comparison');
        
        // Pour l'instant, on utilise des données simulées
        const mockData = generateMockData(currentOrg);
        
        // Délai artificiel pour simuler le chargement
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données de comparaison:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentOrg]);

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
          Aucune donnée comparative disponible
        </Typography>
      </Box>
    );
  }

  // Trier les données pour mettre l'organisation courante en premier
  const sortedData = [...data].sort((a, b) => {
    if (a.name === currentOrg) return -1;
    if (b.name === currentOrg) return 1;
    return b.score - a.score;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{
          top: 5,
          right: 30,
          left: 100, // Espace pour les noms d'organisations
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          domain={[0, 500]}
          label={{ value: 'Score', position: 'insideBottom', offset: -5 }}
        />
        <YAxis 
          type="category" 
          dataKey="name"
          width={80}
        />
        <Tooltip 
          formatter={(value) => [`${value} points`, 'Score']}
        />
        <Legend />
        <Bar 
          dataKey="score" 
          name="Score global" 
          radius={[0, 4, 4, 0]}
          label={{ position: 'right', formatter: (value) => `${value}` }}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.name === currentOrg ? '#ff7300' : '#8884d8'} 
              strokeWidth={entry.name === currentOrg ? 2 : 0}
              stroke="#5a5a5a"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OrganisationMaturityComparisonChart;