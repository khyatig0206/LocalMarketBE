const { client, PRODUCTS_INDEX } = require('../config/meilisearch');

/**
 * Search products with instant results
 */
async function instantSearch(query, options = {}) {
  try {
    const { limit = 5 } = options;
    
    if (!query || query.trim().length === 0) {
      return [];
    }

    const index = client.index(PRODUCTS_INDEX);
    const results = await index.search(query, {
      limit,
      attributesToHighlight: ['title', 'description', 'producerBusinessName', 'categoryName'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    });

    return results.hits;
  } catch (error) {
    console.error('Error in instant search:', error);
    return [];
  }
}

/**
 * Advanced search with filters, sorting, and pagination
 */
async function advancedSearch(query, options = {}) {
  try {
    const {
      categoryId,
      producerId,
      minPrice,
      maxPrice,
      inStockOnly = false,
      discountOnly = false,
      sortBy = 'relevance', // relevance, price_asc, price_desc, rating_desc, newest
      page = 1,
      limit = 20,
    } = options;

    const index = client.index(PRODUCTS_INDEX);
    
    // Build filters
    const filters = [];
    if (categoryId) filters.push(`categoryId = ${categoryId}`);
    if (producerId) filters.push(`producerId = ${producerId}`);
    if (minPrice) filters.push(`price >= ${minPrice}`);
    if (maxPrice) filters.push(`price <= ${maxPrice}`);
    if (inStockOnly) filters.push('inventory > 0');
    if (discountOnly) filters.push('discountType != none');

    // Build sort
    let sort = [];
    switch (sortBy) {
      case 'price_asc':
        sort = ['price:asc'];
        break;
      case 'price_desc':
        sort = ['price:desc'];
        break;
      case 'rating_desc':
        sort = ['averageRating:desc'];
        break;
      case 'newest':
        sort = ['createdAt:desc'];
        break;
      default:
        // Use default ranking rules (relevance)
        sort = [];
    }

    const offset = (page - 1) * limit;

    const searchOptions = {
      limit,
      offset,
      attributesToHighlight: ['title', 'description', 'producerBusinessName', 'categoryName'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    };

    if (filters.length > 0) {
      searchOptions.filter = filters.join(' AND ');
    }

    if (sort.length > 0) {
      searchOptions.sort = sort;
    }

    const results = await index.search(query || '', searchOptions);

    return {
      hits: results.hits,
      totalHits: results.estimatedTotalHits,
      totalPages: Math.ceil(results.estimatedTotalHits / limit),
      currentPage: page,
      limit,
      query: results.query,
      processingTimeMs: results.processingTimeMs,
    };
  } catch (error) {
    console.error('Error in advanced search:', error);
    throw error;
  }
}

/**
 * Get search suggestions (autocomplete)
 */
async function getSuggestions(query, limit = 5) {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const index = client.index(PRODUCTS_INDEX);
    const results = await index.search(query, {
      limit,
      attributesToRetrieve: ['title', 'id'],
    });

    return results.hits.map(hit => ({
      id: hit.id,
      title: hit.title,
    }));
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}

/**
 * Get facets for filtering
 */
async function getFacets(query = '') {
  try {
    const index = client.index(PRODUCTS_INDEX);
    const results = await index.search(query, {
      limit: 0,
      facets: ['categoryId', 'discountType', 'averageRating'],
    });

    return results.facetDistribution;
  } catch (error) {
    console.error('Error getting facets:', error);
    return {};
  }
}

module.exports = {
  instantSearch,
  advancedSearch,
  getSuggestions,
  getFacets,
};
