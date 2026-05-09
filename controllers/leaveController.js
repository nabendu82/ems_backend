import mongoose from 'mongoose'
import Leave from '../models/Leave.js'
import Employee from '../models/Employee.js'

const addLeave = async (req, res) => {
    try {
        const { userId, leaveType, startDate, endDate, reason } = req.body
        const newLeave = new Leave({ userId, leaveType, startDate, endDate, reason })
        await newLeave.save()
        return res.status(200).json({ success: true })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Add Leave Failed" })
    }
}

const getLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ userId: req.user._id }).sort({ createdAt: -1 })
        return res.status(200).json({ success: true, leaves })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Fetch leaves failed" })
    }
}

const getAllLeaves = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const leaves = await Leave.find().populate('userId', 'name').sort({ createdAt: -1 })
        const userIds = leaves.map((l) => l.userId?._id ?? l.userId).filter(Boolean)
        const employees = await Employee.find({ userId: { $in: userIds } }).populate('department', 'name')
        const byUserId = new Map()
        employees.forEach((e) => {
            byUserId.set(String(e.userId), {
                employeeId: e.employeeId,
                departmentName: e.department?.name ?? 'N/A',
            })
        })
        const enriched = leaves.map((leave) => {
            const uid = String(leave.userId?._id ?? leave.userId)
            const emp = byUserId.get(uid) ?? {}
            return {
                _id: leave._id,
                userId: uid,
                employeeId: emp.employeeId ?? 'N/A',
                employeeName: leave.userId?.name ?? 'N/A',
                department: emp.departmentName ?? 'N/A',
                leaveType: leave.leaveType,
                startDate: leave.startDate,
                endDate: leave.endDate,
                reason: leave.reason,
                status: leave.status,
                createdAt: leave.createdAt,
            }
        })
        return res.status(200).json({ success: true, leaves: enriched })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Fetch all leaves failed' })
    }
}

const getLeavesForEmployee = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid employee id' })
        }
        const employee = await Employee.findById(id)
            .populate('userId', 'name')
            .populate('department', 'name')

        if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' })
        
        const leaves = await Leave.find({ userId: employee.userId?._id ?? employee.userId }).sort({ createdAt: -1 })
        const enriched = leaves.map((leave) => ({
            _id: leave._id,
            employeeId: employee.employeeId ?? 'N/A',
            employeeName: employee.userId?.name ?? 'N/A',
            department: employee.department?.name ?? 'N/A',
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            reason: leave.reason,
            status: leave.status,
            createdAt: leave.createdAt,
        }))
        return res.status(200).json({ success: true, leaves: enriched })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Fetch employee leaves failed' })
    }
}

const leaveTypeDisplay = (type) => {
    const map = { casual: 'Casual Leave', sick: 'Sick Leave', annual: 'Annual Leave' }
    return map[type] ?? type ?? 'N/A'
}

const statusDisplay = (status) => {
    const s = (status ?? 'pending').toLowerCase()
    if (s === 'approved') return 'Approved'
    if (s === 'rejected') return 'Rejected'
    return 'Pending'
}

const getLeaveById = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid leave id' })
        }
        const leave = await Leave.findById(id).populate('userId', 'name profileImage')
        if (!leave) {
            return res.status(404).json({ success: false, error: 'Leave not found' })
        }
        const ownerId = leave.userId?._id ?? leave.userId
        if (req.user.role === 'employee' && String(ownerId) !== String(req.user._id)) {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }

        const employee = await Employee.findOne({ userId: ownerId }).populate('department', 'name')

        return res.status(200).json({
            success: true,
            leave: {
                _id: leave._id,
                name: leave.userId?.name ?? 'N/A',
                profileImage: leave.userId?.profileImage ?? null,
                employeeId: employee?.employeeId ?? 'N/A',
                department: employee?.department?.name ?? 'N/A',
                leaveType: leave.leaveType,
                leaveTypeDisplay: leaveTypeDisplay(leave.leaveType),
                reason: leave.reason ?? '-',
                startDate: leave.startDate,
                endDate: leave.endDate,
                status: leave.status,
                statusDisplay: statusDisplay(leave.status),
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Fetch leave failed' })
    }
}

const updateLeaveStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const { id } = req.params
        const { status } = req.body
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid leave id' })
        }
        if (status !== 'approved' && status !== 'rejected') {
            return res.status(400).json({ success: false, error: 'Status must be approved or rejected' })
        }
        const leave = await Leave.findById(id)
        if (!leave) {
            return res.status(404).json({ success: false, error: 'Leave not found' })
        }
        if (leave.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Only pending leaves can be updated' })
        }
        leave.status = status
        leave.updatedAt = new Date()
        await leave.save()
        return res.status(200).json({
            success: true,
            status: leave.status,
            statusDisplay: statusDisplay(leave.status),
        })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Update leave status failed' })
    }
}

export { addLeave, getLeaves, getAllLeaves, getLeavesForEmployee, getLeaveById, updateLeaveStatus }