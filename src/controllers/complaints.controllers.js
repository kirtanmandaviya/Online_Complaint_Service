import { Complaint } from '../models/complaints.models.js'
import { Department } from '../models/departments.models.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { uploadOnCloudinary, deleteFromCloudinary, cloudinary } from '../utils/cloudinary.js'
import mongoose from 'mongoose'
 

const createComplaint = asyncHandler( async ( req, res ) => {

    const {
        title,
        description,
        category,
        department: departmentName,
        isAnonymous
    } = req.body

    if( !title || !description || !category || !departmentName ){
        throw new ApiError(401, " All details are required! ")
    }

    const department = await Department.findOne({ name: departmentName.trim() });

    if (!department) {
        throw new ApiError(404, "Department not found");
    }

    const submittedBy = req.user?._id

    if ( !submittedBy ) {
        throw new ApiError(401, "Unauthorized")
    }

    const imageLocalPath = req.files?.image?.[0]?.path;
    console.log("imageLocalPath:", imageLocalPath)

    let image;

    if(imageLocalPath){
        try {
            image = await uploadOnCloudinary(imageLocalPath)
            console.log("Uploaded image", image)
        } catch (error) {
            console.log("Error uploading image", error)
            throw new ApiError(500, "Failed to upload image")
        }
    }

    const videoLocalPath = req.files?.video?.[0]?.path
    console.log("videoLocalPath", videoLocalPath)

    let video;

    if(videoLocalPath){
        try {
            video = await uploadOnCloudinary(videoLocalPath)
            console.log("video uploaded", video)
        } catch (error) {
            console.log("Error uploading video", error)
            throw new ApiError(500, "Failed to upload a video")
        }
    }

    let parsedIsAnonymous;

        if (typeof isAnonymous === "undefined") {
            parsedIsAnonymous = false;
        } else if (isAnonymous === "true") {
            parsedIsAnonymous = true;
        } else if (isAnonymous === "false") {
            parsedIsAnonymous = false;
        } else {
        throw new ApiError(400, "isAnonymous must be true or false in form-data");
        }

    try {
        const complaint = await Complaint.create(
            {
                title,
                description,
                category,
                isAnonymous: parsedIsAnonymous, 
                image: {
                    url:image?.url,
                    public_id: image?.public_id
                },
                department: department._id,
                video:{
                    url: video?.url,
                    public_id: video?.public_id
                },
                submittedBy
   
            }
        )

        console.log("Parsed isAnonymous:", parsedIsAnonymous);

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    complaint,
                    "Complaint created successfully"
                )
            )
    }
    catch (error) {

         console.error("Complaint creation error:", error);

        if( video?.public_id ){
            await deleteFromCloudinary(video.public_id)
        }

        if( image?.public_id ){
            await deleteFromCloudinary(image.public_id)
        }

        throw new ApiError(500, "Something went wrong while creating a complaint!")
    }
})

const getAllComplaint = asyncHandler( async ( req, res ) => {


    try {
        
        const { department, category } = req.query;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = ( page - 1 ) * limit;

        const filter = {};
        if (category) filter.category = category.toLowerCase();

        if (department) {
            const deptDoc = await Department.findOne({ name: department.trim().toLowerCase() });
            if (!deptDoc) {
                throw new ApiError(400, "Department not found");
            }
            filter.department = deptDoc._id;
        }
       

        const complaints = await Complaint.find(filter)
            .skip(skip)
            .limit(limit)
            .populate("submittedBy", " name email")
            .populate("department", "name")
            .sort( { createdAt : -1 } );

        const total = await Complaint.countDocuments(filter)

        const sanitized = complaints.map(c => {
            const obj = c.toObject();
            if(obj.isAnonymous) delete obj.submittedBy;
            return obj;
        })

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    {
                        complaints: sanitized,
                        total,
                        page,
                        total_pages : Math.ceil(total / limit)
                    },
                    "Complaints fetched successfully"
                )
            )
    } catch (error) {
        throw new ApiError(500, "Failed to fetched complaints!")
    }

})

const getComplaintById = asyncHandler( async( req, res) => {


    const { complaintId } = req.params

    if( !complaintId ){
        throw new ApiError(400, "Complaint ID is not provided!")
    }

    if( !mongoose.Types.ObjectId.isValid(complaintId) ){
        throw new ApiError(400, "Invalid complaint ID!")
    }

    const complaint = await Complaint.findById(complaintId) 
        .populate("submittedBy", "email name")
        .populate("department", "name")

    if( !complaint ){
        throw new ApiError(404, "Complaint not found!")
    }

    const obj = complaint.toObject()

    if(obj.isAnonymous) {
        delete obj.submittedBy
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                obj,
                "Complaint fetched successfully"
            )
        )
})

const getComplaintByUser = asyncHandler( async( req, res ) => {
    
    const { userId } = req.params;

    if( !userId ){
        throw new ApiError(401, "User ID is required!")
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = ( page - 1 )* limit;

    try {
        
        const complaint = await Complaint.find( { submittedBy: userId } )
            .skip(skip)
            .limit(page)
            .populate( "department", "name")
            .sort( { createdAt: -1 } )

        const total = await Complaint.countDocuments( { submittedBy: userId } )

        const sanitized = complaint.map(c => {
            const obj = c.toObject();
            if( obj.isAnonymous ) delete obj.submittedBy
            return obj;
        })

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    {
                        complaint: sanitized,
                        total
                    },
                    "Complaints fetched successfully"
                )
            )

    } catch (error) {
        console.log("Error:", error.message)
        throw new ApiError(500, "Something went wrong while fetching complaints!")
    }

})


const assignComplaintToSupervisor = asyncHandler( async( req, res) => {

    const { complaintId } = req.params;
    const { supervisorId } = req.body;

    if( !complaintId ){
        throw new ApiError(403, "Complaint ID is required!")
    }

    const role = req.user?.role;

    if( role !== "admin" ){
        throw new ApiError(403, "Only admins can assign complaints to supervisors.")
    }

    if( !mongoose.Types.ObjectId.isValid(complaintId) ){
        throw new ApiError(400, "Invalid complaint ID!")
    }

    if( !supervisorId || !mongoose.Types.ObjectId.isValid(supervisorId) ){
        throw new ApiError(400, "Invalid supervisor ID!")
    }

    const updateComplaint = await Complaint.findByIdAndUpdate(
        complaintId,
        {
            $set:{
                assignedToSupervisor:supervisorId
            }
        },
        { new : true }
    ).populate( "department", "name" )
     .populate( "submittedBy", "name email" )
     .populate( "assignedToSupervisor", " name email " )   
     
    if( !updateComplaint ){
        throw new ApiError(404, "Complaint not found!")
    }

    const obj = updateComplaint.toObject();

    if( obj.isAnonymous ){
        delete obj.submittedBy
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                obj,
                "Complaint assigned to supervisor successfully"
            )
        )
})

const deleteComplaint = asyncHandler( async( req, res ) => {

    const { complaintId } = req.params

    if( !complaintId ){
        throw new ApiError(403, "Complaint ID required!")
    }

    const complaint = await Complaint.findById(complaintId)

    if( !complaint ){
        throw new ApiError(404, "Complaint not found!")
    }

    if( complaint.submittedBy.toString() !== req.user._id.toString() ){
        throw new ApiError(403, "You are not authorized to delete this complaint!");
    }

    await Complaint.findByIdAndDelete(complaintId)

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {},
                "Complaint deleted successfully"
            )
        )

})

const anonymousComplaintsView = asyncHandler( async( req, res ) => {

    const userId = req.user?._id;
    const role = req.user?.role;

    if( role !== "admin" ){
       throw new ApiError(403, "Only admins can view anonymous complaints.")
    }

    if( !userId ){
        throw new ApiError(403, "User ID required!")
    }

    const complaints = await Complaint.find( { isAnonymous: true } )

    console.log("Anonymous complaints fetched:", complaints);

    if( !complaints || complaints.length === 0 ){
        throw new ApiError(404, "No anonymous complaints found!")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                complaints,
                "Anonymous complaints fetched successfully"
            )
        )

})


const getAssignedSupervisor = asyncHandler( async( req, res ) => {

    const role = req.user?.role;
    const userId = req.user?._id;

    if( role !== "admin" ){
        throw new ApiError(403, "Access denied. Only admin can view this.")
    }

    if( !userId ){
        throw new ApiError(403, "User ID not provided!")
    }

    const data = await Complaint.aggregate(
        [
            {
                $match:{
                    isDeleted: false,
                    assignedToSupervisor: { $ne: null }
                }
            },
            {
                $unwind:"$assignedToSupervisor"
            },
            {
                $group:{
                    _id: "$assignedToSupervisor",
                    complaints: { $push: "$$ROOT" }
                }
            },
            {
                $lookup:{
                    from:"supervisors",
                    localField: "_id",
                    foreignField: "_id",
                    as: "supervisor"
                }
            },
            {
                $unwind:"$supervisor"
            },
            {
                $addFields:{
                    complaints:{
                        $map:{
                            input: "$complaints",
                            as:"comp",
                            in:{
                                $cond:[
                                    { $eq: ["$$comp.isAnonymous", true] },
                                    {
                                        _id: "$$comp._id",
                                        title: "$$comp.title",
                                        description: "$$comp.description",
                                        status: "$$comp.status",
                                        isAnonymous: "$$comp.isAnonymous",
                                        department: "$$comp.department",
                                        createdAt: "$$comp.createdAt", 
                                    },
                                    "$$comp"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project:{
                    _id: 0,
                    supervisor: {
                        _id: "$supervisor._id",
                        userName: "$supervisor.userName",
                        email: "$supervisor.email",
                        department: "$supervisor.department",
                        status: "$supervisor.status"
                    },
                    complaints: 1
                }
            }
        ]
    )

    console.log(data)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                data,
                "Supervisors with assigned complaints fetched."
            )
        )

})

const filterComplaint = asyncHandler( async( req, res ) => {

    const role = req.user?.role;
    const supervisorId = req.user?._id

    if( role !== "supervisor" ){
        throw new ApiError(400, "Access denied. Only supervisors can view this.")
    }

    if( !supervisorId ){
        throw new ApiError(400, "Supervisor ID required!")
    }

    const {
        status,
        department,
        category,
        isAnonymous,
        startDate,
        endDate
    } = req.query


    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = ( page - 1 ) * limit 

    const query = {
        assignedToSupervisor: { $in: [supervisorId] },
        isDeleted: false
    }

    if( status ) query.status = status.toLowerCase();
    if( category ) query.category = category.toLowerCase();
    if( isAnonymous !== undefined ) query.isAnonymous = isAnonymous === "true"
    if (department) {
        if (mongoose.Types.ObjectId.isValid(department)) {
            query.department = department;
        } else {
                const deptDoc = await Department.findOne({ name: department.trim().toLowerCase() });
                if (!deptDoc) {
                throw new ApiError(400, "Department not found");
            }
            query.department = deptDoc._id;
        }
}


    if( startDate || endDate ){
        query.createdAt = {};
        if( startDate ) query.createdAt.$gte = new Date(startDate);
        if( endDate ) query.createdAt.$lte = new Date(endDate)
    }    

    console.log("Filter query:", query);

    const complaint = await Complaint.find(query)
        .populate("submittedBy", "name email role")
        .sort( { createdAt: -1 } )
        .limit(limit)
        .skip(skip)
    
    if( !complaint ){
        throw new ApiError(404, "Complaint not found!")
    }

    const sanitized = complaint.map(c => {
        const obj = c.toObject()
        if( obj.isAnonymous ){ 
            delete obj.submittedBy
        }

        return obj;
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                sanitized,
                "Complaint fetched successfully"
            )
        )

})


export {
    createComplaint,
    getAllComplaint,
    getComplaintById,
    getComplaintByUser,
    assignComplaintToSupervisor,
    deleteComplaint,
    anonymousComplaintsView,
    filterComplaint,
    getAssignedSupervisor
}