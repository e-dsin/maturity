// server/migrations/migrate_to_global_functions.js
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const logger = require('/server/utils/logger');

/**
 * Script de migration pour transformer les données existantes 
 * vers la nouvelle structure des fonctions globales
 */

// Configuration de la connexion
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maturity_assessment',
  multipleStatements: true
};

const migrationScript = async () => {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.beginTransaction();
    logger.info('🚀 Début de la migration vers les fonctions globales');
    
    // 1. Vérifier si les nouvelles tables existent
    const [tablesCheck] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_name IN ('fonctions_maturite_globale', 'niveaux_maturite_globale', 'recommandations_maturite_globale')
    `);
    
    if (tablesCheck[0].count < 3) {
      throw new Error('❌ Les nouvelles tables ne sont pas créées. Veuillez exécuter d\'abord le script de création de la structure DB.');
    }
    
    // 2. Créer les fonctions globales si elles n'existent pas déjà
    logger.info('📝 Création des fonctions globales de base...');
    
    const fonctionsGlobales = [
      {
        nom: 'Cybersécurité',
        description: 'Évaluation des pratiques et mesures de sécurité informatique de l\'entreprise',
        code_fonction: 'cybersecurite',
        poids: 1.0,
        ordre_affichage: 1,
        couleur: '#F44336',
        icone: 'Security'
      },
      {
        nom: 'Maturité Digitale',
        description: 'Niveau de transformation et d\'adoption du numérique dans l\'organisation',
        code_fonction: 'maturite_digitale',
        poids: 1.0,
        ordre_affichage: 2,
        couleur: '#2196F3',
        icone: 'Computer'
      },
      {
        nom: 'Gouvernance des Données',
        description: 'Gestion et gouvernance du patrimoine informationnel de l\'entreprise',
        code_fonction: 'gouvernance_donnees',
        poids: 1.0,
        ordre_affichage: 3,
        couleur: '#4CAF50',
        icone: 'Storage'
      },
      {
        nom: 'DevSecOps',
        description: 'Intégration de la sécurité dans les processus de développement et d\'opérations',
        code_fonction: 'devsecops',
        poids: 1.0,
        ordre_affichage: 4,
        couleur: '#FF9800',
        icone: 'Code'
      },
      {
        nom: 'Innovation Numérique',
        description: 'Capacité d\'innovation et d\'adaptation aux nouvelles technologies',
        code_fonction: 'innovation_numerique',
        poids: 1.0,
        ordre_affichage: 5,
        couleur: '#9C27B0',
        icone: 'Lightbulb'
      }
    ];
    
    // Insérer les fonctions globales
    const fonctionIds = {};
    for (const fonction of fonctionsGlobales) {
      // Vérifier si la fonction existe déjà
      const [existing] = await connection.query(
        'SELECT id_fonction FROM fonctions_maturite_globale WHERE code_fonction = ?',
        [fonction.code_fonction]
      );
      
      if (existing.length === 0) {
        const id_fonction = uuidv4();
        
        await connection.query(`
          INSERT INTO fonctions_maturite_globale (
            id_fonction, nom, description, code_fonction, 
            poids, ordre_affichage, couleur, icone
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id_fonction, fonction.nom, fonction.description, fonction.code_fonction,
          fonction.poids, fonction.ordre_affichage, fonction.couleur, fonction.icone
        ]);
        
        fonctionIds[fonction.code_fonction] = id_fonction;
        logger.info(`✅ Fonction créée: ${fonction.nom}`);
      } else {
        fonctionIds[fonction.code_fonction] = existing[0].id_fonction;
        logger.info(`ℹ️ Fonction existante: ${fonction.nom}`);
      }
    }
    
    // 3. Créer les niveaux de maturité pour chaque fonction
    logger.info('📊 Création des niveaux de maturité...');
    
    const niveauxStandard = [
      {
        nom_niveau: 'Initial',
        description: 'Processus ad-hoc et imprévisibles. Peu ou pas de pratiques formalisées.',
        score_min: 0.0,
        score_max: 1.0,
        ordre_niveau: 1,
        couleur: '#F44336'
      },
      {
        nom_niveau: 'Défini',
        description: 'Processus caractérisés et documentés. Pratiques définies mais pas toujours appliquées.',
        score_min: 1.01,
        score_max: 2.0,
        ordre_niveau: 2,
        couleur: '#FF9800'
      },
      {
        nom_niveau: 'Mesuré',
        description: 'Processus standardisés et mesurés. Application cohérente des pratiques.',
        score_min: 2.01,
        score_max: 3.0,
        ordre_niveau: 3,
        couleur: '#FFC107'
      },
      {
        nom_niveau: 'Géré',
        description: 'Processus contrôlés et prévisibles. Optimisation basée sur les métriques.',
        score_min: 3.01,
        score_max: 4.0,
        ordre_niveau: 4,
        couleur: '#4CAF50'
      },
      {
        nom_niveau: 'Optimisé',
        description: 'Processus en amélioration continue. Innovation et adaptation permanentes.',
        score_min: 4.01,
        score_max: 5.0,
        ordre_niveau: 5,
        couleur: '#2196F3'
      }
    ];
    
    for (const [codeFonction, idFonction] of Object.entries(fonctionIds)) {
      for (const niveau of niveauxStandard) {
        // Vérifier si le niveau existe déjà
        const [existingNiveau] = await connection.query(`
          SELECT id_niveau FROM niveaux_maturite_globale 
          WHERE id_fonction = ? AND ordre_niveau = ?
        `, [idFonction, niveau.ordre_niveau]);
        
        if (existingNiveau.length === 0) {
          const id_niveau = uuidv4();
          
          await connection.query(`
            INSERT INTO niveaux_maturite_globale (
              id_niveau, id_fonction, nom_niveau, description,
              score_min, score_max, ordre_niveau, couleur
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id_niveau, idFonction, niveau.nom_niveau, niveau.description,
            niveau.score_min, niveau.score_max, niveau.ordre_niveau, niveau.couleur
          ]);
        }
      }
      logger.info(`✅ Niveaux créés pour: ${codeFonction}`);
    }
    
    // 4. Lier les questions existantes aux nouvelles fonctions
    logger.info('🔗 Liaison des questions existantes aux fonctions globales...');
    
    // Mapping des anciens codes fonctions vers les nouveaux
    const functionMapping = {
      'cybersecurite': 'cybersecurite',
      'maturite_digitale': 'maturite_digitale', 
      'gouvernance_donnees': 'gouvernance_donnees',
      'devsecops': 'devsecops',
      'innovation_numerique': 'innovation_numerique'
    };
    
    for (const [oldCode, newCode] of Object.entries(functionMapping)) {
      const idFonction = fonctionIds[newCode];
      if (idFonction) {
        const [result] = await connection.query(`
          UPDATE questions_maturite_globale 
          SET id_fonction_globale = ?
          WHERE fonction = ? AND id_fonction_globale IS NULL
        `, [idFonction, oldCode]);
        
        logger.info(`✅ ${result.affectedRows} questions liées à ${newCode}`);
      }
    }
    
    // 5. Créer des recommandations par défaut
    logger.info('💡 Création des recommandations par défaut...');
    
    const recommandationsBase = [
      {
        code_fonction: 'cybersecurite',
        recommandations: [
          {
            titre: 'Renforcement de la politique de sécurité',
            description: 'Développer et implémenter une politique de cybersécurité complète adaptée aux besoins de l\'entreprise.',
            actions: ['Audit de sécurité complet', 'Formation du personnel', 'Mise en place de procédures'],
            priorite: 'HAUTE',
            type: 'COURT_TERME',
            score_min: 0,
            score_max: 2
          },
          {
            titre: 'Optimisation continue de la sécurité',
            description: 'Maintenir un niveau de sécurité optimal par une amélioration continue des processus.',
            actions: ['Veille technologique', 'Tests de pénétration réguliers', 'Mise à jour des outils'],
            priorite: 'MOYENNE',
            type: 'LONG_TERME',
            score_min: 3,
            score_max: 5
          }
        ]
      },
      {
        code_fonction: 'maturite_digitale',
        recommandations: [
          {
            titre: 'Accélération de la transformation digitale',
            description: 'Développer une roadmap de transformation digitale alignée sur la stratégie d\'entreprise.',
            actions: ['Audit digital', 'Formation équipes', 'Choix outils numériques'],
            priorite: 'HAUTE',
            type: 'MOYEN_TERME',
            score_min: 0,
            score_max: 2
          }
        ]
      },
      {
        code_fonction: 'gouvernance_donnees',
        recommandations: [
          {
            titre: 'Mise en place de la gouvernance des données',
            description: 'Établir un cadre de gouvernance pour la gestion et la qualité des données.',
            actions: ['Cartographie des données', 'Définition des rôles', 'Outils de qualité'],
            priorite: 'HAUTE',
            type: 'MOYEN_TERME',
            score_min: 0,
            score_max: 2
          }
        ]
      },
      {
        code_fonction: 'devsecops',
        recommandations: [
          {
            titre: 'Intégration DevSecOps',
            description: 'Intégrer la sécurité dans les processus de développement et de déploiement.',
            actions: ['Formation DevSecOps', 'Outils d\'automatisation', 'Processus sécurisés'],
            priorite: 'MOYENNE',
            type: 'MOYEN_TERME',
            score_min: 0,
            score_max: 3
          }
        ]
      },
      {
        code_fonction: 'innovation_numerique',
        recommandations: [
          {
            titre: 'Stimulation de l\'innovation numérique',
            description: 'Créer un environnement propice à l\'innovation et à l\'expérimentation.',
            actions: ['Lab d\'innovation', 'Partenariats tech', 'Culture d\'expérimentation'],
            priorite: 'MOYENNE',
            type: 'LONG_TERME',
            score_min: 0,
            score_max: 3
          }
        ]
      }
    ];
    
    for (const fonctionRec of recommandationsBase) {
      const idFonction = fonctionIds[fonctionRec.code_fonction];
      if (idFonction) {
        for (const rec of fonctionRec.recommandations) {
          // Vérifier si la recommandation existe déjà
          const [existingRec] = await connection.query(`
            SELECT id_recommandation FROM recommandations_maturite_globale 
            WHERE id_fonction = ? AND titre = ?
          `, [idFonction, rec.titre]);
          
          if (existingRec.length === 0) {
            const id_recommandation = uuidv4();
            
            await connection.query(`
              INSERT INTO recommandations_maturite_globale (
                id_recommandation, id_fonction, titre, description,
                actions_recommandees, priorite, type_recommandation,
                score_min, score_max, ordre_affichage
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              id_recommandation, idFonction, rec.titre, rec.description,
              JSON.stringify(rec.actions), rec.priorite, rec.type,
              rec.score_min, rec.score_max, 0
            ]);
          }
        }
        logger.info(`✅ Recommandations créées pour: ${fonctionRec.code_fonction}`);
      }
    }
    
    // 6. Mise à jour des évaluations existantes (optionnel)
    logger.info('🔄 Vérification des évaluations existantes...');
    
    const [evaluationsCount] = await connection.query(`
      SELECT COUNT(*) as count FROM evaluations_maturite_globale WHERE statut = 'TERMINE'
    `);
    
    logger.info(`ℹ️ ${evaluationsCount[0].count} évaluations terminées trouvées`);
    
    // 7. Validation finale
    logger.info('✅ Validation de la migration...');
    
    const [validationStats] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM fonctions_maturite_globale WHERE actif = 1) as nb_fonctions,
        (SELECT COUNT(*) FROM niveaux_maturite_globale WHERE actif = 1) as nb_niveaux,
        (SELECT COUNT(*) FROM recommandations_maturite_globale WHERE actif = 1) as nb_recommandations,
        (SELECT COUNT(*) FROM questions_maturite_globale WHERE id_fonction_globale IS NOT NULL) as nb_questions_liees
    `);
    
    const stats = validationStats[0];
    logger.info('📊 Statistiques de migration:');
    logger.info(`   - Fonctions globales: ${stats.nb_fonctions}`);
    logger.info(`   - Niveaux de maturité: ${stats.nb_niveaux}`);
    logger.info(`   - Recommandations: ${stats.nb_recommandations}`);
    logger.info(`   - Questions liées: ${stats.nb_questions_liees}`);
    
    await connection.commit();
    logger.info('🎉 Migration vers les fonctions globales terminée avec succès!');
    
    return {
      success: true,
      stats,
      message: 'Migration terminée avec succès'
    };
    
  } catch (error) {
    await connection.rollback();
    logger.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Fonction pour rollback de la migration (optionnel)
const rollbackMigration = async () => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    logger.info('🔄 Début du rollback de la migration...');
    
    // 1. Délier les questions des fonctions globales
    await connection.query(`
      UPDATE questions_maturite_globale 
      SET id_fonction_globale = NULL
    `);
    
    // 2. Supprimer les recommandations créées
    await connection.query(`
      DELETE FROM recommandations_maturite_globale 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);
    
    // 3. Supprimer les niveaux créés
    await connection.query(`
      DELETE FROM niveaux_maturite_globale 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);
    
    // 4. Supprimer les fonctions créées
    await connection.query(`
      DELETE FROM fonctions_maturite_globale 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);
    
    await connection.commit();
    logger.info('✅ Rollback terminé avec succès');
    
  } catch (error) {
    await connection.rollback();
    logger.error('❌ Erreur lors du rollback:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Export des fonctions
module.exports = {
  migrationScript,
  rollbackMigration
};

// Exécution directe si ce script est appelé
if (require.main === module) {
  migrationScript()
    .then((result) => {
      console.log('✅ Migration réussie:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur de migration:', error);
      process.exit(1);
    });
}