import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  deleteMessage,
  getAllMessages,
  sendMessage,
} from "../controllers/message.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/:chatId")
  .get(mongoIdPathVariableValidator("chatId"), getAllMessages)
  .post(
    mongoIdPathVariableValidator("chatId"),
    upload.fields([
      {
        name: "attachments",
        maxCount: 5,
      },
    ]),
    sendMessage
  );
router
  .route("/:chatId/:messageId")
  .delete(
    mongoIdPathVariableValidator("chatId"),
    mongoIdPathVariableValidator("messageId"),
    deleteMessage
  );

export default router;
