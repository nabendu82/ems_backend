import Department from "../models/Department.js";
import Employee from "../models/Employee.js"
import Leave from "../models/Leave.js";
import Timesheet from "../models/Timesheet.js"

function pad2(n) {
    return String(n).padStart(2, '0')
}

function parseYmdLocal(ymd) {
    const [y, m, da] = ymd.split('-').map(Number)
    return new Date(y, m - 1, da, 0, 0, 0, 0)
}

function weekOverlapsCalendarMonth(weekStartYmd, year, month) {
    const ws = parseYmdLocal(weekStartYmd)
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    we.setHours(23, 59, 59, 999)
    const first = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const last = new Date(year, month, 0, 23, 59, 59, 999)
    return ws.getTime() <= last.getTime() && we.getTime() >= first.getTime()
}

const getSummary = async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const totalDepartments = await Department.countDocuments();
        const totalSalaries = await Employee.aggregate([
            {$group: {_id: null, totalSalary: {$sum: "$salary"}}}
        ])

        const leaveStatus = await Leave.aggregate([
            {$group: { _id: "$status", count: { $sum: 1}}}
        ])
        
        const totalLeaveCount = leaveStatus.reduce((sum, item) => sum + item.count, 0)

        const leaveSummary = {
            appliedFor: totalLeaveCount,
            approved: leaveStatus.find(item => item._id === "approved")?.count || 0,
            rejected: leaveStatus.find(item => item._id === "rejected")?.count || 0,
            pending: leaveStatus.find(item => item._id === "pending")?.count || 0
        }

        let timesheetSummary = null
        if (req.user.role === 'admin') {
            const now = new Date()
            const y = now.getFullYear()
            const m = now.getMonth() + 1
            const monthLabel = `${y}-${pad2(m)}`

            const sheets = await Timesheet.find({
                status: { $in: ['submitted', 'approved'] },
            }).lean()

            const inMonth = sheets.filter((t) => weekOverlapsCalendarMonth(t.weekStart, y, m))
            const submittedOrApproved = inMonth
            const employeesWithSubmissions = new Set(
                submittedOrApproved.map((t) => String(t.userId))
            ).size
            const pendingSheets = inMonth.filter((t) => t.status === 'submitted')
            const approvedSheets = inMonth.filter((t) => t.status === 'approved')
            const employeesWithPendingWeeks = new Set(
                pendingSheets.map((t) => String(t.userId))
            ).size

            timesheetSummary = {
                month: monthLabel,
                employeesWithSubmissions,
                weeksPendingApproval: pendingSheets.length,
                weeksApproved: approvedSheets.length,
                employeesWithPendingWeeks,
            }
        }

        return res.status(200).json({
            success: true,
            totalEmployees,
            totalDepartments,
            totalSalary: totalSalaries[0]?.totalSalary || 0,
            leaveSummary,
            timesheetSummary,
        })
    } catch (error) {
        console.error("Dashboard Summary Failed:", error)
        return res.status(500).json({ success: false, error: "Dashboard Summary Failed" })
    }

}

export { getSummary }