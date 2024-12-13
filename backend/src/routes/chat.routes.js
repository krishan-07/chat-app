import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addNewParticipantInTheGroup,
  createGroupChat,
  createOrGetSingleChat,
  deleteGroupChat,
  deleteSingleChat,
  getAllChats,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromTheGroup,
  searchAvailableUser,
  updateGroupChat,
} from "../controllers/chat.controller.js";
import { mongoIdPathVariableValidator } from "../validators/mongodb.validators.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(getAllChats);
router.route("/search").get(searchAvailableUser);

router
  .route("/c/:receiverId")
  .post(mongoIdPathVariableValidator("recieverId"), createOrGetSingleChat);
router.route("/c/delete/:chatId").delete(deleteSingleChat);

router.route("/group").post(createGroupChat);
router
  .route("/group/:chatId")
  .get(mongoIdPathVariableValidator("chatId"), getGroupChatDetails);
router
  .route("/group/update/:chatId")
  .patch(
    mongoIdPathVariableValidator("chatId"),
    upload.single("icon"),
    updateGroupChat
  );
router.route("/group/add").patch(addNewParticipantInTheGroup);
router.route("/group/remove").patch(removeParticipantFromTheGroup);
router
  .route("/group/leave/:chatId")
  .patch(mongoIdPathVariableValidator("chatId"), leaveGroupChat);
router
  .route("/group/delete/:chatId")
  .delete(mongoIdPathVariableValidator("chatId"), deleteGroupChat);

export default router;
