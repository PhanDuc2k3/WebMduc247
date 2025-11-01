import React, { useState, useEffect } from "react";
import addressApi from "../../../api/addressApi";
import type { AddressType } from "../../../api/addressApi";

interface AddressProps {
  onSelect: (id: string) => void;
}

const Address: React.FC<AddressProps> = ({ onSelect }) => {
  const [showForm, setShowForm] = useState(false);
  const [addresses, setAddresses] = useState<AddressType[]>([]);
  const [formData, setFormData] = useState<Omit<AddressType, "_id" | "user" | "isDefault">>({
    fullName: "",
    phone: "",
    street: "",
    city: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    try {
      const res = await addressApi.getAddresses();
      setAddresses(res.data);

      const defaultAddr = res.data.find(a => a.isDefault);
      if (defaultAddr && defaultAddr._id) {
        setSelectedId(defaultAddr._id);
        onSelect(defaultAddr._id);
      }
    } catch (err) {
      console.error("❌ Lỗi khi lấy địa chỉ:", err);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await addressApi.updateAddress(editingId, formData as AddressType);
        setAddresses(addresses.map(a => (a._id === editingId ? res.data : a)));
      } else {
        const res = await addressApi.createAddress(formData as AddressType);
        setAddresses([...addresses, res.data]);
      }
      setFormData({ fullName: "", phone: "", street: "", city: "" });
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await addressApi.updateAddress(id, { isDefault: true } as AddressType);
      setAddresses(addresses.map(a => (a._id === id ? res.data : { ...a, isDefault: false })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (addr: AddressType) => {
    setFormData({
      fullName: addr.fullName ?? "",
      phone: addr.phone ?? "",
      street: addr.street ?? "",
      city: addr.city ?? "",
    });
    setEditingId(addr._id ?? null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này không?")) return;
    try {
      await addressApi.deleteAddress(id);
      setAddresses(addresses.filter(a => a._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>📍</span> Địa chỉ giao hàng
        </h2>
        <p className="text-gray-600 text-sm mt-1">Chọn địa chỉ nhận hàng</p>
      </div>
      <div className="p-6 space-y-4">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> Thêm địa chỉ mới
          </button>
        )}

        {showForm && (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl border-2 border-blue-200 animate-scale-in">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="👤 Họ tên"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
                required
              />
              <input
                type="text"
                placeholder="📱 Số điện thoại"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
                required
              />
              <input
                type="text"
                placeholder="🏠 Địa chỉ (số nhà, đường)"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
                required
              />
              <input
                type="text"
                placeholder="🌆 Thành phố"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300"
                required
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {editingId ? "💾 Cập nhật" : "💾 Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ fullName: "", phone: "", street: "", city: "" });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {addresses.length === 0 && !showForm ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-gray-200">
            <div className="text-6xl mb-4">📍</div>
            <p className="text-gray-500 text-lg font-medium mb-2">Chưa có địa chỉ nào</p>
            <p className="text-gray-400 text-sm">Vui lòng thêm địa chỉ để nhận hàng</p>
          </div>
        ) : (
          addresses.map((addr, index) => (
            <div
              key={addr._id}
              onClick={() => handleSelect(addr._id!)}
              className={`p-6 space-y-3 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 animate-fade-in-up ${
                selectedId === addr._id 
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg" 
                  : "border-gray-300 hover:border-blue-300 bg-white"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {addr.isDefault && (
                <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  ✓ Mặc định
                </span>
              )}
              <p className="text-lg font-bold text-gray-900">
                <span>👤</span> {addr.fullName} | <span className="text-blue-600">{addr.phone}</span>
              </p>
              <p className="text-gray-700">
                <span>📍</span> {addr.street}, {addr.city}
              </p>
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                {!addr.isDefault && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSetDefault(addr._id!); }}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
                  >
                    ✓ Mặc định
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(addr); }}
                  className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-all duration-300 transform hover:scale-105"
                >
                  ✏️ Sửa
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(addr._id!); }}
                  className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all duration-300 transform hover:scale-105"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Address;
