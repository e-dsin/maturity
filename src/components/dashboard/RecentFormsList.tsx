// src/components/dashboard/RecentFormsList.jsx
import React from 'react';
import { Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const RecentFormsList = ({ forms = [] }) => {
  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Formulaires récents
      </Typography>
      
      {!forms || forms.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aucun formulaire récent à afficher
        </Typography>
      ) : (
        <List>
          {forms.map((form, index) => (
            <React.Fragment key={form.idFormulaire || form.id_formulaire || `form-${index}`}>
              <ListItem
                component={RouterLink}
                to={`/dashboard/forms/${form.idFormulaire || form.id_formulaire}`}
                sx={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  '&:hover': { bgcolor: 'action.hover' } 
                }}
              >
                <ListItemText
                  primary={form.nomApplication || form.application_nom || 'Application inconnue'}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        Par {form.acteurNom || form.acteur_nom || 'Utilisateur inconnu'} - 
                        Modifié le {form.dateModification || form.date_modification || 'Date inconnue'}
                      </Typography>
                      <br />
                      <Typography 
                        variant="body2" 
                        component="span"
                        sx={{ 
                          display: 'inline-block',
                          px: 1,
                          py: 0.5,
                          mt: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          bgcolor: form.statut === 'Validé' ? 'success.light' : 
                                  form.statut === 'Soumis' ? 'info.light' : 'warning.light',
                          color: form.statut === 'Validé' ? 'success.dark' : 
                                 form.statut === 'Soumis' ? 'info.dark' : 'warning.dark',
                        }}
                      >
                        {form.statut || 'Statut inconnu'}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < (forms.length - 1) && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </div>
  );
};

export default RecentFormsList;