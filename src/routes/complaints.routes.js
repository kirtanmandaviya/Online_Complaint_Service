import { createComplaint,
         getAllComplaint,
         getComplaintById,
         getComplaintByUser,
         assignComplaintToSupervisor,
         deleteComplaint,
         anonymousComplaintsView,
         filterComplaint,
         getAssignedSupervisor
 } from '../controllers/complaints.controllers.js'
import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middlewares.js'
import { upload } from '../middlewares/multer.middlewares.js'

const router = Router()
router.use(verifyJWT)

router.route('/create-complaint').post(
    upload.fields([
        {
            name:"video",
            maxCount:2
        },
        {
            name: "image",
            maxCount: 5,
        },
    ]),
    createComplaint)
router.route('/get-all-complaint').get(getAllComplaint)
router.route('/get-complaintById/c/:complaintId').get(getComplaintById)
router.route('/get-complaintByUserId/c/:userId').get(getComplaintByUser)
router.route('/assign-complaint/c/:complaintId').patch(assignComplaintToSupervisor)
router.route("/delete-complaint/c/:complaintId").delete(deleteComplaint)
router.route("/get-anonymous-complaints").get(anonymousComplaintsView)
router.route("/filter-complaint").get(filterComplaint)
router.route("/get-assign-supervisor").get(getAssignedSupervisor)

export default router