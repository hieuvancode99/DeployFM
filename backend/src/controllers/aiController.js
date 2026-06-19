const Transaction = require('../models/Transaction');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// @desc    Get savings suggestion from AI
// @route   POST /api/ai/savings-suggestion
// @access  Private
const getSavingsSuggestions = async (req, res) => {
  try {
    // Retrieve latest 50 transactions to keep context size reasonable
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('categoryId')
      .sort({ date: -1 })
      .limit(50);

    if (transactions.length === 0) {
      return res.json({
        success: true,
        data: `### Xin chào ${req.user.name},\n\nHiện tại hệ thống chưa ghi nhận giao dịch nào của bạn. Hãy bắt đầu nhập các giao dịch thu nhập hoặc chi tiêu đầu tiên để tôi có thể phân tích và đưa ra lời khuyên tài chính chính xác cho bạn!`
      });
    }

    // Format transaction data for the prompt
    const txSummary = transactions.map(t => ({
      date: new Date(t.date).toLocaleDateString('vi-VN'),
      category: t.categoryId ? t.categoryId.name : 'Khác',
      type: t.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      amount: `${t.amount.toLocaleString('vi-VN')} đ`,
      description: t.description || 'Không có mô tả'
    }));

    const prompt = `
Bạn là một chuyên gia kiêm Cố vấn Tài chính Cá nhân (AI Financial Advisor) thân thiện, chuyên nghiệp.
Dưới đây là danh sách tối đa 50 giao dịch tài chính gần đây của người dùng tên là "${req.user.name}":
${JSON.stringify(txSummary, null, 2)}

Nhiệm vụ của bạn:
1. Phân tích tóm tắt nhanh cơ cấu thu nhập và chi tiêu của người dùng này (ví dụ: tổng thu nhập, tổng chi tiêu, tỷ lệ phần trăm các danh mục chi tiêu lớn nhất).
2. Đánh giá tính hợp lý trong hành vi chi tiêu của họ (ví dụ: có chi quá nhiều cho giải trí, ăn uống hay mua sắm không).
3. Đưa ra ít nhất 3 lời khuyên tài chính thiết thực, cụ thể và có thể hành động ngay được dựa trên dữ liệu giao dịch của họ để giúp họ tiết kiệm tiền hoặc đầu tư thông minh hơn.

Yêu cầu định dạng:
- Trả về phản hồi bằng Tiếng Việt.
- Sử dụng định dạng Markdown phong phú (sử dụng tiêu đề h3 ###, danh sách bullet, bảng so sánh hoặc chữ in đậm).
- Tránh dùng các từ ngữ quá học thuật, hãy dùng văn phong gần gũi, khích lệ và mang tính xây dựng.
`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('Gemini API key is not configured, returning mock response...');
      // Return a smart mocked response based on actual data
      const mockResult = generateMockAiResponse(req.user.name, transactions);
      return res.json({ success: true, data: mockResult });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.json({ success: true, data: text });
    } catch (aiError) {
      console.error('Gemini API execution error:', aiError);
      // Fallback to mock if API key fails
      const mockResult = generateMockAiResponse(req.user.name, transactions);
      res.json({ success: true, data: mockResult });
    }

  } catch (error) {
    console.error('Get savings suggestion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to generate high-quality mock response when API key is missing/fails
const generateMockAiResponse = (userName, transactions) => {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Group expenses by category
  const expenseByCategory = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const catName = t.categoryId ? t.categoryId.name : 'Khác';
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + t.amount;
    });

  let topCategory = 'Không có';
  let topAmount = 0;
  for (const [cat, amt] of Object.entries(expenseByCategory)) {
    if (amt > topAmount) {
      topAmount = amt;
      topCategory = cat;
    }
  }

  return `
### 🤖 Lời Khuyên Tài Chính từ Cố vấn AI (Offline Mode)

Chào **${userName}**! Tôi đã phân tích danh sách các giao dịch gần đây của bạn. Dưới đây là báo cáo phân tích và lời khuyên tài chính cá nhân dành riêng cho bạn:

#### 📊 Tóm Tắt Tình Hình Tài Chính Của Bạn:
*   **Tổng Thu Nhập:** \`${totalIncome.toLocaleString('vi-VN')} đ\`
*   **Tổng Chi Tiêu:** \`${totalExpense.toLocaleString('vi-VN')} đ\`
*   **Số Dư Thực Tế:** \`${netBalance.toLocaleString('vi-VN')} đ\` (${netBalance >= 0 ? 'Dương ✅' : 'Âm ⚠️'})
*   **Danh Mục Chi Tiêu Lớn Nhất:** \`${topCategory}\` với tổng chi là \`${topAmount.toLocaleString('vi-VN')} đ\`

#### 🔍 Nhận Xét và Phân Tích:
1.  **Dòng tiền:** ${netBalance >= 0 ? 'Chúc mừng bạn! Dòng tiền của bạn đang ở mức dương. Bạn đang kiểm soát tốt và chi tiêu trong phạm vi thu nhập của mình.' : 'Cảnh báo! Bạn đang chi tiêu vượt mức thu nhập. Số dư đang ở mức âm. Bạn cần rà soát lại ngay các khoản chi không cần thiết.'}
2.  **Trọng tâm chi tiêu:** Khoản chi tiêu cho danh mục **${topCategory}** đang chiếm tỷ lệ lớn nhất trong cơ cấu chi tiêu của bạn. Bạn nên kiểm tra xem có thể cắt giảm bớt các khoản chi nhỏ lẻ trong danh mục này hay không.

#### 💡 3 Lời Khuyên Vàng Tiết Kiệm Chi Tiêu:
1.  **Thiết lập Hạn Mức Ngân Sách:** Hãy sử dụng chức năng **Ngân Sách** của ứng dụng để đặt hạn mức cho danh mục **${topCategory}** trong tháng tới ở mức thấp hơn khoảng 15% so với hiện tại.
2.  **Quy Tắc 24 Giờ:** Đối với các khoản chi phát sinh trong nhóm không thiết yếu (giải trí, mua sắm), hãy chờ 24 giờ trước khi thanh toán. Điều này sẽ giúp bạn tránh được những quyết định mua sắm bốc đồng.
3.  **Tự Động Hóa Tiết Kiệm:** Hãy trích ra ít nhất 10% thu nhập của bạn gửi vào tài khoản tiết kiệm ngay khi nhận lương, trước khi phân bổ cho các nhu cầu chi tiêu khác.

*Lưu ý: Đây là phản hồi phân tích tự động ngoại tuyến của hệ thống. Để có lời khuyên sinh động chi tiết từ Trí tuệ Nhân tạo Gemini, vui lòng cấu hình biến môi trường \`GEMINI_API_KEY\` ở backend.*
`;
};

// @desc    Chat with AI Advisor
// @route   POST /api/ai/chat
// @access  Private
const chatWithAi = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('categoryId')
      .sort({ date: -1 })
      .limit(50);

    const txSummary = transactions.map(t => ({
      date: new Date(t.date).toLocaleDateString('vi-VN'),
      category: t.categoryId ? t.categoryId.name : 'Khác',
      type: t.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      amount: `${t.amount.toLocaleString('vi-VN')} đ`,
      description: t.description || 'Không có mô tả'
    }));

    const systemInstruction = `
Bạn là một chuyên gia kiêm Cố vấn Tài chính Cá nhân (AI Financial Advisor) thân thiện, chuyên nghiệp.
Dưới đây là danh sách tối đa 50 giao dịch tài chính gần đây của người dùng tên là "${req.user.name}":
${JSON.stringify(txSummary, null, 2)}

Yêu cầu định dạng:
- Trả lời bằng Tiếng Việt.
- RẤT QUAN TRỌNG: Câu trả lời phải thật NGẮN GỌN, súc tích và đi thẳng vào vấn đề chính. Tối đa 3-4 câu hoặc các gạch đầu dòng ngắn. Không giải thích dài dòng hay lan man.
- Sử dụng định dạng Markdown (tiêu đề h3 ###, danh sách bullet, in đậm) để làm nổi bật các ý chính quan trọng.
- Dùng văn phong gần gũi, dễ hiểu, tránh các từ ngữ quá học thuật.
- Trả lời đúng trọng tâm dựa trên dữ liệu giao dịch ở trên.
`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('Gemini API key is not configured, returning mock response...');
      return res.json({
        success: true,
        data: `Xin lỗi, tôi hiện đang ở chế độ ngoại tuyến (Offline Mode) nên không thể trò chuyện trực tiếp lúc này. Để tôi hoạt động đầy đủ, vui lòng cấu hình \`GEMINI_API_KEY\`.`
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const formattedHistory = Array.isArray(history) ? history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })) : [];

      const historyWithContext = [
        {
          role: 'user',
          parts: [{ text: systemInstruction }]
        },
        {
          role: 'model',
          parts: [{ text: 'Tuyệt vời, tôi đã ghi nhận dữ liệu giao dịch và các yêu cầu định dạng. Tôi sẵn sàng phân tích và trả lời các câu hỏi của bạn!' }]
        },
        ...formattedHistory
      ];

      const chat = model.startChat({ history: historyWithContext });

      const result = await chat.sendMessage(message);
      const text = result.response.text();

      res.json({ success: true, data: text });
    } catch (aiError) {
      console.error('Gemini API execution error:', aiError);
      res.json({
        success: true,
        data: `Xin lỗi, có lỗi khi kết nối đến AI. Hãy thử lại sau ít phút.`
      });
    }

  } catch (error) {
    console.error('Chat with AI error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getSavingsSuggestions, chatWithAi };
