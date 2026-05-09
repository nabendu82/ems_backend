import Salary from '../models/Salary.js'
import Employee from '../models/Employee.js'

const getSalaries = async (req, res) => {
    try {
        const { id } = req.params
        // Employees can only view their own salary
        if (req.user?.role === 'employee' && String(req.user._id) !== String(id)) {
            return res.status(403).json({ success: false, error: 'Forbidden' })
        }
        const salaries = await Salary.find({ userId: id }).sort({ createdAt: -1 })
        if (!salaries || salaries.length === 0) {
            const employee = await Employee.findOne({ userId: id }).select('salary updatedAt createdAt')
            if (!employee) return res.status(200).json({ success: true, salaries: [] })

            return res.status(200).json({
                success: true,
                salaries: [{
                        _id: employee._id,
                        userId: id,
                        salary: employee.salary,
                        createdAt: employee.updatedAt ?? employee.createdAt,
                    }],
            })
        }

        return res.status(200).json({ success: true, salaries })
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server error in getting salaries" })
    }
}

export { getSalaries }