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
  .get(getAllMessages)
  .post(
    upload.fields([
      {
        name: "attachments",
        maxCount: 5,
      },
    ]),
    sendMessage
  );
router.route("/:chatId/:messageId").delete(deleteMessage);

export default router;
