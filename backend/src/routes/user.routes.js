import { Router } from "express";
import passport from "passport";
import { upload } from "../middleware/multer.middleware.js";
import {
  changePassword,
  getCurrentUser,
  getUser,
  handleSocialLogin,
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

// SSO routes
router.route("/google").get(
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
  (req, res) => {
    res.send("redirecting to google...");
  }
);
router
  .route("/google/callback")
  .get(passport.authenticate("google"), handleSocialLogin);

router.route("/auth/github").get(
  passport.authenticate("github", {
    scope: ["read:user user:email"],
    failureRedirect: "http://localhost:3000/login",
  })
);
router.route("/auth/github/callback").get(
  passport.authenticate("github", {
    failureRedirect: "http://localhost:3000/login",
  }),
  handleSocialLogin
);

export default router;
