import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import storeApi from "../../../api/storeApi";
import productApi from "../../../api/productApi";
import StoreInfo from "./StoreInfo";
import CategoryList from "./CategoryList";
import CategoryProducts from "./CategoryProducts";
import { toast } from "react-toastify";
const ManageStore = () => {
    const [store, setStore] = useState(null);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [loading, setLoading] = useState(true);
    const [logoFile, setLogoFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    // ========================
    // Fetch store & products
    // ========================
    const fetchStore = async () => {
        try {
            const res = await storeApi.getMyStore();
            const storeData = res.data.store;
            storeData.categories = storeData.categories || [];
            setStore(storeData);
            setCategories(storeData.categories);
        }
        catch (err) {
            console.error("Fetch store error:", err);
        }
        finally {
            setLoading(false);
        }
    };
    const fetchProducts = async () => {
        if (!store?._id)
            return;
        try {
            const res = await productApi.getMyProducts();
            setProducts(res.data.data || []);
        }
        catch (err) {
            console.error("Fetch products error:", err);
        }
    };
    useEffect(() => { fetchStore(); }, []);
    useEffect(() => { fetchProducts(); }, [store]);
    if (loading) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 animate-fade-in", children: [_jsx("div", { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#4B5563] mb-4" }), _jsx("p", { className: "text-[#4B5563] text-lg font-medium", children: "\u0110ang t\u1EA3i th\u00F4ng tin c\u1EEDa h\u00E0ng..." })] }));
    }
    if (!store) {
        return (_jsx("div", { className: "text-center py-20 animate-fade-in", children: _jsx("div", { className: "bg-white rounded-2xl shadow-lg border border-[#4B5563]/30 p-12 max-w-md mx-auto", children: _jsx("p", { className: "text-[#4B5563] text-lg font-medium", children: "Ch\u01B0a c\u00F3 c\u1EEDa h\u00E0ng." }) }) }));
    }
    // ========================
    // Update store
    // ========================
    const handleStoreUpdate = async () => {
        if (!store)
            return;
        try {
            const formData = new FormData();
            formData.append("name", store.name);
            formData.append("description", store.description);
            if (store.storeAddress)
                formData.append("storeAddress", store.storeAddress);
            formData.append("categories", JSON.stringify(categories));
            if (logoFile)
                formData.append("logo", logoFile);
            if (bannerFile)
                formData.append("banner", bannerFile);
            const res = await storeApi.updateStore(formData);
            setStore(res.data.store);
            setLogoFile(null);
            setBannerFile(null);
            toast.success(res.data.message || "Cập nhật cửa hàng thành công!", {
                containerId: "general-toast",
            });
        }
        catch (err) {
            console.error("Update store error:", err);
            const errorMessage = err?.response?.data?.message || "Cập nhật cửa hàng thất bại!";
            toast.error(errorMessage, {
                containerId: "general-toast",
            });
        }
    };
    // ========================
    // Category handlers
    // ========================
    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !store)
            return;
        try {
            const res = await storeApi.addCategory(store._id, newCategoryName);
            const newCat = res.data.category;
            setCategories([...categories, newCat]);
            setNewCategoryName("");
        }
        catch (err) {
            console.error("Add category error:", err);
            toast.error("Thêm danh mục thất bại!");
        }
    };
    const handleEditCategory = async (id, name) => {
        if (!store)
            return;
        console.log("✏️ [DEBUG] Sửa danh mục", { id, name, storeId: store._id });
        try {
            const res = await storeApi.editCategory(store._id, id, name);
            console.log("✅ [DEBUG] Response editCategory:", res.data);
            setCategories(categories.map(c => (c._id === id ? { ...c, name } : c)));
        }
        catch (err) {
            console.error("❌ [DEBUG] Edit category error:", err);
            toast.error("Sửa danh mục thất bại!");
        }
    };
    const handleDeleteCategory = async (id) => {
        if (!store)
            return;
        try {
            await storeApi.deleteCategory(store._id, id);
            setCategories(categories.filter(c => c._id !== id));
            if (selectedCategory === id)
                setSelectedCategory(null);
        }
        catch (err) {
            console.error("Delete category error:", err);
            toast.error("Xóa danh mục thất bại!");
        }
    };
    // ========================
    // Product handlers
    // ========================
    const handleRemoveProductFromCategory = async (productId) => {
        if (!store || !selectedCategory)
            return;
        try {
            await storeApi.removeProductFromCategory(store._id, selectedCategory, productId);
            setCategories(categories.map(c => c._id === selectedCategory
                ? { ...c, products: c.products?.filter(p => p !== productId) }
                : c));
        }
        catch (err) {
            console.error("Remove product error:", err);
            toast.error("Xóa sản phẩm khỏi danh mục thất bại!");
        }
    };
    const handleToggleProduct = (productId) => {
        const newSet = new Set(selectedProducts);
        if (newSet.has(productId))
            newSet.delete(productId);
        else
            newSet.add(productId);
        setSelectedProducts(newSet);
    };
    const handleAddProductsToCategory = async () => {
        if (!store || !selectedCategory)
            return;
        try {
            const productIds = Array.from(selectedProducts);
            if (productIds.length === 0)
                return;
            await storeApi.addProductsToCategory(store._id, selectedCategory, productIds);
            setCategories(categories.map(c => c._id === selectedCategory
                ? { ...c, products: [...(c.products || []), ...productIds] }
                : c));
            setSelectedProducts(new Set());
            setShowProductModal(false);
        }
        catch (err) {
            console.error("Add products error:", err);
            toast.error("Thêm sản phẩm thất bại!");
        }
    };
    // ========================
    // JSX
    // ========================
    return (_jsxs("div", { className: "space-y-6 lg:space-y-8", children: [_jsx(StoreInfo, { store: store, setStore: setStore, logoFile: logoFile, setLogoFile: setLogoFile, bannerFile: bannerFile, setBannerFile: setBannerFile, handleStoreUpdate: handleStoreUpdate }), _jsx(CategoryList, { categories: categories, newCategoryName: newCategoryName, setNewCategoryName: setNewCategoryName, selectedCategory: selectedCategory, setSelectedCategory: setSelectedCategory, handleAddCategory: handleAddCategory, handleEditCategory: handleEditCategory, handleDeleteCategory: handleDeleteCategory }), selectedCategory && (_jsx(CategoryProducts, { selectedCategory: selectedCategory, categories: categories, products: products, selectedProducts: selectedProducts, setSelectedProducts: setSelectedProducts, showProductModal: showProductModal, setShowProductModal: setShowProductModal, handleRemoveProductFromCategory: handleRemoveProductFromCategory, handleAddProductsToCategory: handleAddProductsToCategory, setSelectedCategory: setSelectedCategory, handleToggleProduct: handleToggleProduct }))] }));
};
export default ManageStore;
