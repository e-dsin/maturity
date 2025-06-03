// scripts/swagger/templates.js
/**
 * Modèles de documentation Swagger pour les routes de l'API
 */

/**
 * Génère un modèle Swagger pour une route donnée
 * @param {string} routeName - Nom de la route
 * @returns {string} - Contenu Swagger pour la route
 */
function generateSwaggerTemplate(routeName) {
     switch (routeName) {
       case 'applications':
         return `/**
    * @swagger
    * /applications:
    *   get:
    *     summary: Récupère toutes les applications
    *     tags: [Applications]
    *     responses:
    *       200:
    *         description: Liste des applications récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: array
    *               items:
    *                 $ref: '#/components/schemas/Application'
    * 
    *   post:
    *     summary: Crée une nouvelle application
    *     tags: [Applications]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - nom_application
    *             properties:
    *               nom_application:
    *                 type: string
    *               statut:
    *                 type: string
    *                 enum: [Projet, Run]
    *               type:
    *                 type: string
    *                 enum: [Build, Buy]
    *               hebergement:
    *                 type: string
    *                 enum: [Cloud, Prem, Hybrid]
    *               architecture_logicielle:
    *                 type: string
    *     responses:
    *       201:
    *         description: Application créée avec succès
    *
    * /applications/{id}:
    *   get:
    *     summary: Récupère une application par son ID
    *     tags: [Applications]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Application récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               $ref: '#/components/schemas/Application'
    *       404:
    *         description: Application non trouvée
    *
    *   put:
    *     summary: Met à jour une application
    *     tags: [Applications]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/Application'
    *     responses:
    *       200:
    *         description: Application mise à jour avec succès
    *       404:
    *         description: Application non trouvée
    *
    *   delete:
    *     summary: Supprime une application
    *     tags: [Applications]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Application supprimée avec succès
    *       404:
    *         description: Application non trouvée
    *
    * /applications/entreprise-mapping:
    *   get:
    *     summary: Récupère le mapping entre applications et entreprises
    *     tags: [Applications]
    *     responses:
    *       200:
    *         description: Mapping récupéré avec succès
    */`;
   
       case 'analyses':
         return `/**
    * @swagger
    * /analyses:
    *   get:
    *     summary: Récupère toutes les analyses
    *     tags: [Analyses]
    *     responses:
    *       200:
    *         description: Liste des analyses récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: array
    *               items:
    *                 $ref: '#/components/schemas/Analyse'
    * 
    *   post:
    *     summary: Crée une nouvelle analyse
    *     tags: [Analyses]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - id_application
    *             properties:
    *               id_application:
    *                 type: string
    *               thematiques:
    *                 type: array
    *                 items:
    *                   type: object
    *                   properties:
    *                     thematique:
    *                       type: string
    *                     score:
    *                       type: number
    *                     nombre_reponses:
    *                       type: integer
    *     responses:
    *       201:
    *         description: Analyse créée avec succès
    *
    * /analyses/{id}:
    *   get:
    *     summary: Récupère une analyse par son ID
    *     tags: [Analyses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'analyse
    *     responses:
    *       200:
    *         description: Analyse récupérée avec succès
    *       404:
    *         description: Analyse non trouvée
    *
    * /analyses/application/{id}:
    *   get:
    *     summary: Récupère les analyses d'une application
    *     tags: [Analyses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Analyses récupérées avec succès
    *
    * /analyses/calculer/{id}:
    *   post:
    *     summary: Calcule une nouvelle analyse pour une application
    *     tags: [Analyses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Analyse calculée avec succès
    *
    * /analyses/entreprise/{id}:
    *   get:
    *     summary: Récupère les analyses pour une entreprise
    *     tags: [Analyses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Analyses récupérées avec succès
    *
    * /analyses/calculer/entreprise/{id}:
    *   post:
    *     summary: Calcule les analyses pour toutes les applications d'une entreprise
    *     tags: [Analyses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Analyses calculées avec succès
    */`;
   
       case 'interpretations':
         return `/**
    * @swagger
    * /interpretations:
    *   get:
    *     summary: Récupère toutes les interprétations
    *     tags: [Interprétations]
    *     responses:
    *       200:
    *         description: Liste des interprétations récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: array
    *               items:
    *                 $ref: '#/components/schemas/Interpretation'
    *
    * /interpretations/analyse/{idAnalyse}:
    *   get:
    *     summary: Récupère l'interprétation d'une analyse
    *     tags: [Interprétations]
    *     parameters:
    *       - in: path
    *         name: idAnalyse
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'analyse
    *     responses:
    *       200:
    *         description: Interprétation récupérée avec succès
    *       404:
    *         description: Interprétation non trouvée
    *
    * /interpretations/thematiques/{idAnalyse}:
    *   get:
    *     summary: Récupère les interprétations par thématique d'une analyse
    *     tags: [Interprétations]
    *     parameters:
    *       - in: path
    *         name: idAnalyse
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'analyse
    *     responses:
    *       200:
    *         description: Interprétations par thématique récupérées avec succès
    *       404:
    *         description: Interprétations non trouvées
    *
    * /interpretations/application/{idApplication}:
    *   get:
    *     summary: Récupère l'interprétation pour une application
    *     tags: [Interprétations]
    *     parameters:
    *       - in: path
    *         name: idApplication
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Interprétation récupérée avec succès
    *       404:
    *         description: Application non trouvée
    *
    * /interpretations/historique/{idApplication}:
    *   get:
    *     summary: Récupère l'historique des scores d'une application
    *     tags: [Interprétations]
    *     parameters:
    *       - in: path
    *         name: idApplication
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    */`;
   
       case 'questionnaires':
         return `/**
    * @swagger
    * /questionnaires:
    *   get:
    *     summary: Récupère tous les questionnaires
    *     tags: [Questionnaires]
    *     responses:
    *       200:
    *         description: Liste des questionnaires récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: array
    *               items:
    *                 $ref: '#/components/schemas/Questionnaire'
    * 
    *   post:
    *     summary: Crée un nouveau questionnaire
    *     tags: [Questionnaires]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - titre
    *               - thematique
    *             properties:
    *               titre:
    *                 type: string
    *               thematique:
    *                 type: string
    *               description:
    *                 type: string
    *     responses:
    *       201:
    *         description: Questionnaire créé avec succès
    *
    * /questionnaires/{id}:
    *   get:
    *     summary: Récupère un questionnaire par son ID
    *     tags: [Questionnaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du questionnaire
    *     responses:
    *       200:
    *         description: Questionnaire récupéré avec succès
    *       404:
    *         description: Questionnaire non trouvé
    *
    *   put:
    *     summary: Met à jour un questionnaire
    *     tags: [Questionnaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du questionnaire
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/Questionnaire'
    *     responses:
    *       200:
    *         description: Questionnaire mis à jour avec succès
    *       404:
    *         description: Questionnaire non trouvé
    *
    *   delete:
    *     summary: Supprime un questionnaire
    *     tags: [Questionnaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du questionnaire
    *     responses:
    *       200:
    *         description: Questionnaire supprimé avec succès
    *       404:
    *         description: Questionnaire non trouvé
    *
    * /questionnaires/{id}/questions:
    *   get:
    *     summary: Récupère les questions d'un questionnaire
    *     tags: [Questionnaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du questionnaire
    *     responses:
    *       200:
    *         description: Questions récupérées avec succès
    *       404:
    *         description: Questionnaire non trouvé
    *
    * /questionnaires/stats:
    *   get:
    *     summary: Récupère les statistiques des questionnaires
    *     tags: [Questionnaires]
    *     responses:
    *       200:
    *         description: Statistiques récupérées avec succès
    */`;
   
       case 'formulaires':
         return `/**
    * @swagger
    * /formulaires:
    *   get:
    *     summary: Récupère tous les formulaires
    *     tags: [Formulaires]
    *     responses:
    *       200:
    *         description: Liste des formulaires récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: array
    *               items:
    *                 $ref: '#/components/schemas/Formulaire'
    * 
    *   post:
    *     summary: Crée un nouveau formulaire
    *     tags: [Formulaires]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - id_questionnaire
    *               - id_application
    *             properties:
    *               id_questionnaire:
    *                 type: string
    *               id_application:
    *                 type: string
    *               id_acteur:
    *                 type: string
    *     responses:
    *       201:
    *         description: Formulaire créé avec succès
    *
    * /formulaires/recent:
    *   get:
    *     summary: Récupère les formulaires récents
    *     tags: [Formulaires]
    *     responses:
    *       200:
    *         description: Formulaires récents récupérés avec succès
    *
    * /formulaires/{id}:
    *   get:
    *     summary: Récupère un formulaire par son ID
    *     tags: [Formulaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du formulaire
    *     responses:
    *       200:
    *         description: Formulaire récupéré avec succès
    *       404:
    *         description: Formulaire non trouvé
    *
    *   put:
    *     summary: Met à jour un formulaire
    *     tags: [Formulaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du formulaire
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               statut:
    *                 type: string
    *               commentaires:
    *                 type: string
    *     responses:
    *       200:
    *         description: Formulaire mis à jour avec succès
    *       404:
    *         description: Formulaire non trouvé
    *
    *   delete:
    *     summary: Supprime un formulaire
    *     tags: [Formulaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du formulaire
    *     responses:
    *       200:
    *         description: Formulaire supprimé avec succès
    *       404:
    *         description: Formulaire non trouvé
    *
    * /formulaires/{id}/submit:
    *   put:
    *     summary: Soumet un formulaire et déclenche le calcul du score
    *     tags: [Formulaires]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du formulaire
    *     responses:
    *       200:
    *         description: Formulaire soumis avec succès
    *       404:
    *         description: Formulaire non trouvé
    */`;
   
       case 'entreprises':
         return `/**
    * @swagger
    * /entreprises:
    *   get:
    *     summary: Récupère toutes les entreprises
    *     tags: [Entreprises]
    *     responses:
    *       200:
    *         description: Liste des entreprises récupérée avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: array
    *               items:
    *                 $ref: '#/components/schemas/Entreprise'
    * 
    *   post:
    *     summary: Crée une nouvelle entreprise
    *     tags: [Entreprises]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - nom_entreprise
    *             properties:
    *               nom_entreprise:
    *                 type: string
    *               secteur:
    *                 type: string
    *               adresse:
    *                 type: string
    *               contact_email:
    *                 type: string
    *               contact_telephone:
    *                 type: string
    *     responses:
    *       201:
    *         description: Entreprise créée avec succès
    *
    * /entreprises/{id}:
    *   get:
    *     summary: Récupère une entreprise par son ID
    *     tags: [Entreprises]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Entreprise récupérée avec succès
    *       404:
    *         description: Entreprise non trouvée
    *
    *   put:
    *     summary: Met à jour une entreprise
    *     tags: [Entreprises]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     requestBody:
    *       required: true
    *       gyroscope:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/Entreprise'
    *     responses:
    *       200:
    *         description: Entreprise mise à jour avec succès
    *       404:
    *         description: Entreprise non trouvée
    *
    *   delete:
    *     summary: Supprime une entreprise
    *     tags: [Entreprises]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Entreprise supprimée avec succès
    *       404:
    *         description: Entreprise non trouvée
    *
    * /entreprises/{id}/applications:
    *   get:
    *     summary: Récupère les applications d'une entreprise
    *     tags: [Entreprises]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Applications récupérées avec succès
    *       404:
    *         description: Entreprise non trouvée
    *
    * /entreprises/{id}/historique:
    *   get:
    *     summary: Récupère l'historique des scores d'une entreprise
    *     tags: [Entreprises]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    *       404:
    *         description: Entreprise non trouvée
    *
    * /entreprises/{id}/calculer:
    *   post:
    *     summary: Recalcule le score d'une entreprise
    *     tags: [Entreprises]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Score recalculé avec succès
    *       404:
    *         description: Entreprise non trouvée
    */`;
   
       case 'historique':
         return `/**
    * @swagger
    * /historique:
    *   get:
    *     summary: Récupère tout l'historique des scores
    *     tags: [Historique]
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    *
    * /historique/application/{id}:
    *   get:
    *     summary: Récupère l'historique des scores d'une application
    *     tags: [Historique]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    *       404:
    *         description: Application non trouvée
    *
    * /historique/application/{id}/thematique/{thematique}:
    *   get:
    *     summary: Récupère l'historique des scores d'une thématique pour une application
    *     tags: [Historique]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'application
    *       - in: path
    *         name: thematique
    *         required: true
    *         schema:
    *           type: string
    *         description: Nom de la thématique
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    *
    * /historique/entreprise/{id}:
    *   get:
    *     summary: Récupère l'historique des scores d'une entreprise
    *     tags: [Historique]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'entreprise
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    *       404:
    *         description: Entreprise non trouvée
    *
    * /historique/thematique/{thematique}:
    *   get:
    *     summary: Récupère l'historique des scores pour une thématique spécifique
    *     tags: [Historique]
    *     parameters:
    *       - in: path
    *         name: thematique
    *         required: true
    *         schema:
    *           type: string
    *         description: Nom de la thématique
    *     responses:
    *       200:
    *         description: Historique récupéré avec succès
    */`;
   
       case 'stats':
         return `/**
    * @swagger
    * /stats/overview:
    *   get:
    *     summary: Récupère les statistiques générales
    *     tags: [Statistiques]
    *     responses:
    *       200:
    *         description: Statistiques récupérées avec succès
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 totalApplications:
    *                   type: integer
    *                 totalQuestionnaires:
    *                   type: integer
    *                 totalFormulaires:
    *                   type: integer
    *                 completionRate:
    *                   type: number
    *
    * /stats/questionnaires:
    *   get:
    *     summary: Récupère les statistiques des questionnaires
    *     tags: [Statistiques]
    *     responses:
    *       200:
    *         description: Statistiques récupérées avec succès
    */`;
   
       case 'reponses':
         return `/**
    * @swagger
    * /reponses:
    *   get:
    *     summary: Récupère toutes les réponses
    *     tags: [Réponses]
    *     responses:
    *       200:
    *         description: Liste des réponses récupérée avec succès
    * 
    *   post:
    *     summary: Crée une nouvelle réponse
    *     tags: [Réponses]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - id_formulaire
    *               - id_question
    *               - valeur
    *             properties:
    *               id_formulaire:
    *                 type: string
    *               id_question:
    *                 type: string
    *               valeur:
    *                 type: string
    *               commentaire:
    *                 type: string
    *               score:
    *                 type: number
    *     responses:
    *       201:
    *         description: Réponse créée avec succès
    *
    * /reponses/{id}:
    *   get:
    *     summary: Récupère une réponse par son ID
    *     tags: [Réponses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la réponse
    *     responses:
    *       200:
    *         description: Réponse récupérée avec succès
    *       404:
    *         description: Réponse non trouvée
    *
    *   put:
    *     summary: Met à jour une réponse
    *     tags: [Réponses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la réponse
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               valeur:
    *                 type: string
    *               commentaire:
    *                 type: string
    *               score:
    *                 type: number
    *     responses:
    *       200:
    *         description: Réponse mise à jour avec succès
    *       404:
    *         description: Réponse non trouvée
    *
    *   delete:
    *     summary: Supprime une réponse
    *     tags: [Réponses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la réponse
    *     responses:
    *       200:
    *         description: Réponse supprimée avec succès
    *       404:
    *         description: Réponse non trouvée
    *
    * /reponses/formulaire/{id}:
    *   get:
    *     summary: Récupère les réponses d'un formulaire
    *     tags: [Réponses]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID du formulaire
    *     responses:
    *       200:
    *         description: Réponses récupérées avec succès
    */`;
   
       case 'questions':
         return `/**
    * @swagger
    * /questions:
    *   get:
    *     summary: Récupère toutes les questions
    *     tags: [Questions]
    *     responses:
    *       200:
    *         description: Liste des questions récupérée avec succès
    * 
    *   post:
    *     summary: Crée une nouvelle question gla
    *     tags: [Questions]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - id_questionnaire
    *               - texte
    *               - type
    *             properties:
    *               id_questionnaire:
    *                 type: string
    *               texte:
    *                 type: string
    *               type:
    *                 type: string
    *               ordre:
    *                 type: integer
    *               options:
    *                 type: array
    *                 items:
    *                   type: string
    *               obligatoire:
    *                 type: boolean
    *               aide:
    *                 type: string
    *               points_max:
    *                 type: number
    *     responses:
    *       201:
    *         description: Question créée avec succès
    *
    * /questions/{id}:
    *   get:
    *     summary: Récupère une question par son ID
    *     tags: [Questions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la question
    *     responses:
    *       200:
    *         description: Question récupérée avec succès
    *       404:
    *         description: Question non trouvée
    *
    *   put:
    *     summary: Met à jour une question
    *     tags: [Questions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la question
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               texte:
    *                 type: string
    *               type:
    *                 type: string
    *               ordre:
    *                 type: integer
    *               options:
    *                 type: array
    *                 items:
    *                   type: string
    *               obligatoire:
    *                 type: boolean
    *               aide:
    *                 type: string
    *               points_max:
    *                 type: number
    *     responses:
    *       200:
    *         description: Question mise à jour avec succès
    *       404:
    *         description: Question non trouvée
    *
    *   delete:
    *     summary: Supprime une question
    *     tags: [Questions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la question
    *     responses:
    *       200:
    *         description: Question supprimée avec succès
    *       404:
    *         description: Question non trouvée
    */`;
   
       case 'acteurs':
         return `/**
    * @swagger
    * /acteurs:
    *   get:
    *     summary: Récupère tous les acteurs
    *     tags: [Acteurs]
    *     responses:
    *       200:
    *         description: Liste des acteurs récupérée avec succès
    * 
    *   post:
    *     summary: Crée un nouvel acteur
    *     tags: [Acteurs]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - nom_acteur
    *             properties:
    *               nom_acteur:
    *                 type: string
    *               type_acteur:
    *                 type: string
    *               role:
    *                 type: string
    *               organisation:
    *                 type: string
    *               email:
    *                 type: string
    *               telephone:
    *                 type: string
    *     responses:
    *       201:
    *         description: Acteur créé avec succès
    *
    * /acteurs/{id}:
    *   get:
    *     summary: Récupère un acteur par son ID
    *     tags: [Acteurs]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'acteur
    *     responses:
    *       200:
    *         description: Acteur récupéré avec succès
    *       404:
    *         description: Acteur non trouvé
    *
    *   put:
    *     summary: Met à jour un acteur
    *     tags: [Acteurs]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'acteur
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               nom_acteur:
    *                 type: string
    *               type_acteur:
    *                 type: string
    *               role:
    *                 type: string
    *               organisation:
    *                 type: string
    *               email:
    *                 type: string
    *               telephone:
    *                 type: string
    *     responses:
    *       200:
    *         description: Acteur mis à jour avec succès
    *       404:
    *         description: Acteur non trouvé
    *
    *   delete:
    *     summary: Supprime un acteur
    *     tags: [Acteurs]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'acteur
    *     responses:
    *       200:
    *         description: Acteur supprimé avec succès
    *       404:
    *         description: Acteur non trouvé
    */`;
   
       case 'permissions':
         return `/**
    * @swagger
    * /permissions:
    *   get:
    *     summary: Récupère toutes les permissions
    *     tags: [Permissions]
    *     responses:
    *       200:
    *         description: Liste des permissions récupérée avec succès
    * 
    *   post:
    *     summary: Crée une nouvelle permission
    *     tags: [Permissions]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - id_acteur
    *               - ressource
    *               - action
    *             properties:
    *               id_acteur:
    *                 type: string
    *               ressource:
    *                 type: string
    *               action:
    *                 type: string
    *               conditions:
    *                 type: object
    *     responses:
    *       201:
    *         description: Permission créée avec succès
    *
    * /permissions/{id}:
    *   get:
    *     summary: Récupère une permission par son ID
    *     tags: [Permissions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la permission
    *     responses:
    *       200:
    *         description: Permission récupérée avec succès
    *       404:
    *         description: Permission non trouvée
    *
    *   put:
    *     summary: Met à jour une permission
    *     tags: [Permissions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la permission
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               ressource:
    *                 type: string
    *               action:
    *                 type: string
    *               conditions:
    *                 type: object
    *     responses:
    *       200:
    *         description: Permission mise à jour avec succès
    *       404:
    *         description: Permission non trouvée
    *
    *   delete:
    *     summary: Supprime une permission
    *     tags: [Permissions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de la permission
    *     responses:
    *       200:
    *         description: Permission supprimée avec succès
    *       404:
    *         description: Permission non trouvée
    *
    * /permissions/acteur/{id}:
    *   get:
    *     summary: Récupère les permissions d'un acteur
    *     tags: [Permissions]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID de l'acteur
    *     responses:
    *       200:
    *         description: Permissions récupérées avec succès
    */`;
   
       case 'logs':
         return `/**
    * @swagger
    * /logs:
    *   post:
    *     summary: Enregistre les logs du frontend
    *     tags: [Logs]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - logs
    *             properties:
    *               logs:
    *                 type: array
    *                 items:
    *                   type: object
    *                   required:
    *                     - level
    *                     - message
    *                   properties:
    *                     level:
    *                       type: string
    *                       enum: [DEBUG, INFO, WARN, ERROR]
    *                     message:
    *                       type: string
    *                     timestamp:
    *                       type: string
    *                     details:
    *                       type: object
    *               metadata:
    *                 type: object
    *     responses:
    *       200:
    *         description: Logs enregistrés avec succès
    *
    * /logs/health:
    *   get:
    *     summary: Vérification de l'état du service de logs
    *     tags: [Logs]
    *     responses:
    *       200:
    *         description: Service opérationnel
    */`;
   
       default:
         return `/**
    * @swagger
    * /${routeName}:
    *   get:
    *     summary: Récupère tous les ${routeName}
    *     tags: [${routeName.charAt(0).toUpperCase() + routeName.slice(1)}]
    *     responses:
    *       200:
    *         description: Liste des ${routeName} récupérée avec succès
    */`;
     }
   }
   
   module.exports = { generateSwaggerTemplate };