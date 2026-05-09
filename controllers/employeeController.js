import mongoose from 'mongoose'
import Employee from '../models/Employee.js'
import User from '../models/User.js'
import Project from '../models/Project.js'
import bcrypt from 'bcrypt'
import { upload } from '../config/cloudinary.js'

const addEmployee = async (req, res) => {
    try {
        const { name, email, password, employeeId, dateOfBirth, gender, maritalStatus, designation, department, salary, role } = req.body
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Profile image is required" })
        }
        
        // Check if user already exists
        const user = await User.findOne({ email })
        if (user) return res.status(400).json({ success: false, message: "User already registered" })
        
        // Validate required fields
        if (!name || !email || !password || !employeeId || !dateOfBirth || !gender || !maritalStatus || !designation || !department || !salary || !role) {
            return res.status(400).json({ success: false, message: "All fields are required" })
        }
        
        // Hash password
        const hashPassword = await bcrypt.hash(password, 10)
        
        // Create new user - store the full Cloudinary URL
        const newUser = new User({ name, email, password: hashPassword, role, profileImage: req.file.path })
        await newUser.save()
        
        // Create new employee
        const newEmployee = new Employee({ userId: newUser._id, employeeId, dateOfBirth: new Date(dateOfBirth), gender, maritalStatus,designation, department, salary: Number(salary) })
        await newEmployee.save()
        
        return res.status(200).json({ success: true, message: "Employee added successfully" })
    } catch (error) {
        console.error("Error adding employee:", error)
        return res.status(500).json({ success: false, message: error.message || "Server error in adding employee" })
    }
}

const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate('userId', { password: 0 })
            .populate('department')
            .populate('projects')
        return res.status(200).json({ success: true, employees })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server error in getting employees" })
    }
}

const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params
        let employee
        employee = await Employee.findById(id)
            .populate('userId', { password: 0 })
            .populate('department')
            .populate('projects')
        if (!employee) {
            employee = await Employee.findOne({ userId: id })
                .populate('userId', { password: 0 })
                .populate('department')
                .populate('projects')
        }
        return res.status(200).json({ success: true, employee })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server error in getting employee by id" })
    }
}

const editEmployee = async (req, res) => {
    try {
        const { id } = req.params
        const { name, maritalStatus, designation, department, salary, projects } = req.body

        const employee = await Employee.findById({ _id: id })
        if (!employee) return res.status(400).json({ success: false, message: 'Employee not found' })

        const user = await User.findById({ _id: employee.userId })
        if (!user) return res.status(400).json({ success: false, message: 'User not found' })

        let projectIds
        if (projects !== undefined) {
            let parsedProjects = projects
            // When sent via FormData/multipart, the array is JSON-encoded as a string
            if (typeof projects === 'string') {
                try {
                    parsedProjects = JSON.parse(projects)
                } catch {
                    return res.status(400).json({ success: false, message: 'projects must be a valid JSON array' })
                }
            }
            if (!Array.isArray(parsedProjects)) {
                return res.status(400).json({ success: false, message: 'projects must be an array' })
            }
            projectIds = [...new Set(parsedProjects.map((p) => String(p)).filter((id) => mongoose.Types.ObjectId.isValid(id)))]
            if (projectIds.length > 0) {
                const count = await Project.countDocuments({ _id: { $in: projectIds } })
                if (count !== projectIds.length) {
                    return res.status(400).json({ success: false, message: 'One or more invalid project ids' })
                }
            }
        }

        // Update user - include profileImage if a new image was uploaded
        const userUpdatePayload = { name }
        if (req.file) {
            userUpdatePayload.profileImage = req.file.path
        }
        const updateUser = await User.findByIdAndUpdate({ _id: user._id }, userUpdatePayload, { new: true })
        if (!updateUser) return res.status(400).json({ success: false, message: 'User not updated' })

        const updatePayload = { maritalStatus, designation, department, salary: Number(salary) }
        if (projectIds !== undefined) updatePayload.projects = projectIds

        const updateEmployee = await Employee.findByIdAndUpdate({ _id: employee._id }, updatePayload, { new: true })
            .populate('projects')
        if (!updateEmployee) return res.status(400).json({ success: false, message: 'Employee not updated' })

        return res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            employee: updateEmployee,
            user: updateUser,
        })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server error in editing employee" })
    }
}

export { addEmployee, upload, getEmployees, getEmployeeById, editEmployee }