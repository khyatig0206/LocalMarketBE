# Pallihaat Backend API

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel)](https://local-market-store-qgcp.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

A robust Node.js/Express backend API powering the Pallihaat digital marketplace platform, featuring AI-powered KYC verification, real-time search, secure payments, and comprehensive producer management.

## 🏗️ Architecture

### Core Technologies
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Sequelize ORM
- **Search Engine**: MeiliSearch for instant product search
- **Authentication**: JWT tokens with bcryptjs hashing
- **Deployment**: Vercel serverless functions

### Key Dependencies
- `express`: Web framework for API routes
- `sequelize`: PostgreSQL ORM with migration support
- `pg`: PostgreSQL client driver
- `meilisearch`: Full-text search engine
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT authentication
- `razorpay`: Payment gateway integration
- `cloudinary`: Cloud image storage and optimization
- `firebase-admin`: Push notification service
- `multer`: File upload handling

## 🚀 Features

### 🔐 Authentication & Authorization
- JWT-based authentication system
- Producer and admin role management
- Secure password hashing with bcryptjs
- Middleware for route protection

### 🧑‍🌾 Producer Management
- **KYC Verification**: Automated Aadhaar OCR using Google Gemini AI
- **Profile Management**: Business details, addresses, and documentation
- **Product Catalog**: Inventory management with custom units
- **Wallet System**: Automated commission calculations and payouts
- **Analytics**: Revenue tracking and performance metrics

### 🛒 E-commerce Core
- **Product Management**: CRUD operations with image uploads
- **Order Processing**: Complete lifecycle from placement to delivery
- **Payment Integration**: Razorpay gateway with webhook verification
- **Cart System**: Persistent shopping cart with item management
- **Review System**: Customer feedback and rating aggregation

### 🔍 Advanced Search
- **MeiliSearch Integration**: Configured for products with custom attributes
- **Searchable Fields**: Title, producer name, category, location, description
- **Filterable Attributes**: Category, price, inventory, rating
- **Sortable Fields**: Price, date, rating, popularity
- **Typo Tolerance**: Intelligent fuzzy matching

### 📍 Location Services
- **Geocoding**: Google Maps API for address validation
- **Producer Discovery**: Location-based search with distance calculations
- **Address Management**: User and producer address storage

### 💬 Communication
- **Push Notifications**: Firebase Cloud Messaging for real-time alerts
- **Dispute Resolution**: Built-in messaging system for order disputes
- **Admin Mediation**: Administrative intervention capabilities

### 📊 Analytics & Reporting
- **Order Analytics**: Revenue trends and order statistics
- **Product Performance**: Sales tracking and inventory alerts
- **Producer Metrics**: Earnings, ratings, and customer feedback
- **Platform Overview**: Admin dashboard with comprehensive metrics

## 📁 Project Structure

```
BE/
├── app.js                 # Main Express application setup
├── index.js              # Server entry point and Vercel export
├── vercel.json           # Vercel deployment configuration
├── package.json          # Dependencies and scripts
├── config/
│   ├── db.js            # PostgreSQL connection configuration
│   └── meilisearch.js   # MeiliSearch client setup
├── controllers/          # Route handler logic
│   ├── userController.js
│   ├── producerController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── cartController.js
│   ├── reviewController.js
│   ├── disputeController.js
│   ├── searchController.js
│   ├── kycController.js
│   ├── pushController.js
│   └── adminController.js
├── middleware/           # Express middleware
│   ├── authmiddleware.js
│   └── userAuth.js
├── models/              # Sequelize database models
│   ├── User.js
│   ├── Producer.js
│   ├── Product.js
│   ├── Order.js
│   ├── Cart.js
│   ├── Review.js
│   ├── Dispute.js
│   ├── Category.js
│   ├── Address.js
│   └── index.js         # Model associations
├── routes/              # API route definitions
│   ├── userRoutes.js
│   ├── producerRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   ├── cartRoutes.js
│   ├── reviewRoutes.js
│   ├── disputeRoutes.js
│   ├── search.js
│   ├── addressRoutes.js
│   ├── categoryRoutes.js
│   └── adminRoutes.js
├── services/            # Business logic services
│   ├── gemini.js       # Google Gemini AI integration
│   ├── geocode.js      # Google Maps geocoding
│   ├── searchService.js # MeiliSearch operations
│   └── syncService.js  # Search index synchronization
├── utils/               # Utility functions
│   ├── cloudinary.js   # Image upload utilities
│   ├── firebaseAdmin.js # Firebase admin setup
│   └── push.js         # Push notification helpers
└── scripts/             # Database maintenance scripts
    └── syncToMeilisearch.js
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the BE directory with the following variables:

```env
# Database Configuration
DB_NAME=your_postgres_database_name
DB_USER=your_postgres_username
DB_PASS=your_postgres_password
DB_HOST=your_postgres_host
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# MeiliSearch Configuration
MEILISEARCH_HOST=https://your-meilisearch-instance.com
MEILISEARCH_API_KEY=your_meilisearch_api_key

# Google Gemini AI
GEMINI_API_KEY=your_google_gemini_api_key

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Admin Credentials
ADMIN_EMAIL=admin@pallihaat.com
ADMIN_PASSWORD=secure_admin_password
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- MeiliSearch instance
- Vercel CLI (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pallihaat.git
   cd pallihaat/BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Sync MeiliSearch index**
   ```bash
   node scripts/syncToMeilisearch.js
   ```

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard

## 📡 API Endpoints

### Authentication
- `POST /api/users/signup` - User registration
- `POST /api/users/signin` - User login
- `POST /api/producer/signup` - Producer registration
- `POST /api/producer/signin` - Producer login

### Products
- `GET /api/products` - List products with filtering
- `POST /api/products` - Create product (producer only)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `PUT /api/orders/:id/status` - Update order status

### Search
- `GET /api/search` - Advanced product search
- `GET /api/search/suggestions` - Search suggestions

### Categories
- `GET /api/categories` - List categories
- `POST /api/admin/categories` - Create category (admin only)

### Cart Management
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove cart item

### Reviews
- `GET /api/reviews/:productId` - Get product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review

### Disputes
- `POST /api/disputes` - Create dispute
- `GET /api/disputes` - Get user disputes
- `POST /api/disputes/:id/messages` - Send message

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/producers` - List producers
- `PUT /api/admin/producers/:id/verify` - Verify producer

## 🗄️ Database Schema

### Key Tables
- **users**: Customer accounts
- **producers**: Farmer/producer profiles
- **products**: Product catalog
- **orders**: Order management
- **order_items**: Order line items
- **categories**: Product categories
- **reviews**: Customer feedback
- **disputes**: Dispute management
- **dispute_messages**: Dispute conversations
- **addresses**: User and producer addresses
- **carts**: Shopping cart items
- **producer_wallets**: Financial tracking
- **push_tokens**: FCM notification tokens

## 🔍 MeiliSearch Configuration

### Index Settings
- **Searchable Attributes**: title, producerBusinessName, categoryName, producerCity, producerState, producerAddressLine1, description
- **Filterable Attributes**: categoryId, producerId, price, inventory, discountType, averageRating
- **Sortable Attributes**: price, createdAt, averageRating, totalReviews
- **Ranking Rules**: words, typo, proximity, attribute, sort, exactness, averageRating:desc, totalReviews:desc

### Index Synchronization
- Automatic sync on product CRUD operations
- Background sync service for bulk operations
- Error handling and retry logic

## 🤖 AI Integration

### Google Gemini AI
- **Aadhaar OCR**: Automated document reading
- **Data Extraction**: Intelligent field parsing
- **Address Recognition**: Smart address formatting
- **Error Handling**: Fallback for manual entry

### Geocoding Service
- **Address Validation**: Google Maps API integration
- **Coordinate Lookup**: Latitude/longitude conversion
- **Distance Calculation**: Producer discovery logic

## 💰 Payment Integration

### Razorpay Gateway
- **Order Creation**: Secure payment initialization
- **Webhook Verification**: Transaction confirmation
- **COD Support**: Cash on delivery option
- **Commission Calculation**: Automated fee processing

## 🔔 Notification System

### Firebase Cloud Messaging
- **Multi-platform Support**: Web and mobile notifications
- **Token Management**: Secure FCM token storage
- **Message Types**: Order updates, KYC status, disputes
- **Background Processing**: Service worker integration

## 📊 Monitoring & Analytics

### Serverless Metrics
- Vercel function execution times
- Error tracking and logging
- Database query performance
- API response times

### Business Analytics
- Order volume and revenue tracking
- User engagement metrics
- Producer performance statistics
- Search query analytics

## 🔒 Security Measures

- **JWT Authentication**: Stateless token-based auth
- **Password Hashing**: bcryptjs with salt rounds
- **Input Sanitization**: Sequelize built-in protection
- **CORS Configuration**: Proper origin restrictions
- **Rate Limiting**: Vercel platform-level protection
- **SSL/TLS**: Automatic HTTPS encryption

## 🚀 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: PostgreSQL connection management
- **Caching**: Vercel edge network caching
- **Image Optimization**: Cloudinary transformations
- **Code Splitting**: Modular service architecture

## 🔧 Development Tools

- **Nodemon**: Development server with auto-reload
- **Sequelize CLI**: Database migration management
- **ESLint**: Code quality enforcement
- **Dotenv**: Environment variable management

## 📈 Scaling Considerations

- **Serverless Architecture**: Automatic scaling via Vercel
- **Database Optimization**: Query optimization and indexing
- **Search Performance**: MeiliSearch clustering support
- **Caching Strategy**: Redis integration ready
- **CDN Integration**: Global asset delivery

---

*Backend API powering direct farmer-to-consumer marketplace connections*