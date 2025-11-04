const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '', // Empty for dev, set master key in production
});

const PRODUCTS_INDEX = 'products';

// Initialize index with settings
async function initializeIndex() {
  try {
    const index = client.index(PRODUCTS_INDEX);
    
    // Configure searchable attributes (in order of importance)
    await index.updateSearchableAttributes([
      'title',
      'producerBusinessName',
      'categoryName',
      'producerCity',
      'producerState',
      'producerAddressLine1',
      'description',
    ]);

    // Configure filterable attributes
    await index.updateFilterableAttributes([
      'categoryId',
      'producerId',
      'price',
      'inventory',
      'discountType',
      'averageRating',
    ]);

    // Configure sortable attributes
    await index.updateSortableAttributes([
      'price',
      'createdAt',
      'averageRating',
      'totalReviews',
    ]);

    // Configure ranking rules
    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'averageRating:desc',
      'totalReviews:desc',
    ]);

    // Configure typo tolerance
    await index.updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
    });

    console.log('✅ Meilisearch index initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Meilisearch index:', error);
  }
}

module.exports = {
  client,
  PRODUCTS_INDEX,
  initializeIndex,
};
