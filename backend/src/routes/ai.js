const express = require('express');
const router = express.Router();
const { getSavingsSuggestions } = require('../controllers/aiController');
const { protect } = require('../middlewares/auth');

router.post('/savings-suggestion', protect, getSavingsSuggestions);

module.exports = router;
