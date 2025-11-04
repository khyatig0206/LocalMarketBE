const express = require('express');
const router = express.Router();
const {
  instantSearchProducts,
  searchProducts,
  getSearchSuggestions,
  syncAllProducts,
} = require('../controllers/searchController');

// Public search endpoints
router.get('/instant', instantSearchProducts);
router.get('/', searchProducts);
router.get('/suggestions', getSearchSuggestions);

// Admin endpoint (TODO: add admin auth middleware)
router.post('/sync', syncAllProducts);

module.exports = router;
