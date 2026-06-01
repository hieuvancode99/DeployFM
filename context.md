# Kế hoạch Triển khai Chi tiết: Ứng dụng Quản lý Chi tiêu Cá nhân / Hộ gia đình

Tài liệu này đặc tả chi tiết kiến trúc, thiết kế database, luồng nghiệp vụ, API, giao diện frontend, cấu hình kỹ thuật và từng bước triển khai cho đồ án Quản lý Chi tiêu Cá nhân (Tài chính & FinTech).

---

## 1. Cấu Trúc Thư Mục Dự Án Đề Xuất (Folder Structure)

Dự án sẽ được chia làm 2 phần chính: **backend** (Node.js/Express) và **frontend** (Next.js 14+ App Router).

```text
personal-finance-app/
├── backend/
│   ├── src/
│   │   ├── config/             # Cấu hình db.js, env variables
│   │   ├── controllers/        # Xử lý logic cho các Entity (auth, transaction, category, budget, ai)
│   │   ├── models/             # Mongoose Schemas (User, Transaction, Category, Budget)
│   │   ├── middlewares/        # Auth middleware, error handler, validator
│   │   ├── routes/             # RESTful API Routes
│   │   ├── utils/              # Helper functions (export excel/pdf, AI prompt)
│   │   └── app.js              # Khởi tạo Express
│   ├── tests/                  # Unit tests (Jest/Supertest)
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── layout.tsx      # Root layout (Provider bọc Zustand/NextAuth)
│   │   │   ├── page.tsx        # Landing Page (SSG)
│   │   │   ├── (auth)/         # Group route cho Auth (Không ảnh hưởng path URL)
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   └── (dashboard)/    # Group route cho Dashboard (Yêu cầu login)
│   │   │       ├── layout.tsx  # Sidebar, Header, User Profile
│   │   │       ├── dashboard/  # Bảng điều khiển chính (SSR - biểu đồ Recharts)
│   │   │       ├── transactions/
│   │   │       │   ├── page.tsx# Danh sách & Bộ lọc
│   │   │       │   └── [id]/   # Xem chi tiết & Sửa (Dynamic Route)
│   │   │       ├── budgets/    # Quản lý ngân sách & Cảnh báo
│   │   │       ├── ai-advisor/ # Hỏi đáp lời khuyên tài chính AI
│   │   │       └── admin/      # Quản trị viên (Phân quyền Admin)
│   │   ├── components/         # Reusable Components (Button, Form, Modal, Charts)
│   │   ├── hooks/              # Custom hooks
│   │   ├── store/              # Zustand global state (auth, transactions)
│   │   ├── lib/                # Cấu hình axios client, helper functions
│   │   ├── types/              # TypeScript definitions
│   │   └── actions/            # Next.js Server Actions
│   ├── package.json
│   ├── tailwind.config.js
│   ├── .env.example
│   └── README.md
```

---

## 2. Thiết Kế Database Schema (MongoDB Mongoose)

Để đáp ứng tối thiểu 4 entities trong Express.js, cấu trúc Schema được thiết kế như sau:

### 2.1. User Schema (Quản lý người dùng)
```javascript
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // Sẽ được hash bằng bcrypt
  role: { type: String, enum: ['User', 'Admin'], default: 'User' },
  createdAt: { type: Date, default: Date.now }
});
```

### 2.2. Category Schema (Danh mục phân loại)
```javascript
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true }, // Thu nhập hay chi tiêu
  icon: { type: String, default: 'tag' }, // Icon để hiển thị UI (lucide-react icon name)
  color: { type: String, default: '#6B7280' }, // Mã màu đại diện cho biểu đồ
  isSystem: { type: Boolean, default: false }, // Danh mục hệ thống tạo sẵn hay do User tự tạo
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } // null nếu là hệ thống dùng chung
});
```

### 2.3. Transaction Schema (Giao dịch thu chi)
```javascript
const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
```

### 2.4. Budget Schema (Ngân sách & Cảnh báo)
```javascript
const BudgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amountLimit: { type: Number, required: true }, // Hạn mức ngân sách (VD: 5,000,000đ)
  month: { type: Number, required: true }, // Tháng áp dụng (1-12)
  year: { type: Number, required: true }, // Năm áp dụng (VD: 2026)
  createdAt: { type: Date, default: Date.now }
});
// Đảm bảo mỗi User chỉ có 1 ngân sách cho 1 danh mục trong 1 tháng nhất định
BudgetSchema.index({ userId: 1, categoryId: 1, month: 1, year: 1 }, { unique: true });
```

---

## 3. Hệ Thống RESTful API (Express.js)

Tất cả các API trả về dạng JSON chuẩn: `{ success: boolean, data?: any, message?: string }`.

### 3.1. Authentication (Gọi bởi NextAuth/Frontend)
*   `POST /api/auth/register`: Đăng ký tài khoản mới (User mặc định).
*   `POST /api/auth/login`: Xác thực email/password, trả về thông tin User kèm Token.

### 3.2. Transactions API (CRUD đầy đủ)
*   `GET /api/transactions`: Lấy danh sách giao dịch (hỗ trợ phân trang, lọc theo khoảng ngày, theo Category, theo loại Thu/Chi).
*   `POST /api/transactions`: Thêm mới một giao dịch. **Logic bổ sung**: Kiểm tra nếu là khoản Chi tiêu (`expense`), lấy tổng tiền chi trong tháng đó của Category này so sánh với `Budget` tương ứng để trả thêm thông tin cảnh báo nếu vượt ngưỡng.
*   `GET /api/transactions/:id`: Chi tiết giao dịch.
*   `PUT /api/transactions/:id`: Cập nhật giao dịch.
*   `DELETE /api/transactions/:id`: Xóa giao dịch.

### 3.3. Categories API (CRUD)
*   `GET /api/categories`: Lấy danh sách danh mục (bao gồm danh mục dùng chung và danh mục riêng của User đang đăng nhập).
*   `POST /api/categories`: Tạo danh mục mới cho User.
*   `DELETE /api/categories/:id`: Xóa danh mục riêng (không cho xóa danh mục hệ thống).

### 3.4. Budgets API (CRUD)
*   `GET /api/budgets`: Xem danh sách ngân sách tháng hiện tại của User.
*   `POST /api/budgets`: Thiết lập hoặc cập nhật ngân sách cho một danh mục.
*   `GET /api/budgets/status`: Lấy thống kê so sánh thực tế chi tiêu so với hạn mức ngân sách (dùng cho thanh tiến trình trên UI).

### 3.5. AI & Export API (Tính năng nâng cao)
*   `POST /api/ai/savings-suggestion`: Nhận danh sách giao dịch gần đây, gửi prompt lên Gemini/OpenAI API và trả về phân tích, lời khuyên tài chính cá nhân.
*   `GET /api/reports/export`: Nhận tham số format (`pdf` hoặc `xlsx`) và xuất báo cáo tài chính của người dùng.

---

## 4. Giải Pháp Kỹ Thuật Frontend (Next.js)

### 4.1. NextAuth.js Cấu hình
NextAuth sẽ hoạt động ở vai trò trung gian xác thực (Session Manager).
*   Sử dụng **CredentialsProvider**:
    1. Khi người dùng nhập Email và Mật khẩu ở trang `/login`, NextAuth sẽ gửi yêu cầu `POST /api/auth/login` tới Express Backend.
    2. Nếu backend xác thực thành công và trả về thông tin user cùng JWT Token, NextAuth sẽ lưu giữ Token này trong JWT session của nó.
    3. Token này sẽ được mã hóa và lưu trữ tại Cookies ở client dưới cơ chế an toàn nhất.
    4. Middleware của Next.js sẽ dùng session này để bảo vệ các route `/dashboard/*`. Nếu chưa login, tự động redirect về `/login`.

### 4.2. Chiến Lược Rendering (SSR, SSG, ISR)
Để đạt điểm tối đa cho yêu cầu Rendering Strategy (Ít nhất 2 chiến lược):
1.  **SSG (Static Site Generation)**: Áp dụng cho trang Landing page chính (`/`). Trang này giới thiệu các tính năng của app, không cần dữ liệu động liên tục. Next.js sẽ build tĩnh trang này giúp tối ưu tốc độ tải trang cực nhanh và SEO hoàn hảo.
2.  **SSR (Server-Side Rendering)**: Áp dụng cho trang Dashboard (`/dashboard`). Mỗi khi người dùng load trang, Server sẽ fetch dữ liệu tổng quan mới nhất (số dư hiện tại, giao dịch gần đây) từ Express API để render HTML hoàn chỉnh trước khi gửi về client, giúp dữ liệu luôn mới 100%.
3.  **ISR (Incremental Static Regeneration)**: Áp dụng cho danh sách các danh mục hệ thống (`Category` mặc định). Dữ liệu này ít thay đổi, có thể build tĩnh và cập nhật lại sau mỗi 24 giờ (`revalidate: 86400`).

### 4.3. State Management (Zustand Store Skeleton)
Sử dụng Zustand để quản lý danh sách giao dịch, giúp đồng bộ hóa giữa các component (ví dụ: sau khi thêm giao dịch ở Modal, danh sách giao dịch và biểu đồ tổng ở trang Dashboard tự động load lại).

```typescript
import { create } from 'zustand';

interface TransactionStore {
  transactions: any[];
  loading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (data: any) => Promise<boolean>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  loading: false,
  fetchTransactions: async () => {
    set({ loading: true });
    // Call API axios.get('/api/transactions')
    // set({ transactions: res.data, loading: false })
  },
  addTransaction: async (data) => {
    // Call API axios.post('/api/transactions', data)
    // get().fetchTransactions()
    return true;
  }
}));
```

### 4.4. Form Validation (React Hook Form + Zod)
Triển khai validate chặt chẽ tại 2 form quan trọng:
1.  **Form Đăng ký / Đăng nhập**: Kiểm tra định dạng email, độ dài mật khẩu (tối thiểu 8 ký tự, có ký tự đặc biệt).
2.  **Form Thêm Giao dịch**:
    - Số tiền (Amount): Phải là số dương lớn hơn 0, bắt buộc nhập.
    - Loại (Type): Bắt buộc chọn Thu nhập hoặc Chi tiêu.
    - Ngày (Date): Bắt buộc nhập, định dạng ngày hợp lệ.
    - Danh mục (Category): Bắt buộc chọn.

---

## 5. Kế Hoạch Triển Khai Từng Bước (Step-by-Step Implementation)

### Bước 1: Chuẩn Bị & Setup DevOps (1-2 ngày)
*   [ ] Thiết lập repository Github, tạo branch chính (`main`), các branch làm việc (`feature/setup-project`, `feature/auth`, ...).
*   [ ] Tạo cấu trúc thư mục chứa `frontend` và `backend`.
*   [ ] Khởi tạo backend Express. Cài đặt các thư viện: `express`, `mongoose`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`, `morgan`.
*   [ ] Khởi tạo frontend Next.js 14+ sử dụng TypeScript, Tailwind CSS. Cài đặt các thư viện: `lucide-react`, `recharts`, `zustand`, `axios`, `zod`, `react-hook-form`, `@hookform/resolvers`, `next-auth`.

### Bước 2: Thiết Kế Database & API Core (2-3 ngày)
*   [ ] Viết Mongoose Schemas cho 4 model (`User`, `Category`, `Transaction`, `Budget`).
*   [ ] Viết script `seed.js` để tự động tạo dữ liệu mẫu (danh mục mặc định hệ thống, một vài giao dịch và người dùng thử nghiệm) phục vụ việc phát triển và chấm điểm.
*   [ ] Xây dựng Express Controllers cho API Auth (đăng ký, đăng nhập) và middleware xác thực JWT.

### Bước 3: Hoàn Thiện API CRUD & Tính Năng Nâng Cao (2-3 ngày)
*   [ ] Viết trọn vẹn API CRUD cho `transactions`, `categories`, `budgets`.
*   [ ] Viết logic so sánh ngân sách: Khi thêm giao dịch chi tiêu mới, tính toán xem đã vượt hạn mức cảnh báo trong tháng chưa.
*   [ ] Viết API xuất báo cáo Excel/PDF (Sử dụng thư viện `exceljs` cho Excel và `pdfkit` hoặc `html-pdf` cho PDF).
*   [ ] Viết API tích hợp gọi Gemini/OpenAI API: Tạo System Prompt hướng dẫn AI đóng vai trò Cố vấn Tài chính, gửi dữ liệu chi tiêu của User dạng JSON thô, nhận lại lời khuyên định dạng Markdown.

### Bước 4: Tích Hợp Frontend & Xây Dựng UI (3-4 ngày)
*   [ ] Cấu hình NextAuth.js trong Next.js Frontend. Viết middleware bảo vệ các route Dashboard.
*   [ ] Thiết kế giao diện Dashboard responsive: Sidebar bên trái, Header bên phải, các card hiển thị Tổng quan số dư, Tổng Thu, Tổng Chi cùng biểu đồ Recharts (Biểu đồ tròn tỉ lệ chi tiêu, biểu đồ cột so sánh thu - chi).
*   [ ] Thiết kế trang danh sách giao dịch, tích hợp lọc, tìm kiếm, nút Export.
*   [ ] Thiết kế Form Thêm/Sửa giao dịch (Popup Modal) dùng React Hook Form và Zod.
*   [ ] Thiết kế trang Ngân sách: Hiển thị thanh tiến trình trực quan (% chi tiêu đã dùng của ngân sách, đổi màu đỏ nếu sắp/đã vượt mức).
*   [ ] Thiết kế trang AI Advisor: Khung giao diện nhận đề xuất tiết kiệm từ AI sinh động.

### Bước 5: Server Actions & Kiểm Thử (1-2 ngày)
*   [ ] Tạo ít nhất 1 Server Action trên Frontend (VD: Tạo nhanh một giao dịch "Thêm nhanh" trực tiếp từ Sidebar không cần thông qua Axios gọi API để tối ưu tốc độ).
*   [ ] Viết Unit Test cho ít nhất 3 hàm cốt lõi ở Backend (ví dụ: hàm tính tổng chi tiêu của user, hàm kiểm tra vượt ngân sách, hàm định dạng prompt AI) sử dụng Jest.
*   [ ] Kiểm tra kỹ lưỡng tính đáp ứng giao diện trên Mobile (Responsive).
*   [ ] Deploy Frontend lên Vercel, Backend lên Render/Railway, Database lên MongoDB Atlas. Đảm bảo cấu hình đúng các biến môi trường `.env`.

---

## 6. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

### Kiểm thử tự động (Automated Tests)
*   [ ] Chạy lệnh chạy test backend: `npm run test` (Kiểm tra 3 chức năng chính đã viết unit test có xanh hết không).

### Kiểm thử thủ công (Manual Verification)
1.  **Xác thực và Phân quyền**: Đăng nhập bằng tài khoản `User` bình thường xem có vào được dashboard không, thử truy cập `/dashboard/admin` để xem hệ thống có chặn và báo lỗi phân quyền không. Sau đó đăng nhập bằng tài khoản `Admin` xem có vào được trang Admin quản lý không.
2.  **Logic cảnh báo ngân sách**: Cài đặt ngân sách danh mục "Ăn uống" tháng này là 1.000.000đ. Thêm giao dịch chi ăn uống 1.200.000đ. Kiểm tra xem hệ thống có hiển thị thông báo/toast cảnh báo vượt ngân sách hay không.
3.  **Xuất báo cáo**: Nhấp vào nút "Xuất Excel" và "Xuất PDF". Mở file tải về để xác minh định dạng dữ liệu, cột, dòng có hiển thị chuẩn không.
4.  **Tích hợp AI**: Nhấp nút "Nhận lời khuyên AI". Đợi API phản hồi và kiểm tra xem nội dung trả về có phân tích đúng dựa trên dữ liệu giao dịch thực tế đã nhập hay không.
