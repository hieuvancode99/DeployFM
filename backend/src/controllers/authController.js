const User = require('../models/User');
const Category = require('../models/Category');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeychangeinproduction', {
    expiresIn: '30d'
  });
};

// Danh mục mặc định gợi ý khi tạo tài khoản mới
const DEFAULT_CATEGORIES = [
  { name: 'Lương', type: 'income', icon: 'briefcase', color: '#10B981' },
  { name: 'Đầu tư', type: 'income', icon: 'trending-up', color: '#059669' },
  { name: 'Phụ cấp / Thưởng', type: 'income', icon: 'award', color: '#6EE7B7' },
  { name: 'Khác (Thu nhập)', type: 'income', icon: 'plus-circle', color: '#34D399' },
  { name: 'Ăn uống', type: 'expense', icon: 'utensils', color: '#EF4444' },
  { name: 'Di chuyển', type: 'expense', icon: 'car', color: '#F59E0B' },
  { name: 'Nhà cửa & Tiện ích', type: 'expense', icon: 'home', color: '#3B82F6' },
  { name: 'Giải trí', type: 'expense', icon: 'film', color: '#EC4899' },
  { name: 'Mua sắm', type: 'expense', icon: 'shopping-bag', color: '#8B5CF6' },
  { name: 'Sức khỏe & Y tế', type: 'expense', icon: 'heart', color: '#14B8A6' },
  { name: 'Giáo dục', type: 'expense', icon: 'graduation-cap', color: '#6366F1' },
  { name: 'Khác (Chi tiêu)', type: 'expense', icon: 'minus-circle', color: '#9CA3AF' }
];

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng' });
    }

    const user = await User.create({ name, email, password, role: 'User' });

    if (user) {
      // Tạo 12 danh mục gợi ý riêng cho user mới
      const userCategories = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        isSystem: false,
        userId: user._id
      }));
      await Category.insertMany(userCategories);

      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      // Kiểm tra tài khoản bị cấm
      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
        });
      }

      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isBanned: user.isBanned,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = { registerUser, loginUser };
