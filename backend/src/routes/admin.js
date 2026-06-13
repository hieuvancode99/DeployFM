const express = require('express');
const router = express.Router();
const { getAllUsers, banUser, unbanUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/auth');

// Tất cả routes admin đều cần đăng nhập + quyền Admin
router.use(protect, adminOnly);

router.get('/users', getAllUsers);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);

module.exports = router;
