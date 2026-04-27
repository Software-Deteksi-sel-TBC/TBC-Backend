import express from 'express';
import * as authController from '../controller/auth.controller.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/update-credential', authController.updateFirstLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;