import express from 'express';
import * as authController from '../controller/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateCredentialSchema,
} from '../validations/auth.validation.js';

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/update-credentials', validate(updateCredentialSchema), authController.updateCredential);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;