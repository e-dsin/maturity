// src/mock/dbConnection.js
const { v4: uuidv4 } = require('uuid');

/**
 * Gère la connexion à la base de données pour le développement
 * en fournissant des données fictives
 */
class MockDbConnection {
  constructor() {
    this.connected = true;
    this.mockData = this.initMockData();
  }
  
  // Initialiser les données fictives
  initMockData() {
    return {
      acteurs: [
        { id_acteur: '1', nom_prenom: 'Jean Dupont', role: 'Admin', organisation: 'Direction Informatique' },
        { id_acteur: '2', nom_prenom: 'Marie Martin', role: 'User', organisation: 'Marketing' },
        { id_acteur: '3', nom_prenom: 'Sophie Petit', role: 'User', organisation: 'RH' },
        { id_acteur: '4', nom_prenom: 'Thomas Robert', role: 'Admin', organisation: 'Direction Informatique' },
        { id_acteur: '5', nom_prenom: 'Pierre Bernard', role: 'User', organisation: 'Finance' }
      ],
      applications: [
        {
          id_application: '1',
          nom_application: 'CRM Finance',
          statut: 'Production',
          type: 'Web',
          hebergement: 'Cloud',
          architecture_logicielle: 'Microservices',
          date_mise_en_prod: '2024-01-15',
          editeur: 'InternalDev',
          language: 'JavaScript',
          description: 'Application de gestion de la relation client pour le département finance'
        },
        {
          id_application: '2',
          nom_application: 'ERP Commercial',
          statut: 'Production',
          type: 'Web',
          hebergement: 'On-Premise',
          architecture_logicielle: 'Monolithique',
          date_mise_en_prod: '2023-06-10',
          editeur: 'SAP',
          language: 'Java',
          description: 'Solution ERP pour la gestion commerciale'
        }
      ],
      questionnaires: [
        {
          id_questionnaire: '1',
          fonction: 'Évaluation DevSecOps',
          thematique: 'DevSecOps',
          description: 'Questionnaire d\'évaluation de la maturité DevSecOps',
          date_creation: '2024-01-10'
        },
        {
          id_questionnaire: '2',
          fonction: 'Évaluation Agilité',
          thematique: 'Agilité',
          description: 'Questionnaire d\'évaluation de la maturité Agile',
          date_creation: '2024-02-15'
        }
      ],
      formulaires: [
        {
          id_formulaire: '1',
          id_acteur: '1',
          id_application: '1',
          id_questionnaire: '1',
          date_creation: '2025-04-01',
          date_modification: '2025-04-15',
          statut: 'Validé',
          progression: 100
        },
        {
          id_formulaire: '2',
          id_acteur: '2',
          id_application: '2',
          id_questionnaire: '2',
          date_creation: '2025-03-20',
          date_modification: '2025-04-10',
          statut: 'Soumis',
          progression: 100
        }
      ]
    };
  }
  
  async testConnection() {
    return this.connected;
  }
  
  async query(sql, params = []) {
    console.log(`[MOCK DB] Query: ${sql}`);
    console.log(`[MOCK DB] Params: ${JSON.stringify(params)}`);
    
    // Simuler un délai pour ressembler à une requête BD réelle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Analyse simple du SQL pour retourner les données appropriées
    if (sql.includes('SELECT') && sql.includes('acteurs')) {
      return [this.mockData.acteurs];
    }
    if (sql.includes('SELECT') && sql.includes('applications')) {
      return [this.mockData.applications];
    }
    if (sql.includes('SELECT') && sql.includes('questionnaires')) {
      return [this.mockData.questionnaires];
    }
    if (sql.includes('SELECT') && sql.includes('formulaires')) {
      return [this.mockData.formulaires];
    }
    
    // Par défaut, retourner un tableau vide
    return [[]];
  }
}

// Exporter l'instance du pool de connexion
module.exports = new MockDbConnection();