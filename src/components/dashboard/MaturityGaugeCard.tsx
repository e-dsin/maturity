// src/components/dashboard/MaturityGaugeCard.tsx
interface MaturityGaugeCardProps {
    title: string;
    score: number;
    maxScore: number;
    details?: {
      label: string;
      value: number;
    }[];
  }
  
  const MaturityGaugeCard: React.FC<MaturityGaugeCardProps> = ({ 
    title, 
    score, 
    maxScore, 
    details 
  }) => {
    // Calcul du pourcentage pour la gauge
    const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
    
    // Déterminer la couleur en fonction du score
    const getColor = () => {
      if (percentage < 30) return 'danger';
      if (percentage < 70) return 'warning';
      return 'success';
    };
    
    const getColorClass = (type: string) => {
      if (type === 'bg') {
        if (percentage < 30) return 'bg-danger-500';
        if (percentage < 70) return 'bg-warning-500';
        return 'bg-success-500';
      } else if (type === 'text') {
        if (percentage < 30) return 'text-danger-700';
        if (percentage < 70) return 'text-warning-700';
        return 'text-success-700';
      } else if (type === 'bg-light') {
        if (percentage < 30) return 'bg-danger-100';
        if (percentage < 70) return 'bg-warning-100';
        return 'bg-success-100';
      }
      return '';
    };
  
    // Fonction pour obtenir une description du niveau de maturité
    const getMaturityLevel = () => {
      if (percentage < 20) return 'Initial';
      if (percentage < 40) return 'Défini';
      if (percentage < 60) return 'Géré';
      if (percentage < 80) return 'Optimisé';
      return 'Excellence';
    };
    
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-semibold text-primary-900">{title}</h3>
          <div className="flex flex-col items-end">
            <div className={`${getColorClass('text')} ${getColorClass('bg-light')} px-2.5 py-1 rounded-full text-sm font-medium`}>
              {score}/{maxScore}
            </div>
            <span className="text-xs text-primary-700 mt-1">{getMaturityLevel()}</span>
          </div>
        </div>
        
        <div className="relative pt-1 mb-6">
          <div className="w-full h-2 bg-primary-400 rounded-full">
            <div 
              className={`h-full ${getColorClass('bg')} rounded-full transition-all duration-500 ease-in-out`} 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-primary-700">0</span>
            <span className="text-xs text-primary-700">{maxScore/2}</span>
            <span className="text-xs text-primary-700">{maxScore}</span>
          </div>
        </div>
        
        {details && details.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-primary-900 mb-2">Détail par thématique</h4>
            {details.map((detail, index) => {
              const detailPercentage = (detail.value / maxScore) * 100;
              let detailColorClass = 'bg-danger-500';
              
              if (detailPercentage >= 70) {
                detailColorClass = 'bg-success-500';
              } else if (detailPercentage >= 30) {
                detailColorClass = 'bg-warning-500';
              }
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-700 truncate pr-2">{detail.label}</span>
                    <span className="font-medium text-primary-900">{detail.value}/{maxScore}</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary-400 rounded-full">
                    <div 
                      className={`h-full ${detailColorClass} rounded-full`} 
                      style={{ width: `${(detail.value / maxScore) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  export default MaturityGaugeCard;