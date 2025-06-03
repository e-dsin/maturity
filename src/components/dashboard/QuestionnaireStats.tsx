// src/components/dashboard/QuestionnaireStats.jsx
import React from 'react';
import { Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

const QuestionnaireStats = ({ stats = [] }) => {
  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Statistiques des questionnaires
      </Typography>
      
      {!stats || stats.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aucune statistique disponible
        </Typography>
      ) : (
        <List>
          {stats.map((stat, index) => (
            <React.Fragment key={stat.idQuestionnaire || `stat-${index}`}>
              <ListItem>
                <ListItemText
                  primary={stat.fonction || 'Questionnaire'}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        Questions: {stat.numQuestions || stat.num_questions || 0} | 
                        Réponses: {stat.numReponses || stat.num_reponses || 0} | 
                        Utilisateurs: {stat.numUtilisateurs || stat.num_utilisateurs || 0}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < (stats.length - 1) && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </div>
  );
};

export default QuestionnaireStats;