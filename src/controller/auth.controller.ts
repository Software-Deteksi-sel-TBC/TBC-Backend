import { type Request, type Response } from "express";
import { AppError } from "../errors/app.error.js";
import * as authService from "../services/auth.service.js";
import {
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type UpdateCredentialInput,
} from "../validations/auth.validation.js";

const handleControllerError = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    status: "error",
    message: "Terjadi kesalahan internal",
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginInput;
    const { user, token } = await authService.loginUser(email, password);

    res.status(200).json({
      status: "success",
      message: "Login berhasil",
      token,
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
        is_first_login: user.is_first_login,
      },
    });
  } catch (error: unknown) {
    handleControllerError(res, error);
  }
};

export const updateCredential = async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body as UpdateCredentialInput;
    await authService.updateCredential(email, currentPassword, newPassword);

    res.status(200).json({
      status: "success",
      message: "Credential berhasil diperbarui",
    });
  } catch (error: unknown) {
    handleControllerError(res, error);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as ForgotPasswordInput;
    await authService.forgotPassword(email);

    res.status(200).json({
      status: "success",
      message:
        "Jika email terdaftar, tautan reset password telah dikirim ke alamat email tersebut",
    });
  } catch (error: unknown) {
    handleControllerError(res, error);
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
    handleControllerError(res, error);
  }
};
