import { createStatusLog,
         getAllStatusLogsForComplaint,
         getStatusLogsChangedByUser,
         getStatusLogsByDate
 } from '../controllers/statusLogs.controllers.js';
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js'

const router = Router();
router.use(verifyJWT);

router.route("/create-statusLog/s/:complaintId").post(createStatusLog);
router.route("/get-allStatusLogForCompalint/s/:complaintId").get(getAllStatusLogsForComplaint);
router.route("/get-statusLogsChagedByUser/s/:userId").get(getStatusLogsChangedByUser);
router.route("/get-statusLogs").get(getStatusLogsByDate)

export default router;