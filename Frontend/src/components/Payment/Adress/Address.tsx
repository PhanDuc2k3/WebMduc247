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
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Địa chỉ giao hàng</h2>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-blue-600 text-sm hover:underline"
        >
          + Thêm địa chỉ
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <input
            type="text"
            placeholder="Họ tên"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full border rounded-md p-2"
            required
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border rounded-md p-2"
            required
          />
          <input
            type="text"
            placeholder="Địa chỉ (số nhà, đường)"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            className="w-full border rounded-md p-2"
            required
          />
          <input
            type="text"
            placeholder="Thành phố"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full border rounded-md p-2"
            required
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingId ? "Cập nhật" : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ fullName: "", phone: "", street: "", city: "" });
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {addresses.map((addr) => (
        <div
          key={addr._id}
          onClick={() => handleSelect(addr._id!)}
          className={`p-4 space-y-2 text-sm rounded-md border cursor-pointer ${
            selectedId === addr._id ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
        >
          <p>
            <span className="font-medium">{addr.fullName}</span> | {addr.phone}
          </p>
          <p>{addr.street}, {addr.city}</p>
          <div className="flex gap-2">
            {!addr.isDefault && (
              <button
                onClick={(e) => { e.stopPropagation(); handleSetDefault(addr._id!); }}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Mặc định
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(addr); }}
              className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Sửa
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(addr._id!); }}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Address;
