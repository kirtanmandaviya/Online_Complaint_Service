// complaints[icon:list]{
//   _id string pk
//   title string
//   description string
//   category string  // "ragging", "harassment", "other"
//   submittedBy ObjectId[] users
//   status string  // "pending", "in-review", "resolved", "rejected"
//    isAnonymous Boolean  // For hidding student identification
//    attachments [string]  //// file URLs or file IDs
//    department string
//    assignedToSupervisor ObjectId[] supervisors
//    createdAt Date
//    updatedAt Date
//  }

import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
    {
        title:{
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            enum: ["ragging", "harassment", "other"],
            lowercase: true,
            trim: true
        },
        submittedBy:{
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        status: {
            type: String,
            enum: ["pending", "in_review", "resolved", "rejected"],
            default: "pending",
            lowercase: true,
            trim : true
        },
        isAnonymous: {
            type: Boolean,
            default: false
        },
        image:{
            url : { type : String },
            public_id: { type: String }
        },
        video:{
            url: { type : String },
            public_id: { type: String }
        },
        department: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "Department"
        },
        assignedToSupervisor:[{
            type: Schema.Types.ObjectId,
            ref: "Supervisor"
        }],
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

export const Complaint = mongoose.model("Complaint", complaintSchema)