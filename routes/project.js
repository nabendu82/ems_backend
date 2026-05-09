import express from 'express'
import authMiddleware from '../middlewares/authMiddleware.js'
import { addProject, getProjects, getProjectById, editProject, deleteProject } from '../controllers/projectController.js'

const router = express.Router()

router.post('/add', authMiddleware, addProject)
router.get('/', authMiddleware, getProjects)
router.get('/:id', authMiddleware, getProjectById)
router.put('/:id', authMiddleware, editProject)
router.delete('/:id', authMiddleware, deleteProject)

export default router
