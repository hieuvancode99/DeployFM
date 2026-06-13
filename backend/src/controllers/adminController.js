const User = require('../models/User');

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Ban a user account
// @route   PATCH /api/admin/users/:id/ban
// @access  Admin
const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    if (user.role === 'Admin') {
      return res.status(400).json({ success: false, message: 'Không thể cấm tài khoản Admin' });
    }

    user.isBanned = true;
    await user.save();

    // Emit realtime event để kick user ngay lập tức
    const io = req.app.get('io');
    if (io) {
      io.emit('user:banned', { userId: req.params.id });
    }

    res.json({ success: true, data: user, message: `Đã cấm tài khoản ${user.name}` });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Unban a user account
// @route   PATCH /api/admin/users/:id/unban
// @access  Admin
const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    user.isBanned = false;
    await user.save();

    // Emit realtime event
    const io = req.app.get('io');
    if (io) {
      io.emit('user:unbanned', { userId: req.params.id });
    }

    res.json({ success: true, data: user, message: `Đã kích hoạt tài khoản ${user.name}` });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = { getAllUsers, banUser, unbanUser };
