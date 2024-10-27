import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import {
  changePassword,
  getCurrentUser,
  getUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  removeAvatar,
  updateAvatar,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

//unsecured token
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/user/:userId").get(getUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changePassword);

router.route("/update-account").patch(verifyJWT, updateUserDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/remove-avatar").patch(verifyJWT, removeAvatar);

router.route("/current-user").get(verifyJWT, getCurrentUser);

export default router;
