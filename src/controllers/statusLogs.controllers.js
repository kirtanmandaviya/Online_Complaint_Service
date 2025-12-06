import { StatusLog } from '../models/statusLogs.models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Complaint } from '../models/complaints.models.js';
import { Department } from '../models/departments.models.js';
import { User } from '../models/user.models.js';
import { Notification } from '../models/notification.models.js';
import mongoose from "mongoose";

const VALID_STATUS_TRANSITIONS = {
    pending: ["in_review", "rejected"],
    in_review: ["resolved", "rejected"],
    resolved: [],
    rejected: []
}

const createStatusLog = asyncHandler( async( req, res ) => {

    const { role, _id:userId } = req.user;
    const { newStatus } = req.body;
    const { complaintId } = req.params


    if( role !== "admin" && role !== "supervisor" ){
        throw new ApiError(403, "You have no authority to create status log!")
    }

    if( !newStatus ){
        throw new ApiError(400, "New status required!")
    }

    const complaint = await Complaint.findById(complaintId).populate("submittedBy");

    if( !complaint ){
        throw new ApiError(404, "Complaint not found!")
    }

    const oldStatus = complaint.status;
    const currentStatus = complaint.status;
    const validNextStatuses = VALID_STATUS_TRANSITIONS[oldStatus];

    if( !validNextStatuses || !validNextStatuses.includes(newStatus) ){
        throw new ApiError(400,  `Invalid status transition from '${currentStatus}' to '${newStatus}'`)
    }


    complaint.status = newStatus;
    await complaint.save();

    const statusLog = await StatusLog.create({
        complaintId,
        changedBy: {
            user: userId,
            role: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
        },
        oldStatus,
        newStatus
    })

    if( !statusLog ){
        throw new ApiError(403, "Something went wrong while creating status log!")
    }

    await Notification.create({
        userId: complaint.submittedBy._id,
        message: `The status of your complaint has been updated to '${newStatus}'`
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                statusLog,
                "Status log created successfully"
            )
        )

})


const getAllStatusLogsForComplaint = asyncHandler( async( req, res ) => {

    const { complaintId } = req.params;
    const { role } = req.user;
    const userId = req.user?._id

    if( !complaintId ){
        throw new ApiError(400, "Complaint ID required!")
    }

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        throw new ApiError(400, "Invalid Complaint ID format.");
    }

    const complaint = await Complaint.findById(complaintId);

    if( !complaint ){
        throw new ApiError(404, "Complaint not found!")
    }

    const isOwner = complaint.submittedBy?.toString() === userId.toString();
    const supervisorIds = (complaint.assignedToSupervisor || [])
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map((id) => id.toString());

    const isAssignedSupervisor = supervisorIds.includes(userId.toString());

    if( !isOwner && !isAssignedSupervisor && role !== "admin" ){
        throw new ApiError(403, "You are not authorized to view status logs for this complaint.")
    }

    const statusLogs = await StatusLog.find( { complaintId } )
        .populate('changedBy.user', 'fullName email')
        .sort({ createdAt: -1 })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                statusLogs,
                "Status logs fetched successfully"
            )
        )
})


const getStatusLogsChangedByUser = asyncHandler( async( req, res ) => {

    const { role, roleType, _id: adminId } = req.user;
    const userId = req.params.userId;

    if( role !== "admin"){
        throw new ApiError(403, "Access denied!")
    }

    if( !mongoose.Types.ObjectId.isValid(userId) ){
        throw new ApiError(400, "Invalid user ID!")
    }

    const userIdObj = new mongoose.Types.ObjectId(userId) 

    if( roleType === "main" ){
        const logs = await StatusLog.find({ 'changedBy.user': userIdObj })
            .populate(
                {
                    path: "complaintId",
                    populate: { path: "submittedBy", select: "_id fullName userName" }
                }
            ).populate( 'changedBy.user', '_id userName fullName' )

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    logs,
                    "All logs fetched successfully"
                )
            )
    }

    if( roleType === "departmentAdmin" ){
        const [ departmentsManaged, targetUser ] = await Promise.all([
            Department.find({ headAdmin: adminId }).select("_id"),
            User.findById(userId).select("department")
        ])

    if( !targetUser ){
        throw new ApiError(404, "User not found!")
    }

    const managedIds = departmentsManaged.map(dep => dep._id.toString())
    const userDeps = targetUser.department.map(dep => dep.toString())

    const hasAccess = userDeps.some(dep => managedIds.includes(dep));

    if( !hasAccess ){
        throw new ApiError(403, "Access denied. User is not in your department!")
    }

    const logs = await StatusLog.find({ "changedBy.user-": userIdObj })
        .populate(
            {
                path: "complaintId",
                populate: { path: "submittedBy", select: "_id fullName userName" }
            }
        ).populate( 'changedBy.user', '_id userName fullName' )

        const sanitizedLogs = logs.map(log => {
            const logObj = JSON.parse(JSON.stringify(log));
            if(logObj.complaintId?.isAnonymous){
                delete logObj.complaintId.submittedBy
            };
            return logObj;
        })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                sanitizedLogs,
                "Logs fetched successfully"
            )
        )

    }

})


const getStatusLogsByDate = asyncHandler( async( req, res ) => {

    const { role, roleType, _id:currentUserId } = req.user;
    const { startDate, endDate } = req.query;

    if( role === "user"){
        throw new ApiError(403, "Access denied!")
    }

    if (startDate && isNaN(Date.parse(startDate))) {
    throw new ApiError(400, "Invalid start date format.");
    }
 

    if (endDate && isNaN(Date.parse(endDate))) {
    throw new ApiError(400, "Invalid end date format.");
    }

    const query = {}

    if( startDate || endDate ){
        query.createdAt = {};
        if( startDate ) query.createdAt.$gte = new Date(startDate);
        if( endDate ) query.createdAt.$lte = new Date(endDate)
    }


    if( role === "admin" && roleType === "main" ){
        const logs = await StatusLog.find(query)
            .populate(
                {
                    path: "complaintId",
                    populate: { path: "submittedBy", select: "_id fullName userName" }
                }
            )
            .populate(
                {
                    path:"changedBy.user",
                    select: "_id userName fullName"
                }
            )

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    logs,
                    "All logs fetched successfully"
                )
            )
    }
    else if( role === "admin" && roleType === "departmentAdmin" ){
        const departmentsManaged = await Department.find({ headAdmin: currentUserId }).select("_id")

        const managedIds = departmentsManaged.map(dep => dep._id.toString());

        const user = await User.find({ department: { $in:managedIds } }).select("_id")

        const userIds = user.map(u => u._id)

        const logs = await StatusLog.find({
            ...query,
            changedBy: { $in:  userIds  }
        }).populate(
            {
                path: "complaintId",
                populate: { path: "submittedBy", select: "_id userName fullName" }
            }
        ).populate(
            {
                path: "changedBy.user", select: "_id userName fullName"
            }
        )

        const sanitizedLogs = logs.map(log => {
            const logObj = JSON.parse(JSON.stringify(log))
            if( logObj.complaintId?.isAnonymous ){
                delete logObj.complaintId.submittedBy
            };
            return logObj
        })

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    sanitizedLogs,
                    "All logs fetched successfully"
                )
            )
    }
    else if( role === "supervisor" ){

        const departments = await Department.find({ headSupervisor: currentUserId }).select("_id")

        if( !departments.length ){
            throw new ApiError(403, "Access denied. You are not a head supervisor.")
        }

        const complaints = await Complaint.find({ department: { $in: departments.map(dep => dep._id) } }).select("_id");
        const complaintIds = complaints.map(c => c._id)

        const logs = await StatusLog.find(
            {
                ...query,
                complaintId: { $in: complaintIds  }
            }
        ).populate(
            {
                path: "complaintId",
                populate: { path: "submittedBy", select: "_id userName fullName" }
            }
        ).populate(
            {
                path: "changedBy.user", select: "_id userName fullName"
            }
        )

        const sanitizedLogs = logs.map(log => {
            const logObj = JSON.parse(JSON.stringify(log))
            if(logObj.complaintId?.isAnonymous){
                delete logObj.complaintId.submittedBy
            }
            return logObj;
        })

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    sanitizedLogs,
                    "All log fetched successfully"
                )
            )
    }
    else {
        throw new ApiError(403, "You do not have permission to access these logs.");
    }

})

export {
    createStatusLog,
    getAllStatusLogsForComplaint,
    getStatusLogsChangedByUser,
    getStatusLogsByDate
}