import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const writeAuditLog = async (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        ...(payload !== undefined && { payload: payload as Prisma.InputJsonValue }),
      },
    });
  } catch (err) {
    console.error("[AuditLog] Gagal menulis audit log:", err);
  }
};
