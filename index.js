import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import departmentRoutes from './routes/department.js'
import employeeRoutes from './routes/employee.js'
import connectDB from './db/db.js'
import leaveRoutes from './routes/leave.js'
import salaryRoutes from './routes/salary.js'
import settingsRoutes from './routes/settings.js'
import dashboardRouter from './routes/dashboard.js'
import timesheetRoutes from './routes/timesheet.js'
import projectRoutes from './routes/project.js'

connectDB()
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// Images are now served from Cloudinary, not local public/uploads
app.use('/api/auth', authRoutes)
app.use('/api/department', departmentRoutes)
app.use('/api/employee', employeeRoutes)
app.use('/api/leave', leaveRoutes)
app.use('/api/salary', salaryRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/timesheet', timesheetRoutes)
app.use('/api/project', projectRoutes)

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})