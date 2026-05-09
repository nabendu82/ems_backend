import express from 'express'
import authMiddleware from '../middlewares/authMiddleware.js'
import { addDepartment, getDepartments, getDepartmentById, editDepartment, deleteDepartment } from '../controllers/departmentController.js'
const router = express.Router()

router.get('/', authMiddleware, getDepartments)
router.post('/add', authMiddleware, addDepartment)
router.get('/:id', authMiddleware, getDepartmentById)
router.put('/edit/:id', authMiddleware, editDepartment)
router.delete('/:id', authMiddleware, deleteDepartment)

export default router