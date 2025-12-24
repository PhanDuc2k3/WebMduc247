import React, { useState, useEffect } from "react";
import { MapPin, Plus, User, Phone, Home, Building2, Save, Check, Edit, Trash2 } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; addressId: string | null }>({ open: false, addressId: null });

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

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ open: true, addressId: id });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.addressId) return;
    const id = deleteConfirm.addressId;
    setDeleteConfirm({ open: false, addressId: null });
    try {
      await addressApi.deleteAddress(id);
      setAddresses(addresses.filter(a => a._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
          Địa chỉ giao hàng
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Chọn địa chỉ nhận hàng</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2F5FEB] text-white rounded-lg sm:rounded-xl font-bold hover:bg-[#244ACC] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Thêm địa chỉ mới
          </button>
        )}

        {showForm && (
          <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-[#2F5FEB]/40 animate-scale-in">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Họ tên"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none transition-all duration-300"
                  required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Số điện thoại"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none transition-all duration-300"
                  required
                />
              </div>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Địa chỉ (số nhà, đường)"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none transition-all duration-300"
                  required
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Thành phố"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] outline-none transition-all duration-300"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2F5FEB] text-white rounded-lg sm:rounded-xl font-bold hover:bg-[#244ACC] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  {editingId ? "Cập nhật" : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ fullName: "", phone: "", street: "", city: "" });
                  }}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-800 rounded-lg sm:rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 text-sm sm:text-base"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {addresses.length === 0 && !showForm ? (
          <div className="text-center py-8 sm:py-12 bg-[#2F5FEB]/5 rounded-xl sm:rounded-2xl border-2 border-gray-200">
            <MapPin className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 text-gray-400" />
            <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">Chưa có địa chỉ nào</p>
            <p className="text-gray-400 text-xs sm:text-sm">Vui lòng thêm địa chỉ để nhận hàng</p>
          </div>
        ) : (
          addresses.map((addr, index) => (
            <div
              key={addr._id}
              onClick={() => handleSelect(addr._id!)}
              className={`p-4 sm:p-6 space-y-2 sm:space-y-3 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 animate-fade-in-up ${
                selectedId === addr._id 
                  ? "border-[#2F5FEB] bg-[#2F5FEB]/5 shadow-lg" 
                  : "border-gray-300 hover:border-[#2F5FEB]/60 bg-white"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {addr.isDefault && (
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  <Check className="w-3 h-3" />
                  Mặc định
                </span>
              )}
              <p className="text-base sm:text-lg font-bold text-gray-900 break-words flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <span>{addr.fullName} | <span className="text-blue-600">{addr.phone}</span></span>
              </p>
              <p className="text-sm sm:text-base text-gray-700 break-words flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <span>{addr.street}, {addr.city}</span>
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                {!addr.isDefault && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSetDefault(addr._id!); }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    Mặc định
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(addr); }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-500 text-white text-xs sm:text-sm rounded-lg hover:bg-yellow-600 transition-all duration-300 transform hover:scale-105 flex items-center gap-1"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  Sửa
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(addr._id!); }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-all duration-300 transform hover:scale-105 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, addressId: null })}
        onConfirm={handleDelete}
        title="Xác nhận xóa địa chỉ"
        message="Bạn có chắc muốn xóa địa chỉ này không?"
        type="danger"
        confirmText="Xóa"
      />
    </div>
  );
};

export default Address;
