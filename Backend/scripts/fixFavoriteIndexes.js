// scripts/fixFavoriteIndexes.js
const mongoose = require('mongoose');
require('dotenv').config();
const Favorite = require('../models/Favorite');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

async function fixIndexes() {
  try {
    await connectDB();
    console.log('🔧 Starting to fix favorite indexes...\n');

    // 1. List all existing indexes
    console.log('1️⃣ Listing all existing indexes...');
    const existingIndexes = await Favorite.collection.indexes();
    console.log('   Existing indexes:', existingIndexes.map(idx => idx.name || JSON.stringify(idx.key)));

    // 2. Drop ALL indexes except _id
    console.log('\n2️⃣ Dropping all indexes (except _id)...');
    try {
      const indexes = await Favorite.collection.indexes();
      for (const index of indexes) {
        const indexName = index.name;
        if (indexName !== '_id_') {
          try {
            await Favorite.collection.dropIndex(indexName);
            console.log(`   ✅ Dropped index: ${indexName}`);
          } catch (err) {
            if (err.code === 27) {
              console.log(`   ⚠️ Index ${indexName} does not exist`);
            } else {
              console.error(`   ❌ Error dropping ${indexName}:`, err.message);
            }
          }
        }
      }
    } catch (err) {
      console.error('   ❌ Error dropping indexes:', err.message);
    }

    // 3. Cleanup documents with null values
    console.log('\n3️⃣ Cleaning up documents with null values...');
    const result1 = await Favorite.deleteMany({ 
      product: null, 
      store: { $exists: false } 
    });
    console.log(`   ✅ Deleted ${result1.deletedCount} documents with product: null and no store`);

    const result2 = await Favorite.deleteMany({ 
      store: null, 
      product: { $exists: false } 
    });
    console.log(`   ✅ Deleted ${result2.deletedCount} documents with store: null and no product`);

    // 4. Create new partial indexes
    // QUAN TRỌNG: Index này cho phép một user favorite NHIỀU products/stores khác nhau
    // Nhưng không thể favorite cùng một product/store 2 lần
    console.log('\n4️⃣ Creating new partial indexes...');
    console.log('   📝 Index rule:');
    console.log('      - Một user có thể favorite NHIỀU products khác nhau');
    console.log('      - Một user có thể favorite NHIỀU stores khác nhau');
    console.log('      - Nhưng không thể favorite cùng một product/store 2 lần');
    
    await Favorite.collection.createIndex(
      { user: 1, product: 1 },
      { 
        unique: true, 
        name: 'user_1_product_1',
        partialFilterExpression: { product: { $exists: true, $ne: null } }
      }
    );
    console.log('   ✅ Created index: user_1_product_1 (partial, unique)');

    await Favorite.collection.createIndex(
      { user: 1, store: 1 },
      { 
        unique: true, 
        name: 'user_1_store_1',
        partialFilterExpression: { store: { $exists: true, $ne: null } }
      }
    );
    console.log('   ✅ Created index: user_1_store_1 (partial, unique)');

    // 5. Verify indexes
    console.log('\n5️⃣ Verifying indexes...');
    const newIndexes = await Favorite.collection.indexes();
    console.log('   New indexes:', newIndexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique,
      partialFilterExpression: idx.partialFilterExpression
    })));

    console.log('\n✅ All indexes fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    process.exit(0);
  }
}

fixIndexes();

