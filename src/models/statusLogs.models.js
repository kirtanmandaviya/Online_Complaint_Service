//  _id string pk
//   complaintId ObjectId[] complaints
//   changedBy ObjectId[] users
//   oldStatus string
//   newStatus string
//   changedAt Date
//   createdAt Date
//   updatedAt Date

import mongoose, { Schema } from "mongoose";

const statusLogsSchema = new Schema (
    {
        complaintId:{ 
            type: mongoose.Types.ObjectId,
            ref: "Complaint",
            required: true
        },
        changedBy: {
            user: { 
                type: mongoose.Types.ObjectId, 
                required: true,
                refPath: 'changedBy.role' 
            },
            role: { 
                type: String, 
                enum: ['Admin', 'Supervisor', 'User'], 
                required: true 
            }
        },
        oldStatus: {
            type: String,
            enum: ["pending", "in_review", "resolved", "rejected"],
            required: true,
            trim: true,
            lowercase: true
        },
        newStatus: {
            type: String,
            enum: ["pending", "in_review", "resolved", "rejected"],
            required: true,
            trim: true,
            lowercase: true
        },
    },
    { timestamps: true }
)

export const StatusLog = mongoose.model("StatusLog", statusLogsSchema)