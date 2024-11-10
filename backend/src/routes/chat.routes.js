import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addNewParticipantInTheGroup,
  createGroupChat,
  createOrGetSingleChat,
  deleteGroupChat,
  deleteSingleChat,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromTheGroup,
  renameGrouphat,
  searchAvailableUser,
} from "../controllers/chat.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(searchAvailableUser);
router.route("/c/:receiverId").post(createOrGetSingleChat);
router.route("/remove/:chatId").delete(deleteSingleChat);

router.route("/group").post(createGroupChat);
router.route("/group/rename").patch(renameGrouphat);
router.route("/group/add/:particpantId").patch(addNewParticipantInTheGroup);
router
  .route("/group/remove/:particpantId")
  .patch(removeParticipantFromTheGroup);
router.route("/group/leave/:chatId").patch(leaveGroupChat);
router.route("/group/delete/:chatId").delete(deleteGroupChat);
router.route("/group/:chatId").get(getGroupChatDetails);

export default router;
