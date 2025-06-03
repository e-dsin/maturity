// src/scripts/dataGenerators.ts
import { v4 as uuidv4 } from 'uuid';
import { ROLES, PROFIL_MATURITE_ENTREPRISE, Question } from './dataDefinitions';

/**
 * Génère un nombre entier aléatoire entre min et max inclus
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Génère une date aléatoire entre deux dates
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Sélectionne un élément aléatoire dans un tableau
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Sélectionne plusieurs éléments aléatoires uniques dans un tableau
 */
export function randomUniqueElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Génère un nom et prénom aléatoire
 */
export function generateName(): string {
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Thomas', 'Julie', 'Nicolas', 'Isabelle', 'David', 'Céline',
    'François', 'Claire', 'Laurent', 'Catherine', 'Philippe', 'Nathalie', 'Michel', 'Anne', 'Éric', 'Christine'];
  
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
    'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];
  
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

/**
 * Génère un score aléatoire basé sur le profil de maturité de l'organisation
 */
export function generateNoteBasedOnProfile(
  question: Question, 
  orgMaturityProfile: 'débutant' | 'intermédiaire' | 'avancé'
): number {
  // Distribution des notes selon le profil de maturité de l'organisation
  if (orgMaturityProfile === 'débutant') {
    // Organisation débutante: notes majoritairement entre 1 et 3
    const probabilities = [0, 0.3, 0.4, 0.2, 0.1, 0]; // Probabilités pour les notes 0-5
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i <= 5; i++) {
      cumulative += probabilities[i];
      if (rand < cumulative) return i;
    }
    return 1;
  } else if (orgMaturityProfile === 'intermédiaire') {
    // Organisation intermédiaire: notes majoritairement entre 2 et 4
    const probabilities = [0, 0.1, 0.3, 0.4, 0.2, 0]; // Probabilités pour les notes 0-5
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i <= 5; i++) {
      cumulative += probabilities[i];
      if (rand < cumulative) return i;
    }
    return 3;
  } else {
    // Organisation avancée: notes majoritairement entre 3 et 5
    const probabilities = [0, 0, 0.1, 0.3, 0.4, 0.2]; // Probabilités pour les notes 0-5
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i <= 5; i++) {
      cumulative += probabilities[i];
      if (rand < cumulative) return i;
    }
    return 4;
  }
}

/**
 * Génère un commentaire pour une note donnée
 */
export function generateCommentaireForNote(
  note: number, 
  indicateurs: { niveau1: string; niveau3: string; niveau5: string }
): string {
  if (note <= 1) {
    return `Note: ${note}/5 - ${indicateurs.niveau1}. Des améliorations significatives sont nécessaires.`;
  } else if (note <= 2) {
    return `Note: ${note}/5 - Proche du niveau initial: ${indicateurs.niveau1}. Des efforts importants restent à faire.`;
  } else if (note <= 3) {
    return `Note: ${note}/5 - ${indicateurs.niveau3}. Processus en place mais à renforcer.`;
  } else if (note <= 4) {
    return `Note: ${note}/5 - Dépassant le niveau défini: ${indicateurs.niveau3}. Progression vers l'optimisation.`;
  } else {
    return `Note: ${note}/5 - ${indicateurs.niveau5}. Excellent niveau, à maintenir et continuer d'améliorer.`;
  }
}

/**
 * Génère un email formaté à partir d'un nom et d'un identifiant
 */
export function generateEmail(nom: string, id: number, entreprise: string): string {
  const sanitizedNom = nom.toLowerCase().replace(' ', '.');
  const sanitizedEntreprise = entreprise.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${sanitizedNom}.${id}@${sanitizedEntreprise}.fr`;
}

/**
 * Génère plusieurs acteurs pour une entreprise donnée
 */
export function generateActeursForEntreprise(entrepriseId: string, entrepriseNom: string, count: number): Array<{
  id: string;
  nom: string;
  role: string;
  organisation: string;
  entrepriseId: string;
  anciennete: number;
  email: string;
}> {
  const acteurs = [];
  
  for (let i = 0; i < count; i++) {
    const nom = generateName();
    const role = randomElement(ROLES);
    const anciennete = randomInt(1, 15);
    const email = generateEmail(nom, i, entrepriseNom);
    
    acteurs.push({
      id: uuidv4(),
      nom,
      role,
      organisation: entrepriseNom,
      entrepriseId,
      anciennete,
      email
    });
  }
  
  return acteurs;
}

/**
 * Fonction pour obtenir le niveau de maturité d'un score
 */
export function getNiveauMaturite(score: number): string {
  if (score >= 4.5) return 'Niveau 5 - Optimisé';
  if (score >= 3.5) return 'Niveau 4 - Géré';
  if (score >= 2.5) return 'Niveau 3 - Mesuré';
  if (score >= 1.5) return 'Niveau 2 - Défini';
  return 'Niveau 1 - Initial';
}

/**
 * Fonction pour générer une recommandation basée sur un score
 */
export function generateRecommandation(score: number, thematique: string): string {
  if (score >= 4.5) {
    return `Continue d'exceller en ${thematique} et partage les bonnes pratiques avec l'ensemble de l'organisation.`;
  }
  if (score >= 3.5) {
    return `Pour améliorer encore ${thematique}, focus sur l'automatisation avancée et l'orchestration des outils.`;
  }
  if (score >= 2.5) {
    return `Renforcez votre maturité en ${thematique} par plus de métriques et d'automatisation.`;
  }
  if (score >= 1.5) {
    return `Standardisez vos pratiques de ${thematique} et intégrez la sécurité plus tôt dans le cycle.`;
  }
  return `Priorité absolue : établir les fondations de base pour ${thematique} avec des formations et des quick-wins.`;
}

/**
 * Fonction pour générer une description basée sur un score
 */
export function generateDescription(score: number, thematique: string): string {
  if (score >= 4.5) {
    return `Excellence en ${thematique} avec pratiques avancées, automatisées et adaptatives.`;
  }
  if (score >= 3.5) {
    return `Bonne maturité en ${thematique} avec une approche intégrée et mesurée, quelques optimisations restent possibles.`;
  }
  if (score >= 2.5) {
    return `Niveau intermédiaire en ${thematique}, pratiques en place mais appliquées de façon inégale.`;
  }
  if (score >= 1.5) {
    return `Niveau basique en ${thematique}, quelques processus formalisés mais application limitée.`;
  }
  return `Niveau initial en ${thematique}, pratiques ad-hoc et peu structurées.`;
}