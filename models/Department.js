import mongoose from 'mongoose'

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

const Department = mongoose.model('Department', departmentSchema)

export default Department