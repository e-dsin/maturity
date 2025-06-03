// src/components/charts/ThematiqueBreakdownChart.tsx
import React from 'react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { ThematiqueResult } from '../../services/interpretationService';

interface Props {
  data: ThematiqueResult[];
}

export const ThematiqueBreakdownChart: React.FC<Props> = ({ data }) => {
  // Formatage des données pour le graphique radar
  const formatChartData = (thematiques: ThematiqueResult[]) => {
    return thematiques.map(item => ({
      subject: item.thematique.split('&')[0].trim(), // Raccourcir les noms pour le graphique
      score: parseFloat(item.score.toFixed(1)),
      fullMark: getMaxScoreForThematique(item.thematique)
    }));
  };

  // Déterminer le score maximum pour chaque thématique
  const getMaxScoreForThematique = (thematique: string): number => {
    if (thematique.includes('Opérations & CI/CD')) return 80;
    if (thematique.includes('Gestion des vulnérabilités') || 
        thematique.includes('Satisfaction Client')) return 60;
    return 50; // Score par défaut
  };

  // Données formatées pour le graphique
  const chartData = formatChartData(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={30} domain={[0, 80]} /> {/* 80 est le score max possible */}
        <Radar
          name="Score"
          dataKey="score"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.6}
        />
        <Tooltip 
          formatter={(value, name, props) => [
            `${value} / ${props.payload.fullMark}`, 
            'Score'
          ]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default ThematiqueBreakdownChart;