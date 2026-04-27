import { type Request, type Response } from "express";
import * as authService from "../services/auth.service.js";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Panggil logika dari service
    const { user, token } = await authService.loginUser(email, password);

    // Kirim respons sukses ke React
    res.status(200).json({
      message: "Login berhasil",
      token,
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
        is_first_login: user.is_first_login,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const setupPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password minimal 8 karakter" });
    }

    await authService.setupNewPassword(token, newPassword);

    res.status(200).json({ message: "Password berhasil diubah" });
  } catch (error: any) {
    res.status(400).json({ error: "Token tidak valid atau expired" });
  }
};
