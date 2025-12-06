import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
)

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from './routes/user.routes.js';
import supervisorRouter from './routes/supervisor.routes.js';
import adminRouter from './routes/admin.routes.js';
import complaintRouter from './routes/complaints.routes.js';
import departmentRouter from './routes/department.routes.js';
import notificationRouter from './routes/notification.routes.js';
import statusLogRouter from './routes/statuslogs.routes.js'

app.use("/api/o1/user", userRouter);
app.use("/api/o1/supervisor", supervisorRouter);
app.use("/api/o1/admin", adminRouter); 
app.use("/api/o1/complaint", complaintRouter);
app.use("/api/o1/department", departmentRouter);
app.use("/api/o1/notification", notificationRouter);
app.use("/api/o1/statusLog", statusLogRouter)

export { app }