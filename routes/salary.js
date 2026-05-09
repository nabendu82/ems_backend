import express from 'express'
import authMiddleware from '../middlewares/authMiddleware.js'
import { getSalaries } from '../controllers/salaryController.js'

const router = express.Router()

router.get('/:id', authMiddleware, getSalaries)

export default router