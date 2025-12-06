//  _id string pk
//   userId ObjectId[] users
//   message string 
//   isRead Boolean
//   createdAt Date

import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
    {
        userId:{
            type:mongoose.Types.ObjectId,
            ref:"User",
            required: true,
        },
        message: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

export const Notification = mongoose.model("Notification", notificationSchema)