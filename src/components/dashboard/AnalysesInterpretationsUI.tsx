import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Alert,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TableSortLabel,
  TablePagination,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import BusinessIcon from '@mui/icons-material/Business';
import AppsTwoToneIcon from '@mui/icons-material/AppsTwoTone';
import EntrepriseScoresPanel from './EntrepriseScoresPanel';
import { StatCard } from '../dashboard/StatsCard';
import { AnalysesInterpretationsUIProps, TabPanelProps } from '../../types/AnalysesTypes';
import { getNiveauColor, formatDate } from '../../utils/AnalyseUtils';

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export const AnalysesInterpretationsUI: React.FC<AnalysesInterpretationsUIProps> = ({
  loading,
  error,
  applications,
  entreprises,
  selectedApplication,
  selectedEntreprise,
  analyses,
  selectedAnalyse,
  interpretation,
  historique,
  filteredHistorique,
  tabValue,
  selectedThematique,
  openDialog,
  newAnalyseData,
  interpretationsSummary,
  page,
  rowsPerPage,
  order,
  orderBy,
  searchTerm,
  filters,
  showFilters,
  uniqueThematiques,
  handleApplicationChange,
  handleEntrepriseChange,
  handleAnalyseChange,
  handleThematiqueChange,
  handleTabChange,
  handleOpenNewAnalyseDialog,
  handleCloseDialog,
  addThematique,
  updateThematique,
  removeThematique,
  createNewAnalyse,
  calculateNewAnalyse,
  getScoreGlobal,
  prepareHistoriqueData,
  handleChangePage,
  handleChangeRowsPerPage,
  handleRequestSort,
  getFilteredData,
  getUniqueValues,
  setSearchTerm,
  setFilters,
  setShowFilters,
  fetchAllInterpretations,
  fetchAnalysesByApplication,
  fetchAnalysesByEntreprise,
  fetchHistoriqueByEntreprise,
}) => {
  const [viewMode, setViewMode] = useState<'application' | 'entreprise'>(
    selectedApplication ? 'application' : selectedEntreprise ? 'entreprise' : 'application'
  );
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (selectedApplication && !selectedEntreprise) setViewMode('application');
    else if (selectedEntreprise && !selectedApplication) setViewMode('entreprise');
  }, [selectedApplication, selectedEntreprise]);

  const toggleViewMode = () => {
    if (viewMode === 'application') {
      setViewMode('entreprise');
      if (selectedApplication) {
        const app = applications.find(a => a.id_application === selectedApplication);
        if (app?.id_entreprise) {
          handleEntrepriseChange({ target: { value: app.id_entreprise } } as any);
        }
      }
    } else {
      setViewMode('application');
      if (selectedEntreprise && !selectedApplication) {
        const appsOfEntreprise = applications.filter(a => a.id_entreprise === selectedEntreprise);
        if (appsOfEntreprise.length > 0) {
          handleApplicationChange({ target: { value: appsOfEntreprise[0].id_application } } as any);
        }
      }
    }
  };

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <Paper sx={{ p: 1 }}>
          <Typography>{`Thématique: ${payload[0].payload.thematique}`}</Typography>
          <Typography>{`Score: ${payload[0].value}`}</Typography>
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Grid container spacing={3}>
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography component="h1" variant="h5" color="primary">
                Analyses et Interprétations de Maturité
              </Typography>
              <Box>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && toggleViewMode()}
                  color="primary"
                  sx={{ mr: 2 }}
                >
                  <ToggleButton value="application" startIcon={<AppsTwoToneIcon />}>
                    Vue Application
                  </ToggleButton>
                  <ToggleButton value="entreprise" startIcon={<BusinessIcon />}>
                    Vue Entreprise
                  </ToggleButton>
                </ToggleButtonGroup>
                {viewMode === 'application' && (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleOpenNewAnalyseDialog}
                      sx={{ mr: 1 }}
                    >
                      Nouvelle Analyse
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={calculateNewAnalyse}
                      startIcon={<CalculateIcon />}
                    >
                      Calculer Analyse
                    </Button>
                  </>
                )}
                {viewMode === 'entreprise' && selectedEntreprise && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => fetchAnalysesByEntreprise(selectedEntreprise)}
                    startIcon={<CalculateIcon />}
                  >
                    Calculer Scores
                  </Button>
                )}
              </Box>
            </Box>

            <Autocomplete
              options={entreprises}
              getOptionLabel={(option) => option.nom_entreprise}
              value={entreprises.find(e => e.id_entreprise === selectedEntreprise) || null}
              onChange={(e, newValue) => handleEntrepriseChange({ target: { value: newValue?.id_entreprise || '' } } as any)}
              renderInput={(params) => <TextField {...params} label="Entreprise" />}
              sx={{ mb: 2 }}
            />

            {(viewMode === 'application' || selectedEntreprise) && (
              <Autocomplete
                options={applications.filter(app => !selectedEntreprise || app.id_entreprise === selectedEntreprise)}
                getOptionLabel={(option) => option.nom_application}
                value={applications.find(a => a.id_application === selectedApplication) || null}
                onChange={(e, newValue) => handleApplicationChange({ target: { value: newValue?.id_application || '' } } as any)}
                renderInput={(params) => <TextField {...params} label="Application" />}
                disabled={loading}
              />
            )}
          </Paper>
        </Grid>

        {viewMode === 'entreprise' && selectedEntreprise ? (
          <Grid xs={12}>
            <EntrepriseScoresPanel entrepriseId={selectedEntreprise} />
          </Grid>
        ) : (
          <>
            {selectedAnalyse && (
              <Grid xs={12} md={4}>
                <StatCard
                  title="Score Global"
                  value={getScoreGlobal()}
                  variant="primary"
                  subtitle="Maturité"
                />
              </Grid>
            )}

            <Grid xs={12}>
              <Paper sx={{ width: '100%', mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
                  <Typography variant="h6">Récapitulatif des analyses</Typography>
                  <Box display="flex" alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mr: 2 }}
                    />
                    <Button startIcon={<FilterListIcon />} onClick={() => setShowFilters(true)}>
                      Filtres
                    </Button>
                    <IconButton onClick={fetchAllInterpretations}>
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Drawer anchor="right" open={showFilters} onClose={() => setShowFilters(false)}>
                  <Box sx={{ width: 300, p: 2 }}>
                    <Typography variant="h6" gutterBottom>Filtres</Typography>
                    <Autocomplete
                      options={getUniqueValues('nom_application')}
                      value={filters.application}
                      onChange={(e, newValue) => setFilters({ ...filters, application: newValue || '' })}
                      renderInput={(params) => <TextField {...params} label="Application" />}
                      sx={{ mb: 2 }}
                    />
                    <Autocomplete
                      options={getUniqueValues('niveau_global')}
                      value={filters.niveau}
                      onChange={(e, newValue) => setFilters({ ...filters, niveau: newValue || '' })}
                      renderInput={(params) => <TextField {...params} label="Niveau" />}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Score min"
                      type="number"
                      value={filters.scoreMin}
                      onChange={(e) => setFilters({ ...filters, scoreMin: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Score max"
                      type="number"
                      value={filters.scoreMax}
                      onChange={(e) => setFilters({ ...filters, scoreMax: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      onClick={() => setFilters({ application: '', niveau: '', organisation: '', scoreMin: '', scoreMax: '' })}
                    >
                      Réinitialiser
                    </Button>
                  </Box>
                </Drawer>

                <TableContainer sx={{ maxHeight: 440 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'nom_application'}
                            direction={orderBy === 'nom_application' ? order : 'asc'}
                            onClick={() => handleRequestSort('nom_application')}
                          >
                            Application
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'id_entreprise'}
                            direction={orderBy === 'id_entreprise' ? order : 'asc'}
                            onClick={() => handleRequestSort('id_entreprise')}
                          >
                            Entreprise
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'score_global'}
                            direction={orderBy === 'score_global' ? order : 'asc'}
                            onClick={() => handleRequestSort('score_global')}
                          >
                            Score
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'niveau_global'}
                            direction={orderBy === 'niveau_global' ? order : 'asc'}
                            onClick={() => handleRequestSort('niveau_global')}
                          >
                            Niveau
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'date_analyse'}
                            direction={orderBy === 'date_analyse' ? order : 'asc'}
                            onClick={() => handleRequestSort('date_analyse')}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredData().map((interpretation) => {
                        const entreprise = entreprises.find(e => e.id_entreprise === interpretation.id_entreprise);
                        const entrepriseName = entreprise ? entreprise.nom_entreprise : 'Non spécifiée';
                        return (
                          <TableRow
                            hover
                            key={interpretation.id_analyse}
                            selected={selectedApplication === interpretation.id_application}
                            onClick={() => fetchAnalysesByApplication(interpretation.id_application)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>{interpretation.nom_application}</TableCell>
                            <TableCell>{entrepriseName}</TableCell>
                            <TableCell>
                              {typeof interpretation.score_global === 'number'
                                ? interpretation.score_global.toFixed(2)
                                : '0.00'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={interpretation.niveau_global}
                                color={getNiveauColor(interpretation.niveau_global)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{formatDate(interpretation.date_analyse)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                color={selectedApplication === interpretation.id_application ? 'secondary' : 'primary'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchAnalysesByApplication(interpretation.id_application);
                                }}
                              >
                                {selectedApplication === interpretation.id_application ? 'Sélectionnée' : 'Sélectionner'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {getFilteredData().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            Aucune analyse trouvée
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={interpretationsSummary.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Lignes par page:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
              </Paper>
            </Grid>

            {selectedAnalyse && (
              <>
                <Grid xs={12}>
                  <Card>
                    <CardHeader title="Répartition par Thématique" />
                    <CardContent>
                      {selectedAnalyse.thematiques?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <RadarChart
                            outerRadius={150}
                            data={selectedAnalyse.thematiques.map(theme => ({
                              thematique: theme.thematique,
                              score: theme.score || 0,
                              fullMark: 5,
                            }))}
                          >
                            <PolarGrid />
                            <PolarAngleAxis dataKey="thematique" />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#0B4E87"
                              fill="#0B4E87"
                              fillOpacity={0.6}
                            />
                            <Legend />
                            <RechartsTooltip content={<CustomRadarTooltip />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography align="center">Aucune donnée de thématique disponible</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid xs={12}>
                  <Paper sx={{ width: '100%' }}>
                    <Tabs
                      value={tabValue}
                      onChange={handleTabChange}
                      indicatorColor="primary"
                      textColor="primary"
                      variant="fullWidth"
                    >
                      <Tab label="Interprétation" />
                      <Tab label="Détails par Thématique" />
                      <Tab label="Historique" />
                      <Tab label="Analyses Précédentes" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                      {interpretation ? (
                        <Grid container spacing={2}>
                          <Grid xs={12}>
                            <Card>
                              <CardHeader
                                title="Niveau de Maturité"
                                subheader={interpretation.niveau}
                                action={
                                  <Chip
                                    label={interpretation.niveau}
                                    color={getNiveauColor(interpretation.niveau)}
                                    size="medium"
                                  />
                                }
                              />
                              <CardContent>
                                <Typography variant="body1" paragraph>
                                  {interpretation.description}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid xs={12}>
                            <Card>
                              <CardHeader title="Recommandations" />
                              <CardContent>
                                <Typography variant="body1" paragraph>
                                  {interpretation.recommandations}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      ) : (
                        <Alert severity="info">
                          Aucune interprétation disponible.
                        </Alert>
                      )}
                    </TabPanel>
                    {/* Autres onglets inchangés */}
                  </Paper>
                </Grid>
              </>
            )}
          </>
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Créer une nouvelle analyse</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Application: {applications.find(app => app.id_application === selectedApplication)?.nom_application || 'Non sélectionnée'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Thématiques et Scores</Typography>
            {newAnalyseData.thematiques.map((theme, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                <Grid xs={5}>
                  <TextField
                    fullWidth
                    label="Thématique"
                    value={theme.thematique}
                    onChange={(e) => updateThematique(index, 'thematique', e.target.value)}
                  />
                </Grid>
                <Grid xs={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Score"
                    value={theme.score}
                    inputProps={{ min: 0, max: 5, step: 0.1 }}
                    onChange={(e) => updateThematique(index, 'score', parseFloat(e.target.value))}
                  />
                </Grid>
                <Grid xs={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Nombre de réponses"
                    value={theme.nombre_reponses}
                    inputProps={{ min: 0, step: 1 }}
                    onChange={(e) => updateThematique(index, 'nombre_reponses', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid xs={1}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeThematique(index)}
                    sx={{ height: '100%' }}
                  >
                    X
                  </Button>
                </Grid>
              </Grid>
            ))}
            <Button variant="outlined" onClick={addThematique} sx={{ mt: 1 }}>
              Ajouter une thématique
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            onClick={() => {
              createNewAnalyse().then(() =>
                setSnackbar({ open: true, message: 'Analyse créée avec succès', severity: 'success' })
              ).catch(() =>
                setSnackbar({ open: true, message: 'Erreur lors de la création', severity: 'error' })
              );
            }}
            variant="contained"
            color="primary"
            disabled={newAnalyseData.thematiques.length === 0}
          >
            Créer l'analyse
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AnalysesInterpretationsUI;