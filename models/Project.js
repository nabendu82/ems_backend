import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

projectSchema.index({ name: 1 }, { unique: true })

const Project = mongoose.model('Project', projectSchema)

export default Project
