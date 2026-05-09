import Department from '../models/Department.js'
import Employee from '../models/Employee.js'
import User from '../models/User.js'
import Leave from '../models/Leave.js'
import Salary from '../models/Salary.js'

const addDepartment = async (req, res) => {
    try {
        const { name, description } = req.body
        const newDep = new Department({ name, description })
        await newDep.save()
        return res.status(200).json({ success: true, department: newDep })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Add Department Failed" })
    }
}

const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find()
        return res.status(200).json({ success: true, departments })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Get Departments Failed" })
    }
}

const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params
        const department = await Department.findById(id)
        return res.status(200).json({ success: true, department })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Edit Department Failed" })
    }
}

const editDepartment = async (req, res) => {
    try {
        const { id } = req.params
        const { name, description } = req.body
        const department = await Department.findByIdAndUpdate({_id: id }, { name, description }, { new: true })
        return res.status(200).json({ success: true, department })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Edit Department Failed" })
    }
}

const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params
        const department = await Department.findById(id)
        if (!department) {
            return res.status(404).json({ success: false, error: "Department not found" })
        }

        // Find all employees in this department
        const employees = await Employee.find({ department: id })
        const userIds = employees.map((emp) => emp.userId).filter(Boolean)

        // Delete all leaves associated with these users
        if (userIds.length > 0) {
            await Leave.deleteMany({ userId: { $in: userIds } })

            // Delete all salaries associated with these users
            await Salary.deleteMany({ userId: { $in: userIds } })

            // Delete the users themselves
            await User.deleteMany({ _id: { $in: userIds } })
        }

        // Delete all employees in this department
        await Employee.deleteMany({ department: id })

        // Finally delete the department
        await Department.findByIdAndDelete(id)

        return res.status(200).json({
            success: true,
            message: `Department deleted successfully along with ${employees.length} employee(s) and their associated records`
        })
    } catch (error) {
        console.error("Delete Department Failed:", error)
        return res.status(500).json({ success: false, error: "Delete Department Failed" })
    }
}

export { addDepartment, getDepartments, getDepartmentById, editDepartment, deleteDepartment }