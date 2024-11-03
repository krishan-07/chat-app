import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createOrGetSingleChat } from "../controllers/chat.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/:receiverId").get(createOrGetSingleChat);

export default router;
