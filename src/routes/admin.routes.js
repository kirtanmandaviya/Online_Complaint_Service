import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import { registerUser,
         loginUser,
         logoutUser,
         refreshAccesssToken,
         updatePassword,
         updateAccountDetails,
         getCurrentUser,
         assignDepartmentAdmin
 } from '../controllers/admin.controllers.js'

const router = Router()

router.route("/register-user").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(verifyJWT, refreshAccesssToken)
router.route("/update-password").patch(verifyJWT, updatePassword)
router.route("/update-details").patch(verifyJWT, updateAccountDetails)
router.route("/get-user").get(verifyJWT, getCurrentUser)
router.route("/assign-departmentAdmin").patch(verifyJWT,assignDepartmentAdmin)

export default router