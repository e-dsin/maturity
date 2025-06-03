import React from 'react';
import StyledTable from './StyledTable';
import { Questionnaire, Question } from '../../types/interface';

interface QuestionsAdminTableProps {
  questions: Question[];
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
}

const QuestionsAdminTable: React.FC<QuestionsAdminTableProps> = ({
  questions,
  onEditQuestion,
  onDeleteQuestion
}) => {
  // Regrouper les questions par thématique
  const questionsByTheme = questions.reduce((acc, question) => {
    if (!acc[question.thematique]) {
      acc[question.thematique] = [];
    }
    acc[question.thematique].push(question);
    return acc;
  }, {} as {[key: string]: Question[]});
  
  // Trier les questions dans chaque groupe
  Object.keys(questionsByTheme).forEach(theme => {
    questionsByTheme[theme].sort((a, b) => a.ordre - b.ordre);
  });

  const columns = [
    {
      key: 'ordre',
      title: '#',
      width: '50px',
      className: 'font-medium text-center',
      render: (item: Question) => <span className="text-gray-700">{item.ordre}</span>
    },
    {
      key: 'texte',
      title: 'Question',
      width: '40%',
      render: (item: Question) => <div className="font-medium text-gray-800">{item.texte}</div>
    },
    {
      key: 'ponderation',
      title: 'Pond.',
      width: '80px',
      className: 'text-center',
      render: (item: Question) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-400 text-primary-900 font-bold">
          {item.ponderation}
        </span>
      )
    },
    {
      key: 'niveaux',
      title: 'Niveaux',
      render: (item: Question) => (
        <div className="flex text-xs space-x-1">
          <div className="rounded px-2 py-1 bg-danger-50 border border-danger-100 text-danger-800">
            <span className="font-medium">N1:</span> {item.niveau1.substring(0, 30)}...
          </div>
          <div className="rounded px-2 py-1 bg-warning-50 border border-warning-100 text-warning-800">
            <span className="font-medium">N3:</span> {item.niveau3.substring(0, 30)}...
          </div>
          <div className="rounded px-2 py-1 bg-success-50 border border-success-100 text-success-800">
            <span className="font-medium">N5:</span> {item.niveau5.substring(0, 30)}...
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '100px',
      render: (item: Question) => (
        <div className="flex justify-end space-x-2">
          <button 
            onClick={() => onEditQuestion(item)}
            className="p-1 rounded-full hover:bg-primary-50 text-primary-800"
            title="Modifier"
          >
            <span role="img" aria-label="Modifier">✏️</span>
          </button>
          <button 
            onClick={() => onDeleteQuestion(item.id_question)}
            className="p-1 rounded-full hover:bg-danger-50 text-danger-600"
            title="Supprimer"
          >
            <span role="img" aria-label="Supprimer">🗑️</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {Object.keys(questionsByTheme).map(theme => (
        <div key={theme} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-primary-700 text-white p-3 font-medium">
            {theme}
          </div>
          <StyledTable
            data={questionsByTheme[theme]}
            columns={columns}
            hoverable
            striped={false}
            bordered={false}
            className="border-none"
            headerClassName="bg-primary-50 text-primary-800"
            onRowClick={onEditQuestion}
          />
        </div>
      ))}
    </div>
  );
};

// Tableau pour la liste des questionnaires
interface QuestionnairesListTableProps {
  questionnaires: Questionnaire[];
  onSelectQuestionnaire: (questionnaire: Questionnaire) => void;
  onDeleteQuestionnaire: (id: string) => void;
}

const QuestionnairesListTable: React.FC<QuestionnairesListTableProps> = ({
  questionnaires,
  onSelectQuestionnaire,
  onDeleteQuestionnaire
}) => {
  const columns = [
    {
      key: 'fonction',
      title: 'Questionnaire',
      render: (item: Questionnaire) => (
        <div>
          <div className="font-medium text-gray-800">{item.fonction}</div>
          <div className="text-xs text-gray-500">{item.thematique}</div>
        </div>
      )
    },
    {
      key: 'description',
      title: 'Description',
      render: (item: Questionnaire) => (
        <div className="text-sm text-gray-600 line-clamp-2">
          {item.description}
        </div>
      )
    },
    {
      key: 'date_creation',
      title: 'Création',
      width: '100px',
      className: 'text-sm text-gray-600',
      render: (item: Questionnaire) => (
        <span>{item.date_creation ? new Date(item.date_creation).toLocaleDateString() : '-'}</span>
      )
    },
    {
      key: 'actions',
      title: '',
      width: '80px',
      render: (item: Questionnaire) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteQuestionnaire(item.id_questionnaire);
            }}
            className="p-1 rounded-full hover:bg-danger-50 text-danger-600"
            title="Supprimer"
          >
            <span role="img" aria-label="Supprimer">🗑️</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <StyledTable
      data={questionnaires}
      columns={columns}
      onRowClick={onSelectQuestionnaire}
      striped
      hoverable
      bordered
      className="shadow-card"
      headerClassName="bg-secondary-500 text-secondary-900"
    />
  );
};

export { QuestionsAdminTable, QuestionnairesListTable };