import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Department } from '../models/departments.models.js'
import mongoose from 'mongoose';
 

const createDepartment = asyncHandler( async( req, res ) => {

        const { name, supervisor = [] , headAdmin  } = req.body
        const { role,  roleType } = req.user

        if( roleType !== "main" || role !== "admin" ){
            throw new ApiError(403, "Only main admins can perform this action.")
        }

        if( !name || typeof name !== "string" ){
            throw new ApiError(400, "Department name is required and must be a string.")
        }

        const normalizedName = name.toLowerCase().trim();

        const existedDepartment = await Department.findOne({ name: normalizedName })

        if( existedDepartment ){
            throw new ApiError( 400, "Department already exists!" )
        }

        const department = await Department.create(
            {
                name:normalizedName,
                supervisor,
                headAdmin
            }
        )

        if( !department ){
            throw new ApiError(403, "Department not created")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    201,
                    department,
                    "Department created successfully!"
                )
            )

})

const getAllDepartment = asyncHandler( async( req, res ) => {

        const { role, roleType } = req.user

        if( role !== "admin" || roleType !== "main" ){
            throw new ApiError(400, "You have no authorized to fetched data!")
        }
        
        const departments = await Department.find({})
            .populate({
                path: "supervisor",
                select: "-password -refreshToken"
            })
            .populate( "headAdmin", "-password -refreshToken")
            .populate({
                path: "user",
                select: "-password -refreshToken"
            })

        if( departments.length === 0 ){
            throw new ApiError(404, "Department not found!")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    departments,
                    "All Departments fetched successfully"
                )
            )

})

const getDepartmentById = asyncHandler( async( req, res ) => {

    const { departmentId } = req.params;
    const { role, roleType } = req.user;

    if( role !== "admin" || roleType !== "main" ){
        throw new ApiError(403, "You have no authorized to fetched data!")
    }

    if( !departmentId ){
        throw new ApiError(403, "Department ID required!")
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID");
    }

    const department = await Department.findById(departmentId)
        .populate({
            path : "supervisor",
            select: "-password -refreshToken"
        })
        .populate( "headAdmin", "-password -refreshToken")
        .populate({
            path: "user",
            select: "-password, -refreshToken"
        })

    if( !department ){
        throw new ApiError(404, "Department not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                department,
                "Department fetched successfully!"
            )
        )
})

const updateDepartment = asyncHandler( async( req, res ) =>{
    
    const { role , roleType } = req.user;
    const { name, supervisor, headAdmin, user } = req.body;
    const { departmentId } = req.params;

    if( role !== "admin" || roleType !== "main" ){
        throw new ApiError(403, "You have no authorized to update data!")
    }

    if( !name && !supervisor && !headAdmin && !user){
        throw new ApiError(403, "Credentials required!")
    }

    if( !departmentId ){
        throw new ApiError(403, "Department ID required!")
    }

    const normalizedName = name ? name.toLowerCase().trim() : undefined;

    const updateFields = {};
        if (name) updateFields.name = normalizedName;
        if (supervisor) updateFields.supervisor = supervisor;
        if (headAdmin) updateFields.headAdmin = headAdmin;
        if(user) updateFields.user = user;

    const department = await Department.findByIdAndUpdate(
        departmentId,
        { $set: updateFields },
        { new: true }
    );

    if( !department ){
        throw new ApiError(404, "Department not found!")
    }

    const updatedDepartment = await Department.findById(departmentId)
        .populate({
            path: "supervisor",
            select: "-password -refreshToken"
        })
        .populate( "headAdmin", "-password -refreshToken" )
        .populate({
            path:"user",
            select: "-password -refreshToken"
        })

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                updatedDepartment,
                "Department updated successfully"
            )
        )
})

const deleteDepartment = asyncHandler( async( req, res ) => {
    
    const { role, roleType } = req.user;
    const { departmentId } = req.params;

    if( role !== "admin" || roleType !== "main" ){
        throw new ApiError(403, "You have no authority to delete data!")
    }

    if( !departmentId ){
        throw new ApiError(403, "Department ID required!")
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID");
    }

    const department = await Department.findByIdAndDelete(departmentId)

    if( !department ){
        throw new ApiError(404, "Department not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Department deleted successfully"
            )
        )
})

const getDepartmentByHeadAdmin = asyncHandler( async( req, res ) => {

    const { role } = req.user;
    const { headAdminId } = req.params;

    if( role !== "admin" ){
        throw new ApiError(403, "You are not authorized to fetch data!")
    }

    if( !headAdminId || !mongoose.Types.ObjectId.isValid(headAdminId) ){
        throw new ApiError(400, "Invalid headAdmin ID")
    }

    const department = await Department.find( { headAdmin: headAdminId } )
        .populate( "headAdmin", "-password -refreshToken" )
        .populate( "supervisor", "-password -refreshToken")
        .populate( "user", "-password -refreshToken" )

    if( !department || department.length === 0 ){
        throw new ApiError(404, "Department not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                department,
                "Department fetched successfully"
            )
        )

})

const getSupervisor = asyncHandler( async( req, res ) => {

    const { role } = req.user;
    const { departmentId } = req.params;

    if( role !== "admin" ){
        throw new ApiError(403, "You are not authorized to fetch data!")
    }

    if( !departmentId || !mongoose.Types.ObjectId.isValid(departmentId) ){
        throw new ApiError(400, "Invalid or Missing department ID!")
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError(400, "Invalid department ID");
    }

    const department = await Department.findById(departmentId)
        .populate({
            path: "supervisor",
            select: "-password -refreshToken"
        })
        .select("-headAdmin")
        .select("-user")

    if( !department ){
        throw new ApiError(404, "Department not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                department,
                "Supervisor fetched successfully"
            )
        )
})

const getHeadAdmin = asyncHandler( async( req, res ) => {

    const { role } = req.user;
    const { departmentId } = req.params;

    if( role !== "admin" ){
        throw new ApiError(403, "You are not authorized to fetch data!")
    }

    if( !departmentId || !mongoose.Types.ObjectId.isValid(departmentId) ){
        throw new ApiError(400, "Invalid or Missing department ID!")
    }

    const department = await Department.findById(departmentId)
        .populate( "headAdmin", "-password -refreshToken" )
        .select("-supervisor")
        .select("-user")

    if( !department ){
        throw new ApiError(404, "Department not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                department,
                "Head admin fetched successfully"
            )
        )
}) 

export { 
    createDepartment,
    getAllDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    getDepartmentByHeadAdmin,
    getSupervisor,
    getHeadAdmin
}