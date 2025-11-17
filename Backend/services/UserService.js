const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/UserRepository');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/emailService');
const Store = require('../models/Store');

class UserService {
  // Tạo mã xác thực
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // So sánh password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Tạo JWT token
  generateToken(userId, role) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );
  }

  // Đăng ký
  async register(email, password, fullName, phone) {
    const existingUser = await userRepository.findByEmail(email);
    
    if (existingUser) {
      if (!existingUser.isVerified) {
        await userRepository.delete(existingUser._id);
      } else {
        throw new Error('Email đã được sử dụng');
      }
    }

    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    const hashedPassword = await this.hashPassword(password);

    const newUser = await userRepository.create({
      email,
      password: hashedPassword,
      fullName,
      phone,
      isVerified: false,
      verificationCode,
      verificationCodeExpires
    });

    // Gửi email xác thực
    const emailSent = await sendVerificationEmail(email, verificationCode, fullName);
    
    return {
      user: newUser,
      emailSent,
      email
    };
  }

  // Đăng nhập
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Kiểm tra tài khoản có bị ban không
    if (user.status === 'banned') {
      throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Kiểm tra email đã được xác thực chưa
    if (user.isVerified === false && user.verificationCode) {
      throw new Error('Tài khoản chưa được xác thực');
    }

    // Tự động verify tài khoản cũ
    if (user.isVerified === false && !user.verificationCode) {
      user.isVerified = true;
      await user.save();
    }

    const token = this.generateToken(user._id, user.role);
    await userRepository.updateOnlineStatus(user._id, true, new Date());

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl || '',
        online: true,
        lastSeen: new Date(),
        status: user.status || 'active'
      }
    };
  }

  // Đăng xuất
  async logout(userId) {
    await userRepository.updateOnlineStatus(userId, false, new Date());
  }

  // Lấy profile
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Kiểm tra tài khoản có bị ban không
    if (user.status === 'banned') {
      throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
    }

    let store = null;
    if (user.role === 'seller') {
      store = await userRepository.findStoreByOwner(user._id);
    }

    return { user, store };
  }

  // Cập nhật profile
  async updateProfile(userId, updateData) {
    const user = await userRepository.update(userId, updateData);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }
    return user;
  }

  // Yêu cầu mở cửa hàng
  async requestSeller(userId, requestData, logoUrl, bannerUrl) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    if (user.sellerRequest?.status === 'pending') {
      throw new Error('Đã gửi yêu cầu, vui lòng chờ admin duyệt');
    }

    user.sellerRequest = {
      status: 'pending',
      requestedAt: new Date(),
      store: {
        ...requestData,
        logoUrl,
        bannerUrl,
        isActive: false,
      },
    };

    await user.save();
    return user.sellerRequest;
  }

  // Xử lý yêu cầu seller
  async handleSellerRequest(userId, action) {
    const notificationService = require('./NotificationService');
    const emailService = require('../utils/emailService');
    const Store = require('../models/Store');

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.sellerRequest) {
      throw new Error('Không tìm thấy yêu cầu của user này');
    }

    if (user.sellerRequest.status !== 'pending') {
      throw new Error('Yêu cầu đã được xử lý trước đó');
    }

    const storeName = user.sellerRequest.store?.name || 'Cửa hàng của bạn';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (action === 'approve') {
      user.sellerRequest.status = 'approved';
      user.sellerRequest.processedAt = new Date();
      user.role = 'seller';

      const { name, description, category, storeAddress, contactPhone, contactEmail, logoUrl, bannerUrl } = user.sellerRequest.store;

      const newStore = new Store({
        owner: user._id,
        name,
        description,
        category,
        storeAddress,
        contactPhone,
        contactEmail,
        logoUrl,
        bannerUrl,
        isActive: true,
      });

      await newStore.save();
      await user.save();

      // Gửi notification
      try {
        await notificationService.createNotification(user._id, {
          type: 'seller',
          title: '🎉 Yêu cầu mở cửa hàng đã được duyệt',
          message: `Yêu cầu mở cửa hàng "${storeName}" của bạn đã được phê duyệt thành công. Bạn có thể bắt đầu quản lý cửa hàng ngay bây giờ!`,
          link: `${frontendUrl}/mystore`,
          icon: '🏪',
          metadata: {
            storeId: newStore._id,
            storeName: name,
          },
        });
      } catch (err) {
        console.error('❌ Lỗi khi tạo notification:', err);
      }

      // Gửi email
      try {
        await emailService.sendSellerRequestEmail(user, 'approve', storeName);
      } catch (err) {
        console.error('❌ Lỗi khi gửi email:', err);
      }

      return { store: newStore };
    } else if (action === 'reject') {
      user.sellerRequest.status = 'rejected';
      user.sellerRequest.processedAt = new Date();
      await user.save();

      // Gửi notification
      try {
        await notificationService.createNotification(user._id, {
          type: 'seller',
          title: '❌ Yêu cầu mở cửa hàng đã bị từ chối',
          message: `Yêu cầu mở cửa hàng "${storeName}" của bạn đã bị từ chối. Vui lòng liên hệ hỗ trợ nếu bạn có câu hỏi hoặc gửi lại yêu cầu mới.`,
          link: `${frontendUrl}/mystore`,
          icon: '🏪',
          metadata: {
            storeName: storeName,
          },
        });
      } catch (err) {
        console.error('❌ Lỗi khi tạo notification:', err);
      }

      // Gửi email
      try {
        await emailService.sendSellerRequestEmail(user, 'reject', storeName);
      } catch (err) {
        console.error('❌ Lỗi khi gửi email:', err);
      }

      return {};
    }
  }

  // Xác thực email
  async verifyEmail(email, verificationCode) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với email này');
    }

    if (user.isVerified) {
      throw new Error('Tài khoản đã được xác thực');
    }

    if (user.verificationCode !== verificationCode) {
      throw new Error('Mã xác thực không đúng');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();
  }

  // Gửi lại mã xác thực
  async resendVerificationCode(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với email này');
    }

    if (user.isVerified) {
      throw new Error('Tài khoản đã được xác thực');
    }

    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    const emailSent = await sendVerificationEmail(email, verificationCode, user.fullName);
    return { emailSent, email };
  }

  // Quên mật khẩu
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Không tiết lộ email có tồn tại hay không
      return { emailSent: false };
    }

    const resetCode = this.generateVerificationCode();
    const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    const emailSent = await sendResetPasswordEmail(email, resetCode, user.fullName);
    return { emailSent, email };
  }

  // Xác thực mã reset
  async verifyResetCode(email, resetCode) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với email này');
    }

    if (user.resetCode !== resetCode) {
      throw new Error('Mã xác thực không đúng');
    }

    if (!user.resetCodeExpires || new Date() > user.resetCodeExpires) {
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    return { email };
  }

  // Đặt lại mật khẩu
  async resetPassword(email, resetCode, newPassword) {
    if (newPassword.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với email này');
    }

    if (user.resetCode !== resetCode) {
      throw new Error('Mã xác thực không đúng');
    }

    if (!user.resetCodeExpires || new Date() > user.resetCodeExpires) {
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();
  }

  // Đổi mật khẩu
  async changePassword(userId, oldPassword, newPassword) {
    if (newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const isOldPasswordValid = await this.comparePassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new Error('Mật khẩu cũ không đúng');
    }

    const isSamePassword = await this.comparePassword(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();
  }

  // Cập nhật email notifications
  async updateEmailNotifications(userId, emailNotifications) {
    if (typeof emailNotifications !== 'boolean') {
      throw new Error('emailNotifications phải là boolean');
    }

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    user.emailNotifications = emailNotifications;
    await user.save();
    return user.emailNotifications;
  }

  // Lấy tất cả users (admin)
  async getAllUsers() {
    return await userRepository.findAll();
  }

  // Xóa user (admin)
  async deleteUser(userId) {
    const user = await userRepository.delete(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }
  }

  // Cập nhật user (admin)
  async updateUser(userId, role, status) {
    const updateData = {};
    
    if (role !== undefined) {
      updateData.role = role;
    }
    
    // Nếu status là "banned" hoặc "active", cập nhật user.status
    if (status === 'banned' || status === 'active') {
      updateData.status = status;
    } else if (status) {
      // Nếu status là cho sellerRequest (pending, approved, rejected)
      updateData['sellerRequest.status'] = status;
    }
    
    const user = await userRepository.update(userId, updateData);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }
    return user;
  }

  // Lấy tất cả seller requests (admin)
  async getAllSellerRequests() {
    return await userRepository.findSellerRequests();
  }
}

module.exports = new UserService();

