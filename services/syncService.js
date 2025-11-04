const { client, PRODUCTS_INDEX } = require('../config/meilisearch');
const { Product, Producer, Category } = require('../models');

/**
 * Format product for Meilisearch index
 */
function formatProductForSearch(product) {
  return {
    id: product.id,
    title: product.title,
    description: product.description || '',
    price: Number(product.price),
    images: product.images || [],
    categoryId: product.categoryId,
    categoryName: product.Category?.name || '',
    producerId: product.producerId,
    producerBusinessName: product.Producer?.businessName || '',
    producerCity: product.Producer?.businessCity || product.Producer?.city || '',
    producerState: product.Producer?.businessState || product.Producer?.state || '',
    producerAddressLine1: product.Producer?.businessAddressLine1 || product.Producer?.addressLine1 || '',
    averageRating: Number(product.averageRating || 0),
    totalReviews: Number(product.totalReviews || 0),
    inventory: Number(product.inventory),
    unitSize: Number(product.unitSize || 1),
    unitLabel: product.unitLabel || 'unit',
    discountType: product.discountType || 'none',
    discountValue: Number(product.discountValue || 0),
    discountMinQuantity: product.discountMinQuantity,
    discountMinSubtotal: product.discountMinSubtotal,
    createdAt: new Date(product.createdAt).getTime(),
    updatedAt: new Date(product.updatedAt).getTime(),
  };
}

/**
 * Sync a single product to Meilisearch
 */
async function syncProduct(productId) {
  try {
    const product = await Product.findByPk(productId, {
      include: [
        { model: Producer, attributes: ['businessName', 'businessCity', 'businessState', 'businessAddressLine1', 'city', 'state', 'addressLine1'] },
        { model: Category, attributes: ['name'] },
      ],
    });

    if (!product) {
      console.log(`Product ${productId} not found, skipping sync`);
      return;
    }

    const index = client.index(PRODUCTS_INDEX);
    const formattedProduct = formatProductForSearch(product);
    
    await index.addDocuments([formattedProduct], { primaryKey: 'id' });
    console.log(`✅ Synced product ${productId} to Meilisearch`);
  } catch (error) {
    console.error(`❌ Error syncing product ${productId}:`, error);
    throw error;
  }
}

/**
 * Delete a product from Meilisearch
 */
async function deleteProduct(productId) {
  try {
    const index = client.index(PRODUCTS_INDEX);
    await index.deleteDocument(productId);
    console.log(`✅ Deleted product ${productId} from Meilisearch`);
  } catch (error) {
    console.error(`❌ Error deleting product ${productId} from Meilisearch:`, error);
    throw error;
  }
}

/**
 * Sync all products to Meilisearch (initial sync or full resync)
 */
async function syncAllProducts() {
  try {
    console.log('🔄 Starting full product sync to Meilisearch...');
    
    const products = await Product.findAll({
      include: [
        { model: Producer, attributes: ['businessName', 'businessCity', 'businessState', 'businessAddressLine1', 'city', 'state', 'addressLine1'] },
        { model: Category, attributes: ['name'] },
      ],
    });

    if (products.length === 0) {
      console.log('⚠️ No products found to sync');
      return;
    }

    const index = client.index(PRODUCTS_INDEX);
    const formattedProducts = products.map(formatProductForSearch);
    
    const result = await index.addDocuments(formattedProducts, { primaryKey: 'id' });
    console.log(`✅ Synced ${products.length} products to Meilisearch`);
    console.log('Task UID:', result.taskUid);
    
    return result;
  } catch (error) {
    console.error('❌ Error syncing all products:', error);
    throw error;
  }
}

/**
 * Clear all documents from the index
 */
async function clearIndex() {
  try {
    const index = client.index(PRODUCTS_INDEX);
    await index.deleteAllDocuments();
    console.log('✅ Cleared Meilisearch index');
  } catch (error) {
    console.error('❌ Error clearing index:', error);
    throw error;
  }
}

module.exports = {
  syncProduct,
  deleteProduct,
  syncAllProducts,
  clearIndex,
};
