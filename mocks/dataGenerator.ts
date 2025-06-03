// mocks/dataGenerator.ts
import { faker } from '@faker-js/faker/locale/fr';
import * as fs from 'fs';
import * as path from 'path';

// Types
export interface Acteur {
  IdActeur: string;
  NomPrenom: string;
  Role: string;
  Organisation: string;
  AncienneteRole: number;
}

export interface Application {
  IdApplication: string;
  NomApplication: string;
  Statut: 'Projet' | 'Run';
  Type: 'Build' | 'Buy';
  Hebergement: 'Cloud' | 'Prem' | 'Hybrid';
  ArchitectureLogicielle: 'ERP' | 'Multitenant SAAS' | 'MVC' | 'Monolithique';
  DateMiseEnProd: string;
  Language: string;
  Editeur: string;
}

export interface Questionnaire {
  IdQuestionnaire: string;
  Fonction: string;
  Thematique: string;
}

export interface Question {
  IdQuestion: string;
  IdQuestionnaire: string;
  Texte: string;
  Ponderation: number;
}

export interface Formulaire {
  IdFormulaire: string;
  IdActeur: string;
  IdApplication: string;
  IdQuestionnaire: string;
  DateCreation: string;
  DateModification: string;
}

export interface Reponse {
  IdReponse: string;
  IdFormulaire: string;
  IdQuestion: string;
  ValeurReponse: string;
  Score: number;
}

export interface MaturityAnalysis {
  application: Application;
  scores: {
    thematique: string;
    score: number;
  }[];
}

export interface ThematiqueScore {
  thematique: string;
  averageScore: number;
  totalResponses: number;
}

// Configuration des quantités
const CONFIG = {
  ACTEURS: 20,
  APPLICATIONS: 15,
  QUESTIONNAIRES: 5,
  QUESTIONS_PER_QUESTIONNAIRE: 8,
  FORMULAIRES: 30,
  REPONSES_PER_FORMULAIRE: 8, // Toutes les questions d'un questionnaire
};

// Types d'architectures logicielles disponibles
const ARCHITECTURES = ['ERP', 'Multitenant SAAS', 'MVC', 'Monolithique'];

// Langages de programmation courants
const LANGUAGES = ['Java', 'Python', 'JavaScript', 'TypeScript', 'C#', 'PHP', 'Go', 'Ruby', 'Swift'];

// Roles possibles pour les acteurs
const ROLES = ['Développeur', 'Chef de projet', 'Product Owner', 'Business Analyst', 'Architecte', 'DevOps', 'UX Designer', 'QA Engineer'];

// Organisations
const ORGANISATIONS = ['DSI', 'Direction Marketing', 'Direction Commerciale', 'Direction Financière', 'RH', 'R&D', 'Support Client'];

// Thématiques possibles pour les questionnaires
const THEMATIQUES = ['Sécurité', 'Performance', 'Maintenabilité', 'Évolutivité', 'UX/UI', 'Documentation', 'CI/CD', 'Conformité'];

// Fonctions possibles pour les questionnaires
const FONCTIONS = ['Évaluation technique', 'Audit de sécurité', 'Vérification de conformité', 'Mesure de satisfaction', 'Analyse des besoins'];

// Éditeurs de logiciels
const EDITEURS = ['Microsoft', 'Oracle', 'SAP', 'IBM', 'Salesforce', 'Adobe', 'ServiceNow', 'Workday', 'Atlassian', 'InterneDev'];

// Génère un ID unique
const generateId = () => faker.string.uuid();

// Génère une date entre 2015 et aujourd'hui
const generateDate = (start = new Date(2015, 0, 1), end = new Date()) => {
  return faker.date.between({ from: start, to: end }).toISOString().split('T')[0];
};

// Génération des acteurs
const generateActeurs = (count: number): Acteur[] => {
  const acteurs: Acteur[] = [];
  
  for (let i = 0; i < count; i++) {
    acteurs.push({
      IdActeur: generateId(),
      NomPrenom: faker.person.fullName(),
      Role: faker.helpers.arrayElement(ROLES),
      Organisation: faker.helpers.arrayElement(ORGANISATIONS),
      AncienneteRole: faker.number.int({ min: 1, max: 15 })
    });
  }
  
  return acteurs;
};

// Génération des applications
const generateApplications = (count: number): Application[] => {
  const applications: Application[] = [];
  
  for (let i = 0; i < count; i++) {
    applications.push({
      IdApplication: generateId(),
      NomApplication: `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${faker.number.int(999)}`,
      Statut: faker.helpers.arrayElement(['Projet', 'Run']),
      Type: faker.helpers.arrayElement(['Build', 'Buy']),
      Hebergement: faker.helpers.arrayElement(['Cloud', 'Prem', 'Hybrid']),
      ArchitectureLogicielle: faker.helpers.arrayElement(ARCHITECTURES as any),
      DateMiseEnProd: generateDate(),
      Language: faker.helpers.arrayElement(LANGUAGES),
      Editeur: faker.helpers.arrayElement(EDITEURS)
    });
  }
  
  return applications;
};

// Génération des questionnaires
const generateQuestionnaires = (count: number): Questionnaire[] => {
  const questionnaires: Questionnaire[] = [];
  
  for (let i = 0; i < count; i++) {
    questionnaires.push({
      IdQuestionnaire: generateId(),
      Fonction: faker.helpers.arrayElement(FONCTIONS),
      Thematique: faker.helpers.arrayElement(THEMATIQUES)
    });
  }
  
  return questionnaires;
};

// Génération des questions pour chaque questionnaire
const generateQuestions = (questionnaires: Questionnaire[], questionsPerQuestionnaire: number): Question[] => {
  const questions: Question[] = [];
  
  questionnaires.forEach(questionnaire => {
    for (let i = 0; i < questionsPerQuestionnaire; i++) {
      questions.push({
        IdQuestion: generateId(),
        IdQuestionnaire: questionnaire.IdQuestionnaire,
        Texte: faker.lorem.sentence({ min: 5, max: 15 }) + ' ?',
        Ponderation: faker.number.int({ min: 1, max: 5 })
      });
    }
  });
  
  return questions;
};

// Génération des formulaires
const generateFormulaires = (
  count: number,
  acteurs: Acteur[],
  applications: Application[],
  questionnaires: Questionnaire[]
): Formulaire[] => {
  const formulaires: Formulaire[] = [];
  
  for (let i = 0; i < count; i++) {
    const dateCreation = generateDate();
    const dateModification = generateDate(new Date(dateCreation), new Date());
    
    formulaires.push({
      IdFormulaire: generateId(),
      IdActeur: faker.helpers.arrayElement(acteurs).IdActeur,
      IdApplication: faker.helpers.arrayElement(applications).IdApplication,
      IdQuestionnaire: faker.helpers.arrayElement(questionnaires).IdQuestionnaire,
      DateCreation: dateCreation,
      DateModification: dateModification
    });
  }
  
  return formulaires;
};

// Génération des réponses
const generateReponses = (
  formulaires: Formulaire[],
  questions: Question[]
): Reponse[] => {
  const reponses: Reponse[] = [];
  
  formulaires.forEach(formulaire => {
    // Trouver les questions qui correspondent au questionnaire du formulaire
    const questionnaireQuestions = questions.filter(q => {
      return q.IdQuestionnaire === formulaire.IdQuestionnaire;
    });
    
    // Pour chaque question, générer une réponse
    questionnaireQuestions.forEach(question => {
      const valeur = faker.number.int({ min: 1, max: 5 }).toString();
      reponses.push({
        IdReponse: generateId(),
        IdFormulaire: formulaire.IdFormulaire,
        IdQuestion: question.IdQuestion,
        ValeurReponse: valeur,
        Score: parseInt(valeur) * question.Ponderation
      });
    });
  });
  
  return reponses;
};

// Génération des analyses de maturité
const generateMaturityAnalyses = (
  applications: Application[],
  formulaires: Formulaire[],
  reponses: Reponse[],
  questions: Question[],
  questionnaires: Questionnaire[]
): MaturityAnalysis[] => {
  const maturityAnalyses: MaturityAnalysis[] = [];
  
  applications.forEach(application => {
    // Formulaires associés à cette application
    const appFormulaires = formulaires.filter(f => f.IdApplication === application.IdApplication);
    
    // Calculer les scores par thématique
    const thematiquesScores: { [key: string]: { score: number, count: number } } = {};
    
    appFormulaires.forEach(formulaire => {
      // Trouver le questionnaire associé au formulaire
      const questionnaire = questionnaires.find(q => q.IdQuestionnaire === formulaire.IdQuestionnaire);
      if (!questionnaire) return;
      
      const thematique = questionnaire.Thematique;
      
      // Trouver les réponses associées à ce formulaire
      const formulaireReponses = reponses.filter(r => r.IdFormulaire === formulaire.IdFormulaire);
      
      // Calculer le score total pour cette thématique
      let thematiqueTotalScore = 0;
      formulaireReponses.forEach(reponse => {
        thematiqueTotalScore += reponse.Score;
      });
      
      // Calculer la moyenne
      const averageScore = formulaireReponses.length > 0 ? 
        thematiqueTotalScore / formulaireReponses.length : 0;
      
      // Ajouter ou mettre à jour la thématique
      if (!thematiquesScores[thematique]) {
        thematiquesScores[thematique] = { score: averageScore, count: 1 };
      } else {
        thematiquesScores[thematique].score += averageScore;
        thematiquesScores[thematique].count += 1;
      }
    });
    
    // Convertir en tableau de scores
    const scores = Object.entries(thematiquesScores).map(([thematique, data]) => ({
      thematique,
      score: parseFloat((data.score / data.count).toFixed(2))
    }));
    
    maturityAnalyses.push({
      application,
      scores
    });
  });
  
  return maturityAnalyses;
};

// Génération des scores par thématique
const generateThematiqueScores = (
  questionnaires: Questionnaire[],
  formulaires: Formulaire[],
  reponses: Reponse[]
): ThematiqueScore[] => {
  const thematiqueScores: ThematiqueScore[] = [];
  
  // Grouper les questionnaires par thématique
  const questionnairesByThematique: { [key: string]: string[] } = {};
  questionnaires.forEach(q => {
    if (!questionnairesByThematique[q.Thematique]) {
      questionnairesByThematique[q.Thematique] = [];
    }
    questionnairesByThematique[q.Thematique].push(q.IdQuestionnaire);
  });
  
  // Pour chaque thématique, calculer le score moyen
  Object.entries(questionnairesByThematique).forEach(([thematique, questionnaireIds]) => {
    // Trouver tous les formulaires liés à ces questionnaires
    const thematiqueFormulaires = formulaires.filter(f => 
      questionnaireIds.includes(f.IdQuestionnaire)
    );
    
    // Toutes les réponses de ces formulaires
    let totalScore = 0;
    let responseCount = 0;
    
    thematiqueFormulaires.forEach(formulaire => {
      const formulaireReponses = reponses.filter(r => r.IdFormulaire === formulaire.IdFormulaire);
      formulaireReponses.forEach(reponse => {
        totalScore += reponse.Score;
        responseCount++;
      });
    });
    
    // Calculer le score moyen
    const averageScore = responseCount > 0 ? 
      parseFloat((totalScore / responseCount).toFixed(2)) : 0;
    
    thematiqueScores.push({
      thematique,
      averageScore,
      totalResponses: responseCount
    });
  });
  
  return thematiqueScores;
};

// Fonction principale pour générer et sauvegarder les données
export const saveFakeDataToJson = () => {
  console.log('Génération des données fictives...');
  
  // Génération des données
  const acteurs = generateActeurs(CONFIG.ACTEURS);
  console.log(`${acteurs.length} acteurs générés`);
  
  const applications = generateApplications(CONFIG.APPLICATIONS);
  console.log(`${applications.length} applications générées`);
  
  const questionnaires = generateQuestionnaires(CONFIG.QUESTIONNAIRES);
  console.log(`${questionnaires.length} questionnaires générés`);
  
  const questions = generateQuestions(questionnaires, CONFIG.QUESTIONS_PER_QUESTIONNAIRE);
  console.log(`${questions.length} questions générées`);
  
  const formulaires = generateFormulaires(CONFIG.FORMULAIRES, acteurs, applications, questionnaires);
  console.log(`${formulaires.length} formulaires générés`);
  
  const reponses = generateReponses(formulaires, questions);
  console.log(`${reponses.length} réponses générées`);
  
  const maturityAnalyses = generateMaturityAnalyses(applications, formulaires, reponses, questions, questionnaires);
  console.log(`${maturityAnalyses.length} analyses de maturité générées`);
  
  const thematiqueScores = generateThematiqueScores(questionnaires, formulaires, reponses);
  console.log(`${thematiqueScores.length} scores par thématique générés`);
  
  // Créer les objets de données
  const data = {
    acteurs,
    applications,
    questionnaires,
    questions,
    formulaires,
    reponses,
    maturityAnalyses,
    thematiqueScores
  };
  
  // Créer le dossier data s'il n'existe pas
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Dossier data créé');
  }
  
  // Sauvegarder chaque entité dans son propre fichier
  Object.entries(data).forEach(([key, value]) => {
    fs.writeFileSync(
      path.join(dataDir, `${key}.json`), 
      JSON.stringify(value, null, 2)
    );
    console.log(`${key}.json généré avec ${Array.isArray(value) ? value.length : 0} entrées`);
  });
  
  // Sauvegarder toutes les données dans un seul fichier
  fs.writeFileSync(
    path.join(dataDir, 'all.json'),
    JSON.stringify(data, null, 2)
  );
  console.log('all.json généré avec toutes les données');
  
  return data;
};

// Exécution si appelé directement
if (require.main === module) {
  saveFakeDataToJson();
}