const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });
const { authenticateUser } = require('../middleware/userAuth');
const {
  userCreateDispute,
  userListDisputes,
  getDisputeByIdForUser,
  userPostMessage,
} = require('../controllers/disputeController');

// User disputes
router.post('/', authenticateUser, upload.array('images', 5), userCreateDispute);
router.get('/', authenticateUser, userListDisputes);
router.get('/:id', authenticateUser, getDisputeByIdForUser);
router.post('/:id/messages', authenticateUser, upload.array('images', 5), userPostMessage);

module.exports = router;
