import express from 'express'
import authMiddleware from '../middlewares/authMiddleware.js'
import {
    getTimesheetWeek,
    createTimesheet,
    saveTimesheet,
    submitTimesheet,
    adminListTimesheets,
    getTimesheetAdmin,
    approveTimesheet,
} from '../controllers/timesheetController.js'

const router = express.Router()

router.get('/admin/list', authMiddleware, adminListTimesheets)
router.patch('/admin/:id/approve', authMiddleware, approveTimesheet)
router.get('/admin/:id', authMiddleware, getTimesheetAdmin)
router.get('/', authMiddleware, getTimesheetWeek)
router.post('/', authMiddleware, createTimesheet)
router.patch('/:id/submit', authMiddleware, submitTimesheet)
router.put('/:id', authMiddleware, saveTimesheet)

export default router
