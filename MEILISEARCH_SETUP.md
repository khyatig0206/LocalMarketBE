# Meilisearch Setup Guide

## Step 1: Install and Run Meilisearch Server

### Option A: Using Docker (Recommended)
```bash
docker run -d -p 7700:7700 -v $(pwd)/meili_data:/meili_data getmeili/meilisearch:latest
```

### Option B: Direct Download (Windows)
1. Download the latest release from: https://github.com/meilisearch/meilisearch/releases
2. Extract and run the executable
3. It will start on http://localhost:7700

### Verify Meilisearch is Running
Open http://localhost:7700 in your browser. You should see the Meilisearch dashboard.

---

## Step 2: Configure Environment Variables

Add to your `.env` file:
```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=
```

For development, leave `MEILISEARCH_API_KEY` empty. For production, generate a master key.

---

## Step 3: Run Initial Sync

This will populate Meilisearch with all existing products from PostgreSQL:

```bash
cd BE
node scripts/syncToMeilisearch.js
```

You should see:
```
✅ Database connection established
⚙️  Initializing Meilisearch index...
✅ Meilisearch index initialized successfully
📦 Syncing all products to Meilisearch...
✅ Synced X products to Meilisearch
🎉 Initial sync completed successfully!
```

---

## Step 4: Test the Search API

### Instant Search (for navbar autocomplete)
```bash
curl "http://localhost:3000/api/search/instant?q=tomato&limit=5"
```

### Advanced Search (with filters)
```bash
curl "http://localhost:3000/api/search?q=organic&categoryId=1&minPrice=10&maxPrice=100&sortBy=price_asc"
```

### Get Suggestions
```bash
curl "http://localhost:3000/api/search/suggestions?q=tom"
```

---

## Available API Endpoints

### Public Endpoints

#### GET `/api/search/instant`
Quick search for navbar autocomplete
- Query params: `q` (query), `limit` (default: 5, max: 10)
- Returns: Array of matching products with highlighting

#### GET `/api/search`
Advanced search with filters and pagination
- Query params:
  - `q` - Search query (optional)
  - `categoryId` - Filter by category
  - `producerId` - Filter by producer
  - `minPrice` - Minimum price
  - `maxPrice` - Maximum price
  - `inStockOnly` - Only show in-stock products (true/false)
  - `discountOnly` - Only show discounted products (true/false)
  - `sortBy` - Sort option: `relevance`, `price_asc`, `price_desc`, `rating_desc`, `newest`
  - `page` - Page number (default: 1)
  - `limit` - Results per page (default: 20, max: 50)
- Returns: Object with `hits`, `totalHits`, `totalPages`, etc.

#### GET `/api/search/suggestions`
Get autocomplete suggestions
- Query params: `q` (query), `limit` (default: 5, max: 10)
- Returns: Array of title suggestions

### Admin Endpoints

#### POST `/api/search/sync`
Manually trigger a full sync of all products
- Returns: Success status and task UID

---

## How Auto-Sync Works

The system automatically keeps Meilisearch in sync with PostgreSQL:

1. **Product Created** → Synced to Meilisearch
2. **Product Updated** → Updated in Meilisearch
3. **Product Deleted** → Removed from Meilisearch

All sync operations run in the background and don't block the API response.

---

## Troubleshooting

### Meilisearch server not running
```
Error: connect ECONNREFUSED 127.0.0.1:7700
```
**Solution**: Make sure Meilisearch is running. Check with `docker ps` or by opening http://localhost:7700

### Products not showing in search
**Solution**: Run the initial sync script:
```bash
node scripts/syncToMeilisearch.js
```

### Search results are outdated
**Solution**: Manually trigger a sync:
```bash
curl -X POST http://localhost:3000/api/search/sync
```

### Reset everything
```bash
# Stop Meilisearch
docker stop <container-id>

# Remove data directory
rm -rf meili_data

# Restart Meilisearch
docker run -d -p 7700:7700 -v $(pwd)/meili_data:/meili_data getmeili/meilisearch:latest

# Run initial sync
node scripts/syncToMeilisearch.js
```

---

## Production Deployment

### Using Meilisearch Cloud (Recommended)
1. Sign up at https://www.meilisearch.com/cloud
2. Create a project
3. Get your host URL and API key
4. Update `.env`:
   ```env
   MEILISEARCH_HOST=https://your-project.meilisearch.io
   MEILISEARCH_API_KEY=your_master_key
   ```

### Self-Hosted
1. Deploy Meilisearch on your server (Docker/systemd)
2. Generate a strong master key
3. Enable HTTPS
4. Configure CORS properly
5. Run initial sync

---

## Performance Tips

1. **Index Settings**: Already configured for optimal search (typo tolerance, ranking rules)
2. **Highlighting**: Results include `<mark>` tags around matched text
3. **Response Time**: Should be <50ms for most queries
4. **Scalability**: Meilisearch can handle millions of documents

---

## Next Steps

Now you can integrate the search in your frontend:
- Update navbar search component to use instant search
- Create search results page with filters
- Add highlighting to search results
- Implement recent searches (localStorage)
