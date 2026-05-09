import User from '../models/User.js'
import bcrypt from 'bcrypt'

const changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword, confirmPassword } = req.body
        const user = await User.findById({ _id: userId })
        if(!user) {
            return res.status(400).json({ success: false, message: "User not found" })
        }
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password)
        if(!isPasswordCorrect) {
            return res.status(400).json({ success: false, message: "Invalid old password" })
        }
        if(newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" })
        }
        const hashPassword = await bcrypt.hash(newPassword, 10)
        const updateUser = await User.findByIdAndUpdate({ _id: user._id }, { password: hashPassword }, { new: true })
        if(!updateUser) {
            return res.status(400).json({ success: false, message: "User not updated" })
        }
        return res.status(200).json({ success: true })
    }
    catch (error) {
        return res.status(500).json({ success: false, error: "Server error in changing password" })
    }
}

export { changePassword }