import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { UserLoginType, UserRolesEnum } from "../constants.js";

try {
  passport.serializeUser((user, next) => {
    next(null, user._id);
  });

  passport.deserializeUser(async (id, next) => {
    try {
      const user = await User.findById(id);
      if (user) next(null, user);
      else next(new ApiError(404, "User not found"), null);
    } catch (error) {
      next(
        new ApiError(
          500,
          "Something went wrong while deserializing the user" + error
        ),
        null
      );
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_, __, profile, next) => {
        const user = await User.findOne({ email: profile._json.email });
        if (user) {
          if (user.loginType !== UserLoginType.GOOGLE) {
            next(
              new ApiError(
                400,
                "You have previously registered with " +
                  user.loginType?.toLowerCase().split("_").join(" ") +
                  ". So please use " +
                  user.loginType?.toLowerCase().split("_").join(" ") +
                  " login option to access your account"
              ),
              null
            );
          } else next(null, user);
        } else {
          const newUser = await User.create({
            email: profile._json.email,
            password: profile._json.sub,
            username: profile._json.email?.split("@")[0],
            fullname: profile._json.email?.split("@")[0],
            avatar: profile._json.picture,
            role: UserRolesEnum.USER,
            loginType: UserLoginType.GOOGLE,
          });
          if (newUser) next(null, user);
          else
            next(new ApiError(500, "Error while registering the user"), null);
        }
      }
    )
  );

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
      },
      async (_, __, profile, next) => {
        const user = await User.findOne({ email: profile._json.email });
        if (user) {
          if (user.loginType !== UserLoginType.GITHUB) {
            next(
              new ApiError(
                400,
                "You have previously registered with " +
                  user.loginType?.toLowerCase().split("_").join(" ") +
                  ". So please use " +
                  user.loginType?.toLowerCase().split("_").join(" ") +
                  " login option to access your account"
              ),
              null
            );
          } else next(null, user);
        } else {
          if (!profile._json.email)
            next(
              new ApiError(
                400,
                "User does not have a public email associated with their account. Please try another login method"
              )
            );
          else {
            const userNameExists = await User.findOne({
              username: profile?.username,
            });

            const newUser = await User.create({
              email: profile._json.email,
              password: profile._json.sub,
              username: userNameExists
                ? profile._json.email?.split("@")[0]
                : profile?.username,
              fullname: userNameExists
                ? profile._json.email?.split("@")[0]
                : profile?.username,
              avatar: profile._json.picture,
              role: UserRolesEnum.USER,
              loginType: UserLoginType.GITHUB,
            });
            if (newUser) next(null, user);
            else
              next(new ApiError(500, "Error while registering the user"), null);
          }
        }
      }
    )
  );
} catch (error) {
  console.error("PASSPORT ERROR", error);
}
