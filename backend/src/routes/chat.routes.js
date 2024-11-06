import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createGroupChat,
  createOrGetSingleChat,
  deleteSingleChat,
  renameGrouphat,
} from "../controllers/chat.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/c/:receiverId").post(createOrGetSingleChat);
router.route("/remove/:chatId").delete(deleteSingleChat);
router.route("/group").post(createGroupChat);
router.router("/group/rename").post(renameGrouphat);

export default router;
