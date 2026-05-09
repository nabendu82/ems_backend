import User from '../models/User.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' })
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }
        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10d' })
        return res.status(200).json({ success: true, token, user: { _id: user._id, name: user.name, role: user.role } })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
}

const verify = async (req, res) => {
    return res.status(200).json({ success: true, user: req.user })
}

export { login, verify }