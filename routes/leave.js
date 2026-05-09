import express from 'express'
import authMiddleware from '../middlewares/authMiddleware.js'
import { addLeave, getLeaves, getAllLeaves, getLeavesForEmployee, getLeaveById, updateLeaveStatus } from '../controllers/leaveController.js'

const router = express.Router()

router.get('/all', authMiddleware, getAllLeaves)
router.get('/employee/:id', authMiddleware, getLeavesForEmployee)
router.patch('/:id/status', authMiddleware, updateLeaveStatus)
router.get('/', authMiddleware, getLeaves)
router.get('/:id', authMiddleware, getLeaveById)
router.post('/add', authMiddleware, addLeave)

export default router