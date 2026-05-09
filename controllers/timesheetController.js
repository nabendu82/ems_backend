import mongoose from 'mongoose'
import Timesheet from '../models/Timesheet.js'
import Employee from '../models/Employee.js'

function pad2(n) {
    return String(n).padStart(2, '0')
}

/** Monday (local) as YYYY-MM-DD */
function mondayYmdFromDate(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    const day = x.getDay()
    const diff = day === 0 ? -6 : 1 - day
    x.setDate(x.getDate() + diff)
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
}

function parseYmdLocal(ymd) {
    const [y, m, da] = ymd.split('-').map(Number)
    return new Date(y, m - 1, da, 0, 0, 0, 0)
}

function addDaysYmd(ymd, days) {
    const dt = parseYmdLocal(ymd)
    dt.setDate(dt.getDate() + days)
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

function stripLocalDate(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

/** Week can be created/edited only if its Monday is not in the future (local). */
function canInteractWithWeek(weekStartYmd) {
    const monday = stripLocalDate(parseYmdLocal(weekStartYmd))
    const today = stripLocalDate(new Date())
    return monday.getTime() <= today.getTime()
}

async function finalizeTimesheetRows(userId, rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length < 1) {
        throw new Error('At least one row is required')
    }
    const employee = await Employee.findOne({ userId }).populate('projects')
    if (!employee) {
        throw new Error('Employee profile not found')
    }
    const designation = (employee.designation || 'Staff').trim()
    const assigned = employee.projects || []
    const allowed = new Set(assigned.map((p) => String(p._id)))
    const nameById = new Map(assigned.map((p) => [String(p._id), p.name]))
    const projectByName = new Map(assigned.map((p) => [p.name, p]))

    return rawRows.map((r) => {
        let hours = Array.isArray(r.hours) ? r.hours.map((h) => Number(h)) : []
        if (hours.length !== 7) {
            hours = [0, 0, 0, 0, 0, 0, 0]
        }
        hours = hours.map((h) => (Number.isFinite(h) && h >= 0 ? Math.min(h, 24) : 0))

        let projectIdStr = null
        const pidRaw = r.projectId
        if (pidRaw != null && pidRaw !== '') {
            const s = String(pidRaw)
            if (mongoose.Types.ObjectId.isValid(s)) projectIdStr = s
        }
        let projectName = String(r.project ?? '').trim()

        if (assigned.length > 0) {
            if (!projectIdStr || !allowed.has(projectIdStr)) {
                const legacy = projectByName.get(projectName)
                if (legacy) projectIdStr = String(legacy._id)
            }
            if (!projectIdStr || !allowed.has(projectIdStr)) {
                throw new Error('Each row must use a project assigned to you (select from the Project dropdown)')
            }
            projectName = nameById.get(projectIdStr) || projectName
            if (!projectName) {
                throw new Error('Invalid project')
            }
            return {
                projectId: new mongoose.Types.ObjectId(projectIdStr),
                project: projectName,
                activity: designation,
                hours,
            }
        }

        if (!projectName) {
            throw new Error('Project name is required for each row')
        }
        return {
            project: projectName,
            activity: designation,
            hours,
        }
    })
}

/** Each Mon–Fri totals 8h (normal day) or 0 (leave / company holiday). */
function weekdayTotalsValid(rows) {
    for (let d = 0; d < 5; d++) {
        let sum = 0
        for (const r of rows) {
            sum += Number(r.hours[d] ?? 0)
        }
        const ok = sum <= 0.05 || Math.abs(sum - 8) <= 0.05
        if (!ok) return { ok: false, day: d }
    }
    return { ok: true }
}

const getTimesheetWeek = async (req, res) => {
    try {
        let weekStart = req.query.weekStart
        if (!weekStart || typeof weekStart !== 'string') {
            weekStart = mondayYmdFromDate(new Date())
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
            return res.status(400).json({ success: false, error: 'Invalid weekStart' })
        }
        const normalizedMonday = mondayYmdFromDate(parseYmdLocal(weekStart))
        weekStart = normalizedMonday
        const weekEnd = addDaysYmd(weekStart, 6)
        const canCreate = canInteractWithWeek(weekStart)

        const timesheet = await Timesheet.findOne({ userId: req.user._id, weekStart })

        const employee = await Employee.findOne({ userId: req.user._id })
            .populate('department', 'name')
            .populate('projects', 'name description')
            .lean()

        return res.status(200).json({
            success: true,
            weekStart,
            weekEnd,
            canCreate,
            timesheet,
            employeeTimesheetContext: employee
                ? {
                      designation: employee.designation,
                      projects: employee.projects || [],
                  }
                : null,
        })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to load timesheet' })
    }
}

const createTimesheet = async (req, res) => {
    try {
        let { weekStart } = req.body
        if (!weekStart || typeof weekStart !== 'string') {
            return res.status(400).json({ success: false, error: 'weekStart is required' })
        }
        const normalizedMonday = mondayYmdFromDate(parseYmdLocal(weekStart))
        weekStart = normalizedMonday
        if (!canInteractWithWeek(weekStart)) {
            return res.status(400).json({ success: false, error: 'This week has not started yet' })
        }
        const existing = await Timesheet.findOne({ userId: req.user._id, weekStart })
        if (existing) {
            return res.status(400).json({ success: false, error: 'Timesheet already exists for this week' })
        }
        const employee = await Employee.findOne({ userId: req.user._id })
            .populate('department', 'name')
            .populate('projects')
        const activity = employee?.designation?.trim() || 'Staff'

        let rows
        if (employee?.projects?.length) {
            const p0 = employee.projects[0]
            rows = [
                {
                    projectId: p0._id,
                    project: p0.name,
                    activity,
                    hours: [8, 8, 8, 8, 8, 0, 0],
                },
            ]
        } else {
            const deptName = employee?.department?.name?.trim()
            const project = deptName ? `Department – ${deptName}` : 'General assignment'
            rows = [{ project, activity, hours: [8, 8, 8, 8, 8, 0, 0] }]
        }
        const timesheet = await Timesheet.create({ userId: req.user._id, weekStart, status: 'draft', rows })
        return res.status(201).json({ success: true, timesheet })
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, error: 'Timesheet already exists for this week' })
        return res.status(500).json({ success: false, error: 'Failed to create timesheet' })
    }
}

const saveTimesheet = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid timesheet id' })
        }
        let rows
        try {
            rows = await finalizeTimesheetRows(req.user._id, req.body.rows)
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message })
        }

        const timesheet = await Timesheet.findOne({ _id: id, userId: req.user._id })
        if (!timesheet) {
            return res.status(404).json({ success: false, error: 'Timesheet not found' })
        }
        if (timesheet.status !== 'draft') {
            return res.status(400).json({ success: false, error: 'Only draft timesheets can be edited' })
        }
        if (!canInteractWithWeek(timesheet.weekStart)) {
            return res.status(400).json({ success: false, error: 'This week is not available yet' })
        }

        timesheet.rows = rows
        timesheet.status = 'draft'
        timesheet.updatedAt = new Date()
        await timesheet.save()
        return res.status(200).json({ success: true, timesheet })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to save timesheet' })
    }
}

const submitTimesheet = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid timesheet id' })
        }

        const timesheet = await Timesheet.findOne({ _id: id, userId: req.user._id })
        if (!timesheet) {
            return res.status(404).json({ success: false, error: 'Timesheet not found' })
        }
        if (timesheet.status !== 'draft') {
            return res.status(400).json({ success: false, error: 'Only draft timesheets can be submitted' })
        }
        if (!canInteractWithWeek(timesheet.weekStart)) {
            return res.status(400).json({ success: false, error: 'This week is not available yet' })
        }

        let rows
        try {
            rows =
                req.body.rows != null
                    ? await finalizeTimesheetRows(req.user._id, req.body.rows)
                    : await finalizeTimesheetRows(req.user._id, timesheet.rows)
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message })
        }
        const check = weekdayTotalsValid(rows)
        if (!check.ok) {
            return res.status(400).json({
                success: false,
                error: 'Each Monday–Friday must total 8 hours across all rows, or 0 for a full leave / holiday day',
            })
        }

        timesheet.rows = rows
        timesheet.status = 'submitted'
        timesheet.submittedAt = new Date()
        timesheet.updatedAt = new Date()
        await timesheet.save()
        return res.status(200).json({ success: true, timesheet })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to submit timesheet' })
    }
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

function totalHoursFromRows(rows) {
    let t = 0
    for (const r of rows || []) {
        for (const h of r.hours || []) {
            t += Number(h) || 0
        }
    }
    return Math.round(t * 100) / 100
}

const adminListTimesheets = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const now = new Date()
        let year = parseInt(req.query.year, 10)
        let month = parseInt(req.query.month, 10)
        if (!Number.isFinite(year)) year = now.getFullYear()
        if (!Number.isFinite(month) || month < 1 || month > 12) month = now.getMonth() + 1

        const all = await Timesheet.find({
            status: { $in: ['submitted', 'approved'] },
        })
            .populate('userId', 'name email')
            .sort({ weekStart: -1, updatedAt: -1 })
            .lean()

        const inMonth = all.filter((t) => weekOverlapsCalendarMonth(t.weekStart, year, month))

        const userIds = [...new Set(inMonth.map((t) => String(t.userId?._id ?? t.userId)))]
        const employees = await Employee.find({ userId: { $in: userIds } }).lean()
        const empByUser = new Map(employees.map((e) => [String(e.userId), e.employeeId]))

        const list = inMonth.map((t) => {
            const uid = t.userId?._id ?? t.userId
            const uidStr = String(uid)
            return {
                _id: t._id,
                userId: uidStr,
                employeeName: t.userId?.name ?? 'N/A',
                employeeId: empByUser.get(uidStr) ?? 'N/A',
                weekStart: t.weekStart,
                weekEnd: addDaysYmd(t.weekStart, 6),
                status: t.status,
                submittedAt: t.submittedAt,
                approvedAt: t.approvedAt,
                totalHours: totalHoursFromRows(t.rows),
            }
        })

        return res.status(200).json({ success: true, year, month, timesheets: list })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to list timesheets' })
    }
}

const getTimesheetAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid timesheet id' })
        }
        const timesheet = await Timesheet.findById(id)
            .populate('userId', 'name email profileImage')
            .populate('approvedBy', 'name email')
            .lean()

        if (!timesheet) {
            return res.status(404).json({ success: false, error: 'Timesheet not found' })
        }

        const employee = await Employee.findOne({ userId: timesheet.userId?._id ?? timesheet.userId })
            .populate('department', 'name')
            .lean()

        return res.status(200).json({
            success: true,
            timesheet: {
                ...timesheet,
                employeeId: employee?.employeeId ?? 'N/A',
                department: employee?.department?.name ?? 'N/A',
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to load timesheet' })
    }
}

const approveTimesheet = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid timesheet id' })
        }
        const timesheet = await Timesheet.findById(id)
        if (!timesheet) {
            return res.status(404).json({ success: false, error: 'Timesheet not found' })
        }
        if (timesheet.status !== 'submitted') {
            return res.status(400).json({ success: false, error: 'Only submitted timesheets can be approved' })
        }
        timesheet.status = 'approved'
        timesheet.approvedAt = new Date()
        timesheet.approvedBy = req.user._id
        timesheet.updatedAt = new Date()
        await timesheet.save()
        const populated = await Timesheet.findById(timesheet._id)
            .populate('userId', 'name email')
            .populate('approvedBy', 'name email')
        return res.status(200).json({ success: true, timesheet: populated })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to approve timesheet' })
    }
}

export { getTimesheetWeek, createTimesheet, saveTimesheet, submitTimesheet, adminListTimesheets, getTimesheetAdmin, approveTimesheet }
