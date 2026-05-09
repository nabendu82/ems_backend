import mongoose from 'mongoose'

const rowSchema = new mongoose.Schema(
    {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
        project: { type: String, required: true, trim: true },
        activity: { type: String, required: true, trim: true },
        hours: {
            type: [Number],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length === 7,
                message: 'hours must have 7 values (Mon–Sun)',
            },
        },
    },{ _id: false }
)

const timesheetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
    },
    status: { type: String, enum: ['draft', 'submitted', 'approved'], default: 'draft' },
    rows: { type: [rowSchema], default: [] },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})
timesheetSchema.index({ userId: 1, weekStart: 1 }, { unique: true })
const Timesheet = mongoose.model('Timesheet', timesheetSchema)
export default Timesheet
