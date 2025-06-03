// src/components/charts/ApplicationMaturityChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Typography, Box } from '@mui/material';

interface Application {
  id_application: string;
  nom_application: string;
  score_global: number;
  niveau_maturite?: string;
}

interface Props {
  applications: Application[];
}

export const ApplicationMaturityChart: React.FC<Props> = ({ applications }) => {
  // Pas de rendu si pas de données
  if (!applications || applications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="body1" color="text.secondary">
          Aucune donnée disponible pour le graphique
        </Typography>
      </Box>
    );
  }

  // Préparation des données pour le graphique
  const chartData = applications.map(app => ({
    name: app.nom_application.length > 20 
      ? app.nom_application.substring(0, 17) + '...' 
      : app.nom_application,
    score: app.score_global,
    fullName: app.nom_application // Pour l'affichage dans le tooltip
  })).sort((a, b) => b.score - a.score); // Tri par score décroissant

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
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.fullName}</p>
          <p style={{ margin: 0 }}>Score: <strong>{data.score}/500</strong></p>
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
          top: 20,
          right: 30,
          left: 20,
          bottom: 60 // Espace pour les noms d'applications
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end"
          interval={0}
          height={60}
        />
        <YAxis 
          domain={[0, 500]}
          label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="score" name="Score de maturité">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ApplicationMaturityChart;