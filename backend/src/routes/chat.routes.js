import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createOrGetSingleChat,
  deleteSingleChat,
} from "../controllers/chat.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/:receiverId").get(createOrGetSingleChat);
router.route("/:chatId").delete(deleteSingleChat);

export default router;
