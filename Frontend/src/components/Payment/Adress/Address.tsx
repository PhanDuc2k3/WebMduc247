import React, { useState, useEffect } from "react";

interface AddressType {
  _id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault: boolean;
}

const Address = () => {
  const [showForm, setShowForm] = useState(false);
  const [addresses, setAddresses] = useState<AddressType[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null); // 🔹 lưu id đang chỉnh sửa

  const token = localStorage.getItem("token");

  // 📌 Lấy danh sách địa chỉ khi load trang
  useEffect(() => {
    if (!token) {
      console.warn("⚠️ Chưa có token trong localStorage, user chưa đăng nhập!");
      return;
    }

    console.log("👉 Token gửi kèm khi fetch địa chỉ:", token);

    fetch("http://localhost:5000/api/address", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`❌ API Error ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Danh sách địa chỉ từ API:", data);
        setAddresses(data);
      })
      .catch((err) => console.error("❌ Lỗi khi lấy địa chỉ:", err));
  }, [token]);

  // 📌 Submit form → tạo mới hoặc cập nhật
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `http://localhost:5000/api/address/${editingId}`
        : "http://localhost:5000/api/address";

      console.log(`👉 Gửi request ${method} đến:`, url, "Với dữ liệu:", formData);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`❌ API Error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      console.log("✅ Thành công:", data);

      if (editingId) {
        setAddresses(addresses.map((a) => (a._id === editingId ? data : a)));
      } else {
        setAddresses([...addresses, data]);
      }

      // reset
      setFormData({ fullName: "", phone: "", street: "", city: "" });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error("❌ Lỗi khi submit form:", error);
    }
  };

  // 📌 Set mặc định
  const handleSetDefault = async (id: string) => {
    if (!token) {
      console.error("❌ Không có token, không thể set default!");
      return;
    }

    try {
      console.log("👉 Gửi request set mặc định cho ID:", id);

      const res = await fetch(`http://localhost:5000/api/address/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`❌ API Error ${res.status}: ${errorText}`);
      }

      const updated = await res.json();
      console.log("✅ Cập nhật địa chỉ mặc định:", updated);

      // cập nhật lại list
      setAddresses(
        addresses.map((a) =>
          a._id === id ? updated : { ...a, isDefault: false }
        )
      );
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật mặc định:", err);
    }
  };

  // 📌 Edit
  const handleEdit = (addr: AddressType) => {
    console.log("✏️ Chỉnh sửa địa chỉ:", addr);
    setFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
    });
    setEditingId(addr._id);
    setShowForm(true);
  };

  // 📌 Delete
  const handleDelete = async (id: string) => {
    if (!token) return;

    if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này không?")) return;

    try {
      console.log("🗑️ Gửi request DELETE cho ID:", id);

      const res = await fetch(`http://localhost:5000/api/address/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`❌ API Error ${res.status}: ${errorText}`);
      }

      console.log("✅ Đã xóa thành công!");
      setAddresses(addresses.filter((a) => a._id !== id));
    } catch (err) {
      console.error("❌ Lỗi khi xóa:", err);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        Địa chỉ giao hàng
      </h2>

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
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="w-full border rounded-md p-2"
            required
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full border rounded-md p-2"
            required
          />
          <input
            type="text"
            placeholder="Địa chỉ (số nhà, đường)"
            value={formData.street}
            onChange={(e) =>
              setFormData({ ...formData, street: e.target.value })
            }
            className="w-full border rounded-md p-2"
            required
          />
          <input
            type="text"
            placeholder="Thành phố"
            value={formData.city}
            onChange={(e) =>
              setFormData({ ...formData, city: e.target.value })
            }
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

      {addresses.map((addr, index) => (
        <div
          key={addr._id || index}
          className={`p-4 space-y-2 text-sm rounded-md border ${
            addr.isDefault ? "border-blue-500 bg-gray-50" : "border-gray-300"
          }`}
        >
          <p>
            <span className="font-medium">{addr.fullName}</span> | {addr.phone}
          </p>
          <p>
            {addr.street}, {addr.city}
          </p>
          <div className="flex gap-2">
            {!addr.isDefault && (
              <button
                onClick={() => handleSetDefault(addr._id)}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Mặc định
              </button>
            )}
            <button
              onClick={() => handleEdit(addr)}
              className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Sửa
            </button>
            <button
              onClick={() => handleDelete(addr._id)}
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
