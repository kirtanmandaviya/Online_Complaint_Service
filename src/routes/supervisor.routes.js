import { registerUser,
         loginUser,
         logoutUser,
         refreshAccesssToken,
         updateAccountDetails,
         getCurrentUser,
         updatePassword
 } from "../controllers/supervisor.cotrollers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { Router } from "express";

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(verifyJWT, refreshAccesssToken)
router.route("/update-details").patch(verifyJWT, updateAccountDetails)
router.route("/getUser").get(verifyJWT, getCurrentUser)
router.route("/update-password").patch(verifyJWT, updatePassword)

export default router;