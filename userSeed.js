import User from './models/User.js'
import bcrypt from 'bcrypt'
import connectDB from './db/db.js'

const userRegister = async () => {
    try {
        await connectDB()
        const hashPassword = await bcrypt.hash('admin', 10)
        const newUser = new User({
            name: 'Admin',
            email: 'admin@admin.com',
            password: hashPassword,
            role: 'admin',
        })
        await newUser.save()
        console.log('User registered successfully')
    } catch (error) {
        console.log(error)
    }
}

userRegister()