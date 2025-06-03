// src/components/charts/OrganisationChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { Typography, Box } from '@mui/material';

interface Organisation {
  nom: string;
  scoreGlobalMoyen: number;
}

interface Props {
  organisations: Organisation[];
}

export const OrganisationChart: React.FC<Props> = ({ organisations }) => {
  // Pas de rendu si pas de données
  if (!organisations || organisations.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="body1" color="text.secondary">
          Aucune donnée disponible pour le graphique
        </Typography>
      </Box>
    );
  }

  // Filtrer les organisations qui ont un score
  const orgsWithScore = organisations.filter(org => org.scoreGlobalMoyen > 0);
  
  if (orgsWithScore.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="body1" color="text.secondary">
          Aucune organisation n'a encore d'évaluation de maturité
        </Typography>
      </Box>
    );
  }

  // Préparation des données pour le graphique
  const chartData = orgsWithScore
    .map(org => ({
      name: org.nom,
      score: Math.round(org.scoreGlobalMoyen)
    }))
    .sort((a, b) => b.score - a.score); // Tri par score décroissant

  // Fonction pour déterminer la couleur en fonction du score
  const getScoreColor = (score: number) => {
    if (score <= 100) return '#e57373'; // Rouge
    if (score <= 200) return '#ffb74d'; // Orange
    if (score <= 300) return '#fff176'; // Jaune
    if (score <= 400) return '#81c784'; // Vert clair
    return '#66bb6a'; // Vert
  };

  // Personnalisation du tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '10px', 
          border: '1px solid #ccc',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: 0 }}>Score moyen: <strong>{data.score}/500</strong></p>
          <p style={{ margin: 0 }}>
            Niveau: <strong>{
              data.score <= 100 ? 'Niveau 1 (Initial)' :
              data.score <= 200 ? 'Niveau 2 (Basique)' :
              data.score <= 300 ? 'Niveau 3 (Défini)' :
              data.score <= 400 ? 'Niveau 4 (Géré)' :
              'Niveau 5 (Optimisé)'
            }</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis 
          domain={[0, 500]}
          label={{ value: 'Score moyen', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="score" name="Score de maturité moyen">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
          ))}
          <LabelList dataKey="score" position="top" formatter={(value: any) => `${value}`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OrganisationChart;