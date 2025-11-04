const { instantSearch, advancedSearch, getSuggestions } = require('../services/searchService');
const { syncAllProducts } = require('../services/syncService');

/**
 * Instant search for navbar (quick results)
 */
exports.instantSearchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const results = await instantSearch(q, { limit });
    res.json(results);
  } catch (error) {
    console.error('Instant search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * Advanced search with filters and pagination
 */
exports.searchProducts = async (req, res) => {
  try {
    const {
      q = '',
      categoryId,
      producerId,
      minPrice,
      maxPrice,
      inStockOnly,
      discountOnly,
      sortBy = 'relevance',
      page = 1,
      limit = 20,
    } = req.query;

    const options = {
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      producerId: producerId ? parseInt(producerId) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStockOnly: inStockOnly === 'true',
      discountOnly: discountOnly === 'true',
      sortBy,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
    };

    const results = await advancedSearch(q, options);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * Get autocomplete suggestions
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await getSuggestions(q, limit);
    res.json(suggestions);
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

/**
 * Trigger manual sync (admin only)
 */
exports.syncAllProducts = async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const result = await syncAllProducts();
    res.json({ 
      success: true, 
      message: 'Sync initiated',
      taskUid: result?.taskUid 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
};
