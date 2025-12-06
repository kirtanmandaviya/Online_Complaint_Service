import { createNotification,
         getAllNotification,
         markNotificationAsRead,
         deleteNotification,
         markAllNotificationAsRead
 } from '../controllers/notification.controllers.js'
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();
router.use(verifyJWT);

router.route("/create-notification").post(createNotification);
router.route("/get-all-notification").get(getAllNotification);
router.route("/make-notificationAsRead/n/:notificationId").patch(markNotificationAsRead);
router.route("/delete-notification/n/:notificationId").delete(deleteNotification);
router.route("/mark-all-notificationAsRead").patch(markAllNotificationAsRead)

export default router;