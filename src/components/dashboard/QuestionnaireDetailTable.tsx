import React from 'react';
import StyledTable from './StyledTable';
import { Question } from '../../types/interface';

interface QuestionTableProps {
  questions: Question[];
  thematique: string;
  onEditQuestion?: (question: Question) => void;
}

const QuestionnaireDetailTable: React.FC<QuestionTableProps> = ({ 
  questions, 
  thematique,
  onEditQuestion
}) => {
  const columns = [
    {
      key: 'ordre',
      title: '#',
      width: '40px',
      className: 'font-medium text-center text-gray-700',
      render: (item: Question) => <span>{item.ordre}</span>
    },
    {
      key: 'texte',
      title: 'Question',
      className: 'font-medium text-gray-800',
      render: (item: Question) => (
        <div>
          <p>{item.texte}</p>
          <p className="text-xs text-gray-500 mt-1">Pondération: {item.ponderation}</p>
        </div>
      )
    },
    {
      key: 'niveaux',
      title: 'Niveaux de maturité',
      className: 'text-sm',
      render: (item: Question) => (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-danger-50 p-2 rounded border border-danger-100">
            <p className="font-medium text-danger-700 text-xs">Niveau 1</p>
            <p className="text-gray-700 text-xs">{item.niveau1}</p>
          </div>
          <div className="bg-warning-50 p-2 rounded border border-warning-100">
            <p className="font-medium text-warning-700 text-xs">Niveau 3</p>
            <p className="text-gray-700 text-xs">{item.niveau3}</p>
          </div>
          <div className="bg-success-50 p-2 rounded border border-success-100">
            <p className="font-medium text-success-700 text-xs">Niveau 5</p>
            <p className="text-gray-700 text-xs">{item.niveau5}</p>
          </div>
        </div>
      )
    },
    ...(onEditQuestion ? [{
      key: 'actions',
      title: '',
      width: '80px',
      render: (item: Question) => (
        <div className="flex justify-end">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEditQuestion(item);
            }}
            className="p-1 text-primary-800 hover:text-primary-600 rounded-full hover:bg-primary-50"
          >
            <span role="img" aria-label="Éditer">✏️</span>
          </button>
        </div>
      )
    }] : [])
  ];

  return (
    <div className="mb-8">
      <h3 className="font-medium text-lg text-primary-900 mb-3 pl-2 border-l-4 border-primary-500">
        {thematique}
      </h3>
      
      <StyledTable
        data={questions}
        columns={columns}
        hoverable
        striped
        compact
        className="shadow-md"
      />
    </div>
  );
};

export default QuestionnaireDetailTable;