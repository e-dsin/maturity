// server.js
const jsonServer = require('json-server');
const path = require('path');
const fs = require('fs');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();

// Définir le port
const PORT = process.env.PORT || 3001;

// Déterminer le chemin du fichier de données
const dataFilePath = path.join(__dirname, 'data', 'all.json');

// Vérifier que le fichier existe
if (!fs.existsSync(dataFilePath)) {
  console.error('Erreur: Le fichier de données n\'existe pas: ' + dataFilePath);
  console.error('Veuillez d\'abord générer les données avec la commande:');
  console.error('npm run generate-data');
  process.exit(1);
}

// Initialiser le routeur avec les données
const router = jsonServer.router(dataFilePath);

// Logger personnalisé
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware standard de json-server
server.use(middlewares);

// Convertir les ID de requête en chaînes lorsque c'est nécessaire
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Assurez-vous que les ID sont des chaînes
    Object.keys(req.body).forEach(key => {
      if (key.toLowerCase().includes('id') && typeof req.body[key] === 'number') {
        req.body[key] = req.body[key].toString();
      }
    });
  }
  next();
});

// Ajouter des routes personnalisées
server.get('/api/acteurs/organisation/:organisation', (req, res) => {
  const organisation = req.params.organisation;
  const acteurs = router.db.get('acteurs').filter({ Organisation: organisation }).value();
  res.json(acteurs);
});

server.get('/api/acteurs/role/:role', (req, res) => {
  const role = req.params.role;
  const acteurs = router.db.get('acteurs').filter({ Role: role }).value();
  res.json(acteurs);
});

server.get('/api/applications/statut/:statut', (req, res) => {
  const statut = req.params.statut;
  const applications = router.db.get('applications').filter({ Statut: statut }).value();
  res.json(applications);
});

server.get('/api/applications/type/:type', (req, res) => {
  const type = req.params.type;
  const applications = router.db.get('applications').filter({ Type: type }).value();
  res.json(applications);
});

server.get('/api/applications/hebergement/:hebergement', (req, res) => {
  const hebergement = req.params.hebergement;
  const applications = router.db.get('applications').filter({ Hebergement: hebergement }).value();
  res.json(applications);
});

server.get('/api/questionnaires/thematique/:thematique', (req, res) => {
  const thematique = req.params.thematique;
  const questionnaires = router.db.get('questionnaires').filter({ Thematique: thematique }).value();
  res.json(questionnaires);
});

server.get('/api/questionnaires/fonction/:fonction', (req, res) => {
  const fonction = req.params.fonction;
  const questionnaires = router.db.get('questionnaires').filter({ Fonction: fonction }).value();
  res.json(questionnaires);
});

server.get('/api/questions/questionnaire/:idQuestionnaire', (req, res) => {
  const idQuestionnaire = req.params.idQuestionnaire;
  const questions = router.db.get('questions').filter({ IdQuestionnaire: idQuestionnaire }).value();
  res.json(questions);
});

server.get('/api/formulaires/acteur/:idActeur', (req, res) => {
  const idActeur = req.params.idActeur;
  const formulaires = router.db.get('formulaires').filter({ IdActeur: idActeur }).value();
  res.json(formulaires);
});

server.get('/api/formulaires/application/:idApplication', (req, res) => {
  const idApplication = req.params.idApplication;
  const formulaires = router.db.get('formulaires').filter({ IdApplication: idApplication }).value();
  res.json(formulaires);
});

server.get('/api/formulaires/questionnaire/:idQuestionnaire', (req, res) => {
  const idQuestionnaire = req.params.idQuestionnaire;
  const formulaires = router.db.get('formulaires').filter({ IdQuestionnaire: idQuestionnaire }).value();
  res.json(formulaires);
});

server.get('/api/formulaires/daterange/:startDate/:endDate', (req, res) => {
  const startDate = req.params.startDate;
  const endDate = req.params.endDate;
  
  const formulaires = router.db.get('formulaires').filter(formulaire => {
    const date = formulaire.DateCreation;
    return date >= startDate && date <= endDate;
  }).value();
  
  res.json(formulaires);
});

server.get('/api/reponses/formulaire/:idFormulaire', (req, res) => {
  const idFormulaire = req.params.idFormulaire;
  const reponses = router.db.get('reponses').filter({ IdFormulaire: idFormulaire }).value();
  res.json(reponses);
});

server.get('/api/reponses/question/:idQuestion', (req, res) => {
  const idQuestion = req.params.idQuestion;
  const reponses = router.db.get('reponses').filter({ IdQuestion: idQuestion }).value();
  res.json(reponses);
});

server.post('/api/reponses/batch', (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Les données doivent être un tableau de réponses' });
  }
  
  const newReponses = req.body.map(reponse => {
    // Générer un ID pour chaque réponse
    const { v4: uuidv4 } = require('uuid');
    reponse.IdReponse = uuidv4();
    return reponse;
  });
  
  // Ajouter les réponses à la base
  newReponses.forEach(reponse => {
    router.db.get('reponses').push(reponse).write();
  });
  
  res.status(201).json(newReponses);
});

// Routes pour les analyses
server.get('/api/analyses/maturity', (req, res) => {
  const maturityAnalyses = router.db.get('maturityAnalyses').value();
  res.json(maturityAnalyses);
});

server.get('/api/analyses/maturity/application/:idApplication', (req, res) => {
  const idApplication = req.params.idApplication;
  const maturityAnalysis = router.db.get('maturityAnalyses')
    .find(analysis => analysis.application.IdApplication === idApplication)
    .value();
  
  if (!maturityAnalysis) {
    return res.status(404).json({ error: 'Analyse de maturité non trouvée' });
  }
  
  res.json(maturityAnalysis);
});

server.get('/api/analyses/thematiques', (req, res) => {
  const thematiqueScores = router.db.get('thematiqueScores').value();
  res.json(thematiqueScores);
});

server.get('/api/analyses/thematiques/:thematique', (req, res) => {
  const thematique = req.params.thematique;
  const thematiqueScore = router.db.get('thematiqueScores')
    .find({ thematique })
    .value();
  
  if (!thematiqueScore) {
    return res.status(404).json({ error: 'Score thématique non trouvé' });
  }
  
  res.json(thematiqueScore);
});

// Utiliser le routeur JSON Server pour les routes standard REST
server.use('/api', router);

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`JSON Server est en cours d'exécution sur http://localhost:${PORT}`);
  console.log(`API disponible à http://localhost:${PORT}/api`);
});