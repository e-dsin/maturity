import React from 'react';

interface ScoreData {
  thematique: string;
  avg_score: number;
  count: number;
}

interface ScoresTableProps {
  scores: ScoreData[];
  className?: string;
}

const ScoresTable: React.FC<ScoresTableProps> = ({ scores, className = '' }) => {
  // Trier les scores par moyenne décroissante
  const sortedScores = [...scores].sort((a, b) => b.avg_score - a.avg_score);
  
  // Définir les couleurs de score en fonction de la valeur
  const getScoreColor = (score: number): string => {
    if (score >= 4) return 'bg-success-500';
    if (score >= 3) return 'bg-secondary-500';
    if (score >= 2) return 'bg-warning-500';
    return 'bg-danger-500';
  };
  
  // Définir le texte de score en fonction de la valeur
  const getScoreLabel = (score: number): string => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Bon';
    if (score >= 2.5) return 'Moyen';
    if (score >= 1.5) return 'À améliorer';
    return 'Critique';
  };

  // Classes de tableau
  const tableClasses = [
    'w-full',
    'overflow-hidden',
    'rounded-lg',
    'shadow-card',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={tableClasses}>
      <table className="w-full">
        <thead>
          <tr className="bg-primary-600 text-white">
            <th className="px-4 py-3 text-left font-medium">Thématique</th>
            <th className="px-4 py-3 text-center font-medium w-20">Score</th>
            <th className="px-4 py-3 text-center font-medium w-32">Évaluation</th>
            <th className="px-4 py-3 text-center font-medium w-40">Progression</th>
            <th className="px-4 py-3 text-right font-medium w-24">Réponses</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedScores.map((score, index) => {
            const scorePercentage = (score.avg_score / 5) * 100;
            const scoreColor = getScoreColor(score.avg_score);
            const scoreLabel = getScoreLabel(score.avg_score);
            
            return (
              <tr 
                key={score.thematique}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  {score.thematique}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-bold">{score.avg_score.toFixed(1)}</span>
                  <span className="text-gray-500 text-xs">/5</span>
                </td>
                <td className="px-4 py-3">
                  <span 
                    className={`
                      inline-block rounded-full px-3 py-1 text-xs font-medium text-white
                      ${scoreColor.replace('bg-', 'bg-')}
                    `}
                  >
                    {scoreLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${scoreColor}`}
                      style={{ width: `${scorePercentage}%` }}
                    ></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium">{score.count}</span>
                  <span className="text-gray-500 text-xs ml-1">resp.</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScoresTable;