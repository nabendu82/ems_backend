import mongoose from 'mongoose'

const employeeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    maritalStatus: { type: String, enum: ['single', 'married'], required: true },
    designation: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    salary: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

const Employee = mongoose.model('Employee', employeeSchema)

export default Employee