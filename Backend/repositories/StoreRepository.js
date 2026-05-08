const Store = require('../models/Store');
const Product = require('../models/Product');
const Review = require('../models/Review');

class StoreRepository {
  // Tạo store
  async create(storeData) {
    const store = new Store(storeData);
    return await store.save();
  }

  // Tìm store theo owner
  async findByOwner(ownerId) {
    return await Store.findOne({ owner: ownerId });
  }

  // Tìm store theo ID
  async findById(storeId, populate = false) {
    let query = Store.findById(storeId);
    if (populate) {
      query = query.populate('owner', 'fullName email phone');
    }
    return await query;
  }

  // Tìm tất cả active stores
  async findActiveStores(populate = false) {
    let query = Store.find({ isActive: true });
    if (populate) {
      query = query.populate('owner', 'fullName email');
    }
    return await query;
  }

  // Tìm tất cả stores (bao gồm cả inactive) - cho admin
  async findAllStores(populate = false) {
    console.log('📦 [StoreRepository] findAllStores called, populate:', populate);
    // Lấy tất cả stores không có điều kiện gì - KHÔNG filter theo isActive
    // Sử dụng find({}) để lấy tất cả, kể cả isActive: false
    const stores = await Store.find({}).sort({ createdAt: -1 });
    console.log(`📦 [StoreRepository] Tổng số stores từ MongoDB (find({})): ${stores.length}`);
    stores.forEach((store, idx) => {
      console.log(`📦 [StoreRepository] Store ${idx + 1}: _id=${store._id}, name=${store.name}, isActive=${store.isActive}, owner=${store.owner}`);
    });
    
    if (populate) {
      // Populate owner cho từng store - đảm bảo không mất stores nào
      const User = require('../models/Users');
      const populatedStores = [];
      
      for (let idx = 0; idx < stores.length; idx++) {
        const store = stores[idx];
        console.log(`🔄 [StoreRepository] Populating store ${idx + 1}/${stores.length} (${store._id})`);
        
        // Tạo bản sao của store để không modify trực tiếp
        // Sử dụng toObject() để convert Mongoose document sang plain object
        let storeObj;
        try {
          storeObj = store.toObject ? store.toObject() : JSON.parse(JSON.stringify(store));
        } catch (err) {
          // Nếu không thể convert, tạo object mới từ các field
          storeObj = {
            _id: store._id,
            name: store.name,
            description: store.description,
            storeAddress: store.storeAddress,
            logoUrl: store.logoUrl,
            bannerUrl: store.bannerUrl,
            contactPhone: store.contactPhone,
            contactEmail: store.contactEmail,
            category: store.category,
            rating: store.rating,
            isActive: store.isActive,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
            categories: store.categories || []
          };
        }
        
        // Populate owner
        if (store.owner) {
          try {
            const owner = await User.findById(store.owner).select('fullName email phone');
            if (owner) {
              storeObj.owner = owner.toObject ? owner.toObject() : {
                _id: owner._id,
                fullName: owner.fullName,
                email: owner.email,
                phone: owner.phone
              };
              console.log(`✅ [StoreRepository] Found owner for store ${store._id}: ${owner.fullName}`);
            } else {
              console.log(`⚠️ [StoreRepository] Owner not found for store ${store._id}, owner ID: ${store.owner}`);
              storeObj.owner = null;
            }
          } catch (err) {
            console.log(`❌ [StoreRepository] Error finding owner for store ${store._id}:`, err.message);
            storeObj.owner = null;
          }
        } else {
          console.log(`⚠️ [StoreRepository] Store ${store._id} has no owner field`);
          storeObj.owner = null;
        }
        
        // Đảm bảo luôn thêm store vào kết quả, kể cả khi owner không tồn tại
        console.log(`✅ [StoreRepository] Adding store ${idx + 1} to result: _id=${storeObj._id}, name=${storeObj.name}, isActive=${storeObj.isActive}`);
        populatedStores.push(storeObj);
      }
      
      console.log(`📦 [StoreRepository] Số stores sau populate: ${populatedStores.length}`);
      populatedStores.forEach((store, idx) => {
        console.log(`📦 [StoreRepository] Populated store ${idx + 1}: _id=${store._id}, name=${store.name}, isActive=${store.isActive}`);
      });
      return populatedStores;
    }
    
    return stores;
  }

  // Cập nhật store
  async update(storeId, updateData) {
    return await Store.findByIdAndUpdate(storeId, updateData, { new: true });
  }

  // Lấy products theo store (hiển thị tất cả sản phẩm, không lọc isActive)
  async getProductsByStore(storeId) {
    return await Product.find({ store: storeId });
  }

  // Lấy reviews theo productIds
  async getReviewsByProductIds(productIds) {
    return await Review.find({ productId: { $in: productIds } });
  }

  // Tìm kiếm stores theo keyword
  async searchStores(keyword, limit = 10) {
    const searchRegex = new RegExp(keyword, 'i');
    return await Store.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ]
    })
    .limit(limit)
    // Trả về đầy đủ thông tin để dùng chung StoreCard với danh sách cửa hàng
    .select('name description logoUrl bannerUrl category customCategory storeAddress createdAt isActive owner _id')
    .lean();
  }
}

module.exports = new StoreRepository();

