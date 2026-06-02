const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const mongoose = require('mongoose');

// @desc    Get user transactions (with filters and pagination)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate, categoryId, type, search } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('categoryId')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('categoryId');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction by id error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to check budget warning
const checkBudgetLimit = async (userId, categoryId, amount, transactionDate, excludeTransactionId = null) => {
  const date = transactionDate ? new Date(transactionDate) : new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Find budget for this category
  const budget = await Budget.findOne({ userId, categoryId, month, year });
  if (!budget) return { warning: false };

  // Calculate current total expenses in this category (excluding the transaction if updating)
  const matchQuery = {
    userId: new mongoose.Types.ObjectId(userId),
    categoryId: new mongoose.Types.ObjectId(categoryId),
    type: 'expense',
    date: {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59, 999)
    }
  };

  if (excludeTransactionId) {
    matchQuery._id = { $ne: excludeTransactionId };
  }

  const result = await Transaction.aggregate([
    { $match: matchQuery },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const existingTotal = result.length > 0 ? result[0].total : 0;
  const newTotal = existingTotal + amount;

  if (newTotal > budget.amountLimit) {
    return {
      warning: true,
      message: `Cảnh báo: Chi tiêu trong tháng của danh mục này đã vượt quá hạn mức ngân sách! Hạn mức: ${budget.amountLimit.toLocaleString('vi-VN')}đ, Hiện tại đã chi: ${newTotal.toLocaleString('vi-VN')}đ`,
      amountLimit: budget.amountLimit,
      totalSpent: newTotal
    };
  }

  return { warning: false };
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { categoryId, amount, type, date, description } = req.body;

    if (!categoryId || amount === undefined || !type) {
      return res.status(400).json({ success: false, message: 'Please provide categoryId, amount, and type' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const txDate = date ? new Date(date) : new Date();

    // Check budget warning if it is an expense
    let warningInfo = null;
    if (type === 'expense') {
      const budgetCheck = await checkBudgetLimit(req.user._id, categoryId, amount, txDate);
      if (budgetCheck.warning) {
        warningInfo = budgetCheck.message;
      }
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      categoryId,
      amount,
      type,
      date: txDate,
      description: description || ''
    });

    const populatedTx = await Transaction.findById(transaction._id).populate('categoryId');

    // Emit realtime event
    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:new', { userId: req.user._id.toString(), transaction: populatedTx });
    }

    res.status(201).json({
      success: true,
      data: populatedTx,
      budgetWarning: warningInfo ? true : false,
      warningMessage: warningInfo
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const { categoryId, amount, type, date, description } = req.body;

    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const newCategoryId = categoryId || transaction.categoryId;
    const newAmount = amount !== undefined ? amount : transaction.amount;
    const newType = type || transaction.type;
    const newDate = date ? new Date(date) : transaction.date;

    if (newAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    // Check budget warning if it is or becomes an expense
    let warningInfo = null;
    if (newType === 'expense') {
      const budgetCheck = await checkBudgetLimit(req.user._id, newCategoryId, newAmount, newDate, transaction._id);
      if (budgetCheck.warning) {
        warningInfo = budgetCheck.message;
      }
    }

    transaction.categoryId = newCategoryId;
    transaction.amount = newAmount;
    transaction.type = newType;
    transaction.date = newDate;
    transaction.description = description !== undefined ? description : transaction.description;

    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id).populate('categoryId');

    // Emit realtime event
    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:updated', { userId: req.user._id.toString(), transaction: populatedTx });
    }

    res.json({
      success: true,
      data: populatedTx,
      budgetWarning: warningInfo ? true : false,
      warningMessage: warningInfo
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await Transaction.findByIdAndDelete(req.params.id);

    // Emit realtime event
    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:deleted', { userId: req.user._id.toString(), transactionId: req.params.id });
    }

    res.json({ success: true, message: 'Transaction removed' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
