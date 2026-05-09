import express from 'express'
import authMiddleware from '../middlewares/authMiddleware.js'
import { addEmployee, upload, getEmployees, getEmployeeById, editEmployee } from '../controllers/employeeController.js'
const router = express.Router()

router.post('/add', authMiddleware, upload.single('image'), addEmployee)
router.get('/', authMiddleware, getEmployees)
router.get('/:id', authMiddleware, getEmployeeById)
router.put('/:id', authMiddleware, upload.single('image'), editEmployee)
// router.delete('/:id', authMiddleware, deleteEmployee)

export default router