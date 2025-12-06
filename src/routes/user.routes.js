import { Router } from "express";
import { registerUser,
         loginUser,
         logoutUser,
         refreshAccessToken,
         updatePassword,
         getCurrentUser,
         updateAccountDetails
 } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()

router.route("/register").post(registerUser)
router.route("/loging").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/update-password").patch(verifyJWT, updatePassword)
router.route("/get-user").get(verifyJWT, getCurrentUser)
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails)

export default router