// src/routes/interpretationRoutes.ts
import express from 'express';
import interpretationController from '../../server/controllers/interpretationController';
//import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// Routes pour l'interprétation des résultats
router.get('/analyse/:idAnalyse', interpretationController.getInterpretationAnalyse);
router.get('/analyse/', interpretationController.getInterpretationAnalyse);
router.get('/thematiques/:idAnalyse', interpretationController.getInterpretationThematiques);
router.get('/application/:idApplication', interpretationController.getAnalyseApplication);
router.get('/organisation/:nomOrganisation', interpretationController.getAnalysesOrganisation);
router.get('/organisation/:nomOrganisation/scores-moyens', interpretationController.getScoresMoyensOrganisation);

// Route pour la préparation des données LLM (pour future intégration)
router.get('/llm/application/:idApplication', interpretationController.prepareDonneesLLM);

export default router;