import React, { useRef, useState } from "react";

interface StoreRegisterFormProps {
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
}

const StoreRegisterForm: React.FC<StoreRegisterFormProps> = ({ onClose, onSuccess }) => {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const payload = {
      ...formData,
      logoUrl: "",   // sau này upload file thì sửa
      bannerUrl: "",
    };

    const res = await fetch("http://localhost:5000/api/users/seller-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      if (onSuccess) await onSuccess(); // ✅ gọi callback để FE load lại profile
      if (onClose) onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg">
      {/* các input ... */}
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Tên cửa hàng"
        required
      />
      {/* ... các field khác */}
      <div className="flex gap-4 mt-4">
        <button
          type="submit"
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded"
        >
          Tạo cửa hàng
        </button>
        <button
          type="button"
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded"
          onClick={onClose}
        >
          Hủy
        </button>
      </div>
    </form>
  );
};

export default StoreRegisterForm;
