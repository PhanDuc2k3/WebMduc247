import React, { useEffect, useState } from "react";
import storeApi from "../../../api/storeApi";
import productApi from "../../../api/productApi";
import type { StoreType, Category, Product } from "../../../types/store";
import StoreInfo from "./StoreInfo";
import CategoryList from "./CategoryList";
import CategoryProducts from "./CategoryProducts";

const ManageStore: React.FC = () => {
  const [store, setStore] = useState<StoreType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // ========================
  // Fetch store & products
  // ========================
  const fetchStore = async () => {
    try {
      const res = await storeApi.getMyStore();
      const storeData: StoreType = res.data.store;
      storeData.categories = storeData.categories || [];
      setStore(storeData);
      setCategories(storeData.categories);
    } catch (err) {
      console.error("Fetch store error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!store?._id) return;
    try {
      const res = await productApi.getMyProducts();
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Fetch products error:", err);
    }
  };

  useEffect(() => { fetchStore(); }, []);
  useEffect(() => { fetchProducts(); }, [store]);

  if (loading) return <div>Đang tải...</div>;
  if (!store) return <div>Chưa có cửa hàng.</div>;

  // ========================
  // Update store
  // ========================
  const handleStoreUpdate = async () => {
    if (!store) return;
    try {
      const formData = new FormData();
      formData.append("name", store.name);
      formData.append("description", store.description);
      if (store.storeAddress) formData.append("storeAddress", store.storeAddress);
      formData.append("categories", JSON.stringify(categories));
      if (logoFile) formData.append("logo", logoFile);
      if (bannerFile) formData.append("banner", bannerFile);

      const res = await storeApi.updateStore(formData);
      setStore(res.data.store);
      setLogoFile(null);
      setBannerFile(null);
      alert("Cập nhật cửa hàng thành công!");
    } catch (err) {
      console.error("Update store error:", err);
      alert("Cập nhật cửa hàng thất bại!");
    }
  };

  // ========================
  // Category handlers
  // ========================
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !store) return;
    try {
      const res = await storeApi.addCategory(store._id, newCategoryName);
      const newCat: Category = res.data.category;
      setCategories([...categories, newCat]);
      setNewCategoryName("");
    } catch (err) {
      console.error("Add category error:", err);
      alert("Thêm danh mục thất bại!");
    }
  };
const handleEditCategory = async (id: string, name: string) => {
  if (!store) return;
  console.log("✏️ [DEBUG] Sửa danh mục", { id, name, storeId: store._id });
  try {
    const res = await storeApi.editCategory(store._id, id, name);
    console.log("✅ [DEBUG] Response editCategory:", res.data);
    setCategories(categories.map(c => (c._id === id ? { ...c, name } : c)));
  } catch (err) {
    console.error("❌ [DEBUG] Edit category error:", err);
    alert("Sửa danh mục thất bại!");
  }
};

  const handleDeleteCategory = async (id: string) => {
    if (!store) return;
    try {
      await storeApi.deleteCategory(store._id, id);
      setCategories(categories.filter(c => c._id !== id));
      if (selectedCategory === id) setSelectedCategory(null);
    } catch (err) {
      console.error("Delete category error:", err);
      alert("Xóa danh mục thất bại!");
    }
  };

  // ========================
  // Product handlers
  // ========================
  const handleRemoveProductFromCategory = async (productId: string) => {
    if (!store || !selectedCategory) return;
    try {
      await storeApi.removeProductFromCategory(store._id, selectedCategory, productId);
      setCategories(categories.map(c =>
        c._id === selectedCategory
          ? { ...c, products: c.products?.filter(p => p !== productId) }
          : c
      ));
    } catch (err) {
      console.error("Remove product error:", err);
      alert("Xóa sản phẩm khỏi danh mục thất bại!");
    }
  };

  const handleToggleProduct = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) newSet.delete(productId);
    else newSet.add(productId);
    setSelectedProducts(newSet);
  };

  const handleAddProductsToCategory = async () => {
    if (!store || !selectedCategory) return;
    try {
      const productIds = Array.from(selectedProducts);
      if (productIds.length === 0) return;

      await storeApi.addProductsToCategory(store._id, selectedCategory, productIds);

      setCategories(categories.map(c =>
        c._id === selectedCategory
          ? { ...c, products: [...(c.products || []), ...productIds] }
          : c
      ));
      setSelectedProducts(new Set());
      setShowProductModal(false);
    } catch (err) {
      console.error("Add products error:", err);
      alert("Thêm sản phẩm thất bại!");
    }
  };

  // ========================
  // JSX
  // ========================
  return (
    <div className="space-y-6">
      <StoreInfo
        store={store}
        setStore={setStore}
        logoFile={logoFile}
        setLogoFile={setLogoFile}
        bannerFile={bannerFile}
        setBannerFile={setBannerFile}
        handleStoreUpdate={handleStoreUpdate}
      />

      <CategoryList
        categories={categories}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        handleAddCategory={handleAddCategory}
        handleEditCategory={handleEditCategory}
        handleDeleteCategory={handleDeleteCategory}
      />

      {selectedCategory && (
        <CategoryProducts
          selectedCategory={selectedCategory}
          categories={categories}
          products={products}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          showProductModal={showProductModal}
          setShowProductModal={setShowProductModal}
          handleRemoveProductFromCategory={handleRemoveProductFromCategory}
          handleAddProductsToCategory={handleAddProductsToCategory}
          setSelectedCategory={setSelectedCategory}
          handleToggleProduct={handleToggleProduct} // thêm để CategoryProducts dùng checkbox
        />
      )}
    </div>
  );
};

export default ManageStore;
