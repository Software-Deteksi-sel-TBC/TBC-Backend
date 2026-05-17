import express from "express";
import { Role } from "@prisma/client";
import * as commentController from "../controller/comment.controller.js";
import { authenticate, authorize } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { addCommentSchema } from "../validations/comment.validation.js";

const router = express.Router();

router.post(
  "/:id/comments",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  validate(addCommentSchema),
  commentController.addComment
);

router.delete(
  "/comments/:id",
  authenticate,
  authorize(Role.DOKTER_PATOLOGI),
  commentController.deleteComment
);

export default router;
