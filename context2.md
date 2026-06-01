# Kế hoạch Cập nhật Dự án Smart Finance (context2.md)

Tài liệu này mô tả **tất cả các thay đổi và tính năng mới** được bổ sung vào dự án so với phiên bản gốc (context.md).

---

## 1. Tính năng Realtime (Socket.io)

### Mô tả
Thêm kết nối hai chiều theo thời gian thực giữa backend và frontend sử dụng **Socket.io**. Khi có bất kỳ sự thay đổi nào về giao dịch, ngân sách hoặc trạng thái tài khoản, tất cả client đang kết nối sẽ nhận được thông báo ngay lập tức mà không cần tải lại trang.

### Cài đặt thêm
```bash
# Backend
npm install socket.io

# Frontend
npm install socket.io-client
```

### Các sự kiện (Events)

| Tên sự kiện        | Hướng          | Khi nào phát             |
|--------------------|----------------|--------------------------|
| `transaction:new`  | Server → Client | Sau khi tạo giao dịch mới |
| `transaction:updated` | Server → Client | Sau khi cập nhật giao dịch |
| `transaction:deleted` | Server → Client | Sau khi xóa giao dịch    |
| `budget:updated`   | Server → Client | Sau khi tạo/cập nhật ngân sách |
| `user:banned`      | Server → Client | Sau khi Admin cấm tài khoản |
| `user:unbanned`    | Server → Client | Sau khi Admin kích hoạt lại |

### Thay đổi Backend

#### `backend/src/app.js`
- Thay `app.listen()` bằng `http.createServer(app)` kết hợp `socket.io`
- Gắn instance `io` vào `app.set('io', io)` để các controller có thể gọi `req.app.get('io').emit(...)`
- Cho phép CORS từ `http://localhost:3003`

```javascript
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3003', methods: ['GET', 'POST'] }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

#### `backend/src/controllers/transactionController.js`
- Sau `createTransaction`: emit `transaction:new` kèm dữ liệu giao dịch và `userId`
- Sau `updateTransaction`: emit `transaction:updated`
- Sau `deleteTransaction`: emit `transaction:deleted` kèm `transactionId` và `userId`

#### `backend/src/controllers/budgetController.js`
- Sau `createBudget` / `updateBudget`: emit `budget:updated` kèm `userId`

### Thay đổi Frontend

#### `frontend/src/lib/socket.ts` *(file mới)*
```typescript
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
  autoConnect: true,
  reconnection: true,
});

export default socket;
```

#### `frontend/src/hooks/useRealtimeEvents.ts` *(file mới)*
- Custom React hook lắng nghe các events Socket.io
- Nhận `userId` để chỉ xử lý events của chính mình
- Nhận callbacks: `onTransactionChange`, `onBudgetChange`, `onForcedLogout`

```typescript
export function useRealtimeEvents({ userId, onTransactionChange, onBudgetChange, onForcedLogout }) {
  useEffect(() => {
    socket.on('transaction:new', (data) => {
      if (data.userId === userId) onTransactionChange?.();
    });
    socket.on('budget:updated', (data) => {
      if (data.userId === userId) onBudgetChange?.();
    });
    socket.on('user:banned', (data) => {
      if (data.userId === userId) onForcedLogout?.();
    });
    return () => { socket.off('transaction:new'); socket.off('budget:updated'); socket.off('user:banned'); };
  }, [userId]);
}
```

#### `frontend/src/components/DashboardClient.tsx`
- Tích hợp `useRealtimeEvents` → khi có `transaction:new` tự động gọi lại API để cập nhật biểu đồ và tổng số dư

#### `frontend/src/app/(dashboard)/transactions/page.tsx`
- Tích hợp `useRealtimeEvents` → danh sách giao dịch tự cập nhật khi có giao dịch mới/xóa từ tab khác

---

## 2. Trang Admin — Quản lý Tài khoản

### Mô tả
**Thay thế hoàn toàn** trang Admin hiện tại (đang quản lý danh mục hệ thống) bằng giao diện **quản lý tài khoản người dùng**. Admin có thể xem danh sách tất cả user, cấm hoặc kích hoạt lại tài khoản. User bị cấm sẽ không thể đăng nhập và bị đăng xuất ngay lập tức qua Socket.io.

### Thay đổi Backend

#### `backend/src/models/User.js`
Thêm field `isBanned`:
```javascript
const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, index: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['User', 'Admin'], default: 'User' },
  isBanned:  { type: Boolean, default: false },   // <-- MỚI
  createdAt: { type: Date, default: Date.now }
});
```

#### `backend/src/controllers/authController.js`
Trong hàm `loginUser`, thêm kiểm tra `isBanned`:
```javascript
if (user && (await user.comparePassword(password))) {
  if (user.isBanned) {
    return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
  }
  // ...trả về token như bình thường
}
```

#### `backend/src/controllers/adminController.js` *(file mới)*
```javascript
// GET /api/admin/users — Lấy danh sách tất cả user
const getAllUsers = async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
};

// PATCH /api/admin/users/:id/ban — Cấm tài khoản
const banUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true }).select('-password');
  // Emit socket event để kick user ngay lập tức
  req.app.get('io').emit('user:banned', { userId: req.params.id });
  res.json({ success: true, data: user });
};

// PATCH /api/admin/users/:id/unban — Kích hoạt lại tài khoản
const unbanUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false }, { new: true }).select('-password');
  req.app.get('io').emit('user:unbanned', { userId: req.params.id });
  res.json({ success: true, data: user });
};
```

#### `backend/src/middlewares/auth.js`
Thêm middleware `adminOnly`:
```javascript
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') return next();
  return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền truy cập.' });
};
```

#### `backend/src/routes/admin.js` *(file mới)*
```javascript
const router = require('express').Router();
const { getAllUsers, banUser, unbanUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/auth');

router.use(protect, adminOnly);
router.get('/users', getAllUsers);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);

module.exports = router;
```

#### `backend/src/app.js`
Thêm mount route admin:
```javascript
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
```

### Thay đổi Frontend

#### `frontend/src/app/(dashboard)/admin/page.tsx`
Thay thế toàn bộ nội dung bằng giao diện quản lý tài khoản:

**Giao diện gồm:**
- Header: "Quản lý Tài khoản" với icon Shield
- Bảng (table) danh sách users:
  - Avatar (chữ cái đầu tên)
  - Tên đầy đủ + Email
  - Badge Role (Admin màu indigo / User màu slate)
  - Ngày tạo tài khoản (định dạng dd/mm/yyyy)
  - Trạng thái: Badge "Hoạt động" (xanh) / "Đã bị cấm" (đỏ)
  - Nút hành động: "Cấm tài khoản" / "Kích hoạt"
- Realtime: tự cập nhật danh sách khi có thay đổi
- Không thể tự cấm chính mình (disable nút cho account đang đăng nhập)

**API calls:**
- `GET /api/admin/users` — lấy danh sách
- `PATCH /api/admin/users/:id/ban` — cấm
- `PATCH /api/admin/users/:id/unban` — kích hoạt

---

## 3. Categories Cá nhân hóa theo User

### Mô tả
Thay vì dùng chung `isSystem: true` cho tất cả users, mỗi user có **bộ danh mục riêng**. Khi đăng ký tài khoản mới, hệ thống tự động sao chép 12 danh mục gợi ý từ template sang tài khoản đó. User có thể thêm, sửa, xóa danh mục theo ý muốn.

### Danh mục gợi ý mặc định (template)
| Tên | Loại | Icon | Màu |
|-----|------|------|-----|
| Lương | income | briefcase | #10B981 |
| Đầu tư | income | trending-up | #059669 |
| Phụ cấp / Thưởng | income | award | #6EE7B7 |
| Khác (Thu nhập) | income | plus-circle | #34D399 |
| Ăn uống | expense | utensils | #EF4444 |
| Di chuyển | expense | car | #F59E0B |
| Nhà cửa & Tiện ích | expense | home | #3B82F6 |
| Giải trí | expense | film | #EC4899 |
| Mua sắm | expense | shopping-bag | #8B5CF6 |
| Sức khỏe & Y tế | expense | heart | #14B8A6 |
| Giáo dục | expense | graduation-cap | #6366F1 |
| Khác (Chi tiêu) | expense | minus-circle | #9CA3AF |

### Thay đổi Backend

#### `backend/src/controllers/authController.js`
Trong hàm `registerUser`, sau khi tạo user thành công, thêm logic sao chép danh mục:
```javascript
const Category = require('../models/Category');

// Lấy danh mục template hệ thống
const systemCategories = await Category.find({ isSystem: true });

// Sao chép thành danh mục riêng của user mới
const userCategories = systemCategories.map(cat => ({
  name: cat.name,
  type: cat.type,
  icon: cat.icon,
  color: cat.color,
  isSystem: false,
  userId: user._id   // Gắn với user mới
}));

await Category.insertMany(userCategories);
```

#### `backend/src/controllers/categoryController.js`
- **`getCategories`**: Chỉ trả về categories của user (`userId: req.user._id`), bỏ điều kiện `isSystem: true`
- **`createCategory`**: Luôn gán `userId: req.user._id`, `isSystem: false`
- **`updateCategory`** *(endpoint mới)*: Cho phép sửa `name`, `icon`, `color` của category cá nhân
- **`deleteCategory`**: Chỉ xóa category của chính user (`userId === req.user._id`)

```javascript
// UPDATE category
const updateCategory = async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
  if (!category) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
  
  const { name, icon, color } = req.body;
  if (name) category.name = name;
  if (icon) category.icon = icon;
  if (color) category.color = color;
  
  await category.save();
  res.json({ success: true, data: category });
};
```

#### `backend/src/routes/categories.js`
Thêm route PUT:
```javascript
router.put('/:id', protect, updateCategory);
```

### Thay đổi Frontend

#### `frontend/src/app/(dashboard)/categories/page.tsx` *(file mới)*
Trang quản lý danh mục cá nhân của user:

**Giao diện gồm:**
- Header: "Danh mục của tôi" với nút "+ Thêm danh mục"
- Grid các danh mục hiện có (card với icon, màu, tên, type badge)
- Mỗi card có 2 nút: ✏️ Sửa tên / 🗑️ Xóa
- Modal thêm mới: nhập Tên, Loại (Thu nhập/Chi tiêu), Icon, Màu
- Modal sửa: chỉ sửa tên, icon, màu (không đổi type vì ảnh hưởng giao dịch)
- Realtime: tự cập nhật khi có thay đổi từ tab khác

#### `frontend/src/app/(dashboard)/layout.tsx`
Thêm link sidebar cho User:
```typescript
const links = [
  { href: '/dashboard',    icon: LayoutDashboard,  label: 'Tổng quan' },
  { href: '/transactions', icon: ArrowRightLeft,    label: 'Lịch sử giao dịch' },
  { href: '/budgets',      icon: PiggyBank,         label: 'Ngân sách thiết lập' },
  { href: '/categories',   icon: Tag,               label: 'Danh mục của tôi' },  // <-- MỚI
  { href: '/ai-advisor',   icon: BrainCircuit,      label: 'Cố vấn tài chính AI' },
];

if (userRole === 'Admin') {
  links.push({ href: '/admin', icon: ShieldAlert, label: 'Quản lý tài khoản' });
}
```

---

## 4. Redirect về Login sau khi Đăng ký

### Mô tả
Sau khi đăng ký tài khoản thành công, thay vì tự động đăng nhập và điều hướng vào dashboard, hệ thống sẽ:
1. Hiển thị thông báo thành công (toast / alert màu xanh)
2. Tự động chuyển về trang `/login` sau 2 giây

### Thay đổi Frontend

#### `frontend/src/app/(auth)/register/page.tsx`

**Trước (cũ):**
```typescript
// Sau đăng ký → tự đăng nhập → vào dashboard
const res = await signIn('credentials', { email, password, redirect: false });
if (!res?.error) {
  router.push('/dashboard');
}
```

**Sau (mới):**
```typescript
// Sau đăng ký → hiển thị thành công → về trang login
if (regData.success) {
  setSuccess('Đăng ký tài khoản thành công! Đang chuyển về trang đăng nhập...');
  setTimeout(() => {
    router.push('/login');
  }, 2000);
  return;
}
```

**Giao diện thêm:**
- State `success: string | null` để hiện thông báo màu xanh emerald
- Không còn import `signIn` từ `next-auth/react`
- Bỏ toàn bộ logic tự đăng nhập sau khi đăng ký

---

## 5. Tổng hợp API Endpoints (Mới & Cập nhật)

### Endpoints mới

| Method | URL | Mô tả | Auth |
|--------|-----|-------|------|
| `GET` | `/api/admin/users` | Lấy danh sách tất cả users | Admin |
| `PATCH` | `/api/admin/users/:id/ban` | Cấm tài khoản | Admin |
| `PATCH` | `/api/admin/users/:id/unban` | Kích hoạt tài khoản | Admin |
| `PUT` | `/api/categories/:id` | Cập nhật danh mục cá nhân | User |

### Endpoints thay đổi hành vi

| Method | URL | Thay đổi |
|--------|-----|---------|
| `POST` | `/api/auth/register` | Thêm: tự copy 12 danh mục mẫu vào user mới |
| `POST` | `/api/auth/login` | Thêm: kiểm tra `isBanned` → trả 403 nếu bị cấm |
| `GET` | `/api/categories` | Thay đổi: chỉ trả categories của user hiện tại (không gộp system) |
| `POST` | `/api/categories` | Thay đổi: luôn tạo category cho user (bỏ tạo system category) |
| `DELETE` | `/api/categories/:id` | Thay đổi: chỉ xóa categories của chính user |

---

## 6. Tổng hợp Files Thay đổi

### Backend

| File | Hành động | Nội dung thay đổi |
|------|-----------|------------------|
| `src/app.js` | Sửa | Tích hợp Socket.io, thêm route admin |
| `src/models/User.js` | Sửa | Thêm field `isBanned` |
| `src/controllers/authController.js` | Sửa | Kiểm tra isBanned khi login; copy danh mục khi register |
| `src/controllers/transactionController.js` | Sửa | Emit Socket.io events |
| `src/controllers/budgetController.js` | Sửa | Emit Socket.io events |
| `src/controllers/categoryController.js` | Sửa | Chỉ CRUD categories của user; thêm updateCategory |
| `src/controllers/adminController.js` | **Mới** | getAllUsers, banUser, unbanUser |
| `src/routes/admin.js` | **Mới** | Routes cho admin API |
| `src/routes/categories.js` | Sửa | Thêm route PUT /:id |
| `src/middlewares/auth.js` | Sửa | Thêm middleware `adminOnly` |

### Frontend

| File | Hành động | Nội dung thay đổi |
|------|-----------|------------------|
| `src/lib/socket.ts` | **Mới** | Socket.io client singleton |
| `src/hooks/useRealtimeEvents.ts` | **Mới** | Hook lắng nghe realtime events |
| `src/app/(auth)/register/page.tsx` | Sửa | Bỏ tự đăng nhập → redirect về login |
| `src/app/(dashboard)/layout.tsx` | Sửa | Thêm link "Danh mục của tôi" vào sidebar |
| `src/app/(dashboard)/admin/page.tsx` | Sửa (toàn bộ) | Giao diện quản lý tài khoản users |
| `src/app/(dashboard)/categories/page.tsx` | **Mới** | Trang quản lý danh mục cá nhân |
| `src/components/DashboardClient.tsx` | Sửa | Tích hợp useRealtimeEvents |
| `src/app/(dashboard)/transactions/page.tsx` | Sửa | Tích hợp useRealtimeEvents |

---

## 7. Sơ đồ Luồng Xử lý Realtime

```
User A thêm giao dịch
        │
        ▼
[Frontend A] POST /api/transactions
        │
        ▼
[Backend Express] transactionController.createTransaction()
        │
        ├── Lưu vào MongoDB
        │
        └── io.emit('transaction:new', { userId, transaction })
                │
                ▼
        [Socket.io Server]
                │
        ┌───────┴────────┐
        ▼                ▼
[Frontend A]        [Frontend B (tab khác)]
 (bỏ qua hoặc        useRealtimeEvents
  hiện toast)         → fetchTransactions()
                       → UI tự cập nhật ✅
```

```
Admin cấm User X
        │
        ▼
[Frontend Admin] PATCH /api/admin/users/X/ban
        │
        ▼
[Backend] adminController.banUser()
        │
        ├── MongoDB: user.isBanned = true
        │
        └── io.emit('user:banned', { userId: X })
                │
                ▼
        [Frontend của User X]
         useRealtimeEvents → onForcedLogout()
         → signOut() → redirect /login ✅
```

---

## 8. Kế hoạch Kiểm thử

### Test tự động
```bash
# Backend — seed lại data
cd backend && npm run seed

# Backend — unit tests
npm run test
```

### Test thủ công

| # | Kịch bản | Kết quả mong đợi |
|---|----------|-----------------|
| 1 | Đăng ký tài khoản mới | Thấy thông báo thành công → tự chuyển về `/login` sau 2s |
| 2 | Đăng nhập bằng tài khoản vừa tạo | Vào dashboard, sidebar hiện "Danh mục của tôi" |
| 3 | Vào "Danh mục của tôi" | Thấy 12 danh mục đã được copy sẵn |
| 4 | Sửa tên 1 danh mục | Tên cập nhật ngay lập tức |
| 5 | Thêm giao dịch mới | Tab khác tự cập nhật danh sách giao dịch (Realtime) |
| 6 | Đăng nhập Admin → Quản lý tài khoản | Thấy bảng danh sách tất cả users |
| 7 | Admin cấm User X | User X bị đăng xuất ngay, không đăng nhập lại được |
| 8 | User X đăng nhập khi bị cấm | Thấy lỗi "Tài khoản đã bị khóa" |
| 9 | Admin kích hoạt lại User X | User X đăng nhập bình thường |
