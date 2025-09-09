const User = require('../models/users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Regiter a new user

exports.register = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;
        
        const exportistingUser = await User.findOne({ email });
        if (exportistingUser) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            fullName,
            phone
        });

        await newUser.save();
        res.status(201).json({ message: 'Đăng ký thành công' });
        
    }
    catch (error) {
        res.status(500).json({ error});
    }
}

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(200).json({ 
            message: 'Đăng nhập thành công',
            token,
            user: { id: user._id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl }
         });

    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
}

// Profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        res.status(200).json(
            { message: 'Lấy thông tin người dùng thành công', user }
        ); 
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
}

