import mongoose from 'mongoose'
import Project from '../models/Project.js'
import Employee from '../models/Employee.js'

const adminOnly = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Forbidden' })
        return false
    }
    return true
}

const addProject = async (req, res) => {
    try {
        if (!adminOnly(req, res)) return
        const { name, description } = req.body
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, error: 'Project name is required' })
        }
        const project = await Project.create({
            name: String(name).trim(),
            description: description != null ? String(description).trim() : '',
            updatedAt: new Date(),
        })
        return res.status(200).json({ success: true, project })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'A project with this name already exists' })
        }
        console.error('addProject', error)
        return res.status(500).json({ success: false, error: 'Add project failed' })
    }
}

const getProjects = async (req, res) => {
    try {
        if (!adminOnly(req, res)) return
        const projects = await Project.find().sort({ name: 1 })
        return res.status(200).json({ success: true, projects })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Get projects failed' })
    }
}

const getProjectById = async (req, res) => {
    try {
        if (!adminOnly(req, res)) return
        const { id } = req.params
        const project = await Project.findById(id)
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' })
        return res.status(200).json({ success: true, project })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Get project failed' })
    }
}

const editProject = async (req, res) => {
    try {
        if (!adminOnly(req, res)) return
        const { id } = req.params
        const { name, description } = req.body
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, error: 'Project name is required' })
        }
        const project = await Project.findByIdAndUpdate(
            id,
            { name: String(name).trim(), description: description != null ? String(description).trim() : '', updatedAt: new Date() },
            { new: true }
        )
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' })
        return res.status(200).json({ success: true, project })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'A project with this name already exists' })
        }
        return res.status(500).json({ success: false, error: 'Edit project failed' })
    }
}

const deleteProject = async (req, res) => {
    try {
        if (!adminOnly(req, res)) return
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid project id' })
        }
        const project = await Project.findById(id)
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' })
        await Employee.updateMany({ projects: id }, { $pull: { projects: id } })
        await Project.findByIdAndDelete(id)
        return res.status(200).json({ success: true, message: 'Project deleted' })
    } catch (error) {
        console.error('deleteProject', error)
        return res.status(500).json({ success: false, error: 'Delete project failed' })
    }
}

export { addProject, getProjects, getProjectById, editProject, deleteProject }
