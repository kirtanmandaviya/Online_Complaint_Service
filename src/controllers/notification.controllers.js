import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.models.js"
import mongoose from "mongoose";

const createNotification = asyncHandler( async( req, res ) => {

    const { role } = req.user
    const { userId, message } = req.body;
 
    if( role !== "admin" && role !== "supervisor" ){
        throw new ApiError(403, "You have no authority to create notification!")
    }
 
    if( !userId?.trim() || !message?.trim() ){
        throw new ApiError(400, "User ID or Meaasge are required!")
    }
 
    const existingNotification  = await Notification.findOne({ 
        userId,
        message: message.trim().toLowerCase()
    })
 
    if( existingNotification  ){
        throw new ApiError(409, "This message was already sent to that user")
    }
 
    const notification = await Notification.create({
        userId,
        message: message.trim().toLowerCase()
    })

    if( !notification ){
        throw new ApiError(403, "Something went wrong while creating notification!")
    }
 
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                notification,
                "Notification created successfully"
            )
        )

})


const getAllNotification = asyncHandler( async( req, res) => {

    const userId = req.user?._id;
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const skip = ( page - 1 ) * limit;

    if( !userId ){
        throw new ApiError(403, "User ID required!")
    }

    const notifications = await Notification.find({ userId })
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })

    if( !notifications || notifications.length === 0 ){
        throw new ApiError(404, "Notification not found!")
    }

    const totalNotifications = await Notification.countDocuments({ userId })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { notifications: notifications, totalNotifications },
                "All notification fetched successfully"
            )
        )

})


const markNotificationAsRead = asyncHandler( async( req, res ) => {

    const { notificationId } = req.params;
    const userId = req.user?._id;

    if( !notificationId ){
        throw new ApiError(400, "Notification ID required!")
    }

    if( !userId ){
        throw new ApiError(400, "User ID required!")
    }

    if( !mongoose.Types.ObjectId.isValid(notificationId) ){
        throw new ApiError(400, "Invalid notification ID!")
    }

    const notification = await Notification.findById(notificationId);

    if( !notification ){
        throw new ApiError(404, "Notification not found!")
    }

    if( notification.userId.toString() !== userId.toString() ){
        throw new ApiError(403, "You are not authorized to mark this notification as read")
    }

    if(notification.isRead){
        return res
            .status(200)
            .json(
                new ApiResponse
                    (200, 
                    notification, 
                    "Notification was already marked as read"
                )
            );
    }

    notification.isRead = true;
    await notification.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                notification,
                "Notification marked as read successfully"
            )
        )
})


const deleteNotification = asyncHandler( async( req, res ) => {

    const { role, _id:userId } = req.user;
    const { notificationId } = req.params;

    if( !notificationId ){
        throw new ApiError(403, "Notification ID required!")
    }

    if( !mongoose.Types.ObjectId.isValid(notificationId) ){
        throw new ApiError(400, "Invalid notification ID!")
    }

    const notification = await Notification.findById(notificationId)

    if( !notification ){
        throw new ApiError(404, "Notification not found!")
    }

    const isOwner = notification.userId.toString() === userId.toString();
    const isAdmin = role === "admin";

    if (!isAdmin && !isOwner) {
        throw new ApiError(403, "You are not authorized to delete this notification!");
    }

    await notification.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Notifcation deleted successfully"
            )
        )

})


const markAllNotificationAsRead = asyncHandler( async( req, res ) => {

    const userId = req.user?._id;

    if( !userId ){
        throw new ApiError(400, "User ID required!")
    }

    const notification =  await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { $set: { isRead: true } }
    )

    const matched = notification.matchedCount || notification.n;
    const modified = notification.modifiedCount || notification.nModified;

    if (matched === 0) {
        throw new ApiError(404, "No unread notifications found.");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { matchedCount: matched, modifiedCount: modified },
            "All unread notifications marked as read"
        )
    );

})

export {
    createNotification,
    getAllNotification,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationAsRead
}