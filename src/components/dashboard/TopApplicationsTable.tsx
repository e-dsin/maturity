// src/components/dashboard/TopApplicationsTable.tsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Typography } from '@mui/material';

interface Application  {
  IdApplication: string;
  NomApplication: string;
  Statut: 'Projet' | 'Run';
  Type: 'Build' | 'Buy';
  score: number;
  formulairesCount: number;
}

interface TopApplicationsTableProps {
  applications: Application [];
}

const TopApplicationsTable: React.FC<TopApplicationsTableProps> = ({ applications = [] }) => {
  // Fonction pour déterminer la couleur selon le score
  const getScoreColor = (score) => {
    if (score <= 100) return '#e57373'; // Rouge
    if (score <= 200) return '#ffb74d'; // Orange
    if (score <= 300) return '#fff176'; // Jaune
    if (score <= 400) return '#81c784'; // Vert clair
    return '#66bb6a'; // Vert
  };

  // Fonction pour déterminer le niveau de maturité selon le score
  const getMaturityLevel = (score) => {
    if (score <= 100) return 'Niveau 1: Initial';
    if (score <= 200) return 'Niveau 2: Basique';
    if (score <= 300) return 'Niveau 3: Défini';
    if (score <= 400) return 'Niveau 4: Géré';
    return 'Niveau 5: Optimisé';
  };
    
      
  return (
    <TableContainer>
      {!applications || applications.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Aucune application à afficher
        </Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Application</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Niveau de maturité</TableCell>
              <TableCell>Progression</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.idApplication || `app-${Math.random()}`}>
                <TableCell>
                  <RouterLink 
                    to={`/interpretation/application/${app.idApplication}`}
                    style={{ textDecoration: 'none', color: '#1976d2' }}
                  >
                    {app.NomApplication || 'Application sans nom'}
                  </RouterLink>
                </TableCell>
                <TableCell>{Math.round(app.scoreGlobal || 0)}/500</TableCell>
                <TableCell>{getMaturityLevel(app.scoreGlobal)}</TableCell>
                <TableCell style={{ width: '30%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(app.scoreGlobal / 500) * 100} 
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getScoreColor(app.scoreGlobal),
                        borderRadius: 5,
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
};

export default TopApplicationsTable;