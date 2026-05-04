import { type Request, type Response } from "express";
import { FORGOT_PASSWORD_SUCCESS_MESSAGE } from "../constants/auth.constants.js";
import { sendErrorResponse } from "../middlewares/error-handler.middleware.js";
import * as authService from "../services/auth.service.js";
import {
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type UpdateCredentialInput,
} from "../validations/auth.validation.js";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginInput;
    const { user, token } = await authService.loginUser(email, password);

    res.status(200).json({
      status: "success",
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        is_first_login: user.is_first_login,
      },
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const updateCredential = async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword, confirmPassword } =
      req.body as UpdateCredentialInput;
    await authService.updateCredential(
      email,
      currentPassword,
      newPassword,
      confirmPassword,
    );

    res.status(200).json({
      status: "success",
      message: "Credential berhasil diperbarui",
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as ForgotPasswordInput;
    await authService.forgotPassword(email);

    res.status(200).json({
      status: "success",
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      status: "success",
      message: "Password berhasil direset",
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
};
