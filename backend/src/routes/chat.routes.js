import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addNewParticipantInTheGroup,
  createGroupChat,
  createOrGetSingleChat,
  deleteSingleChat,
  leaveGroupChat,
  removeParticipantFromTheGroup,
  renameGrouphat,
} from "../controllers/chat.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/c/:receiverId").post(createOrGetSingleChat);
router.route("/remove/:chatId").delete(deleteSingleChat);

router.route("/group").post(createGroupChat);
router.route("/group/rename").patch(renameGrouphat);
router.route("/group/add/:particpantId").patch(addNewParticipantInTheGroup);
router
  .route("/group/remove/:particpantId")
  .patch(removeParticipantFromTheGroup);
router.route("/group/leave").patch(leaveGroupChat);

export default router;
