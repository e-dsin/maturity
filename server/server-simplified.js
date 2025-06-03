// server/server-simplified.js - Version simplifiée pour Swagger
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const setupSwagger = require('./swagger-config');

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurer Swagger
setupSwagger(app);

// Route de santé pour vérifier que le serveur fonctionne
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Le serveur fonctionne correctement' });
});

// Routes API simulées pour la documentation
app.get('/api/applications', (req, res) => {
  res.json([
    { 
      idApplication: '1', 
      nomApplication: 'CRM Finance', 
      statut: 'Production',
      hebergement: 'Cloud' 
    },
    { 
      idApplication: '2', 
      nomApplication: 'ERP Commercial', 
      statut: 'Production',
      hebergement: 'On-Premise' 
    }
  ]);
});

app.get('/api/applications/:id', (req, res) => {
  res.json({ 
    idApplication: req.params.id, 
    nomApplication: req.params.id === '1' ? 'CRM Finance' : 'ERP Commercial',
    statut: 'Production',
    hebergement: req.params.id === '1' ? 'Cloud' : 'On-Premise',
    architectureLogicielle: req.params.id === '1' ? 'Microservices' : 'Monolithique',
    dateMiseEnProd: req.params.id === '1' ? '2024-01-15' : '2023-06-10',
    editeur: req.params.id === '1' ? 'InternalDev' : 'SAP',
    language: req.params.id === '1' ? 'JavaScript' : 'Java',
    description: req.params.id === '1' 
      ? 'Application de gestion de la relation client pour le département finance' 
      : 'Solution ERP pour la gestion commerciale'
  });
});

app.get('/api/interpretation/application/:id', (req, res) => {
  res.json({
    idAnalyse: req.params.id + '-1',
    idApplication: req.params.id,
    nomApplication: req.params.id === '1' ? 'CRM Finance' : 'ERP Commercial',
    scoreGlobal: req.params.id === '1' ? 375 : 320,
    interpretation: {
      niveau: req.params.id === '1' ? 'Avancé' : 'Intermédiaire',
      description: req.params.id === '1' ? 'Bon niveau de maturité' : 'Niveau moyen de maturité',
      recommandations: req.params.id === '1' ? 'Continuer l\'intégration des tests' : 'Renforcer la sécurité',
      score: req.params.id === '1' ? 375 : 320
    },
    thematiques: [
      { thematique: 'Sécurité', score: req.params.id === '1' ? 80 : 60 },
      { thematique: 'Automatisation', score: req.params.id === '1' ? 70 : 65 },
      { thematique: 'Monitoring', score: req.params.id === '1' ? 65 : 55 },
      { thematique: 'Architecture', score: req.params.id === '1' ? 85 : 75 },
      { thematique: 'Collaboration', score: req.params.id === '1' ? 75 : 65 }
    ],
    dateAnalyse: new Date().toISOString()
  });
});

// Autres routes simulées
app.get('/api/stats/overview', (req, res) => {
  res.json({
    totalApplications: 8,
    totalQuestionnaires: 15,
    totalFormulaires: 24,
    completionRate: 67
  });
});

// En mode production, servir les fichiers statiques
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
}

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Documentation API disponible à: http://localhost:${PORT}/api-docs`);
});