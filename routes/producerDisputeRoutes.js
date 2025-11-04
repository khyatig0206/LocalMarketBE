const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });
const { authenticateProducer } = require('../middleware/authmiddleware');
const {
  producerListDisputes,
  getDisputeByIdForProducer,
  producerPostMessage,
} = require('../controllers/disputeController');

router.get('/', authenticateProducer, producerListDisputes);
router.get('/:id', authenticateProducer, getDisputeByIdForProducer);
router.post('/:id/messages', authenticateProducer, upload.array('images', 5), producerPostMessage);

module.exports = router;
