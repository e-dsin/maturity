//
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/dashboard/StatsCard';
import api from '../../services/api';

const getNiveauColor = (score) => {
  if (score >= 4) return 'success';
  if (score >= 3) return 'info';
  if (score >= 2) return 'warning';
  return 'error';
};

const getNiveauLabel = (score) => {
  if (score >= 4) return 'Optimisé';
  if (score >= 3) return 'Mesuré';
  if (score >= 2) return 'Défini';
  if (score >= 1) return 'Initial';
  return 'Non défini';
};

const EntrepriseScoresPanel = ({ entrepriseId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [updatingScore, setUpdatingScore] = useState(false);

  const fetchEntrepriseData = async () => {
    if (!entrepriseId) return;
    setLoading(true);
    setError(null);
    try {
      const [entrepriseData, analysesResponse, historiqueResponse] = await Promise.all([
        api.get(`/entreprises/${entrepriseId}`),
        api.get(`/analyses/entreprise/${entrepriseId}`),
        api.get(`/historique/entreprise/${entrepriseId}`)
      ]);
      setEntreprise(entrepriseData);
      setAnalyses(Array.isArray(analysesResponse) ? analysesResponse : analysesResponse.data || []);
      setHistorique(historiqueResponse.historique_global || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des données:', err);
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  const recalculateScore = async () => {
    if (!entrepriseId) return;
    setUpdatingScore(true);
    setError(null);
    try {
      await api.post(`/entreprises/${entrepriseId}/calculer`);
      await fetchEntrepriseData();
    } catch (err) {
      console.error('Erreur lors du recalcul:', err);
      setError('Impossible de recalculer le score.');
    } finally {
      setUpdatingScore(false);
    }
  };

  useEffect(() => {
    fetchEntrepriseData();
  }, [entrepriseId]);

  const prepareChartData = () => {
    if (!historique.length) return [];
    return [...historique]
      .sort((a, b) => new Date(a.date_mesure) - new Date(b.date_mesure))
      .map(item => ({
        date: new Date(item.date_mesure).toLocaleDateString('fr-FR'),
        score: item.score_global || 0,
      }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (!entreprise) {
    return <Alert severity="info">Aucune entreprise sélectionnée.</Alert>;
  }

  const scoreGlobal = entreprise.score_global || 0;
  const niveauLabel = getNiveauLabel(scoreGlobal);
  const niveauColor = getNiveauColor(scoreGlobal);
  const chartData = prepareChartData();

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Scores de maturité - {entreprise.nom_entreprise}</Typography>
            <Tooltip title="Recalculer le score">
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={recalculateScore}
                disabled={updatingScore}
              >
                {updatingScore ? 'Calcul en cours...' : 'Recalculer'}
              </Button>
            </Tooltip>
          </Box>
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Score Global"
              value={typeof scoreGlobal === 'number' ? scoreGlobal.toFixed(2) : '0.00'}
              variant="primary"
              subtitle={<Chip label={niveauLabel} color={niveauColor} />}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            {chartData.length > 1 ? (
              <Box height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0B4E87"
                      name="Score global"
                      activeDot={{ r: 8, fill: '#0B4E87' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height={250}>
                <Typography color="text.secondary">
                  Pas assez de données historiques.
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Analyses des applications ({analyses.length})
            </Typography>
            {analyses.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Application</TableCell>
                      <TableCell>Score Global</TableCell>
                      <TableCell>Date d'analyse</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyses.map((analyse) => (
                      <TableRow key={analyse.id_analyse}>
                        <TableCell>{analyse.nom_application || 'Non spécifié'}</TableCell>
                        <TableCell>
                          {typeof analyse.score_global === 'number' ? analyse.score_global.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell>
                          {new Date(analyse.date_analyse).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate(`/analyses-interpretations/${analyse.id_application}`)}
                          >
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">Aucune analyse disponible pour cette entreprise.</Alert>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EntrepriseScoresPanel;