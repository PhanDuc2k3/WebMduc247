import { useEffect, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import addressApi from "../../../api/addressApi";
import type { AddressType } from "../../../api/addressApi";

const emptyAddress = { fullName: "", phone: "", street: "", city: "" };

const Address = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const [addresses, setAddresses] = useState<AddressType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyAddress);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await addressApi.getAddresses();
        setAddresses(response.data);
        const selected = response.data.find((item) => item.isDefault) || response.data[0];
        if (selected?._id) {
          setSelectedId(selected._id);
          onSelect(selected._id);
        }
      } catch {
        setAddresses([]);
      }
    };
    void loadAddresses();
  }, [onSelect]);
  const selected = addresses.find((item) => item._id === selectedId);

  const chooseAddress = (address: AddressType) => {
    if (!address._id) return;
    setSelectedId(address._id);
    onSelect(address._id);
    setExpanded(false);
  };

  const createAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await addressApi.createAddress(formData as AddressType);
    setAddresses((current) => [...current, response.data]);
    if (response.data._id) chooseAddress(response.data);
    setFormData(emptyAddress);
    setShowForm(false);
  };

  return (
    <section className="checkout-card checkout-address">
      <div className="checkout-card-heading"><h2><MapPin /> Địa chỉ nhận hàng</h2>{selected && <button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "Thu gọn" : "Thay đổi"}</button>}</div>
      {selected ? (
        <div className="checkout-address-current">
          <p><strong>{selected.fullName}</strong><span>{selected.phone}</span>{selected.isDefault && <em>Mặc định</em>}</p>
          <address>{selected.street}, {selected.city}</address>
        </div>
      ) : <p className="checkout-empty">Bạn chưa có địa chỉ nhận hàng.</p>}

      {expanded && <div className="checkout-address-list">{addresses.map((address) => <button type="button" className={selectedId === address._id ? "is-selected" : ""} key={address._id} onClick={() => chooseAddress(address)}><strong>{address.fullName}</strong><span>{address.phone}</span><small>{address.street}, {address.city}</small></button>)}</div>}

      {(expanded || !selected) && <button type="button" className="checkout-link-button" onClick={() => setShowForm(true)}><Plus /> Thêm địa chỉ mới</button>}
      {showForm && (
        <form className="checkout-address-form" onSubmit={createAddress}>
          <button type="button" className="checkout-form-close" onClick={() => setShowForm(false)} aria-label="Đóng"><X /></button>
          <input required placeholder="Họ và tên" value={formData.fullName} onChange={(event) => setFormData({ ...formData, fullName: event.target.value })} />
          <input required placeholder="Số điện thoại" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
          <input required placeholder="Số nhà, tên đường" value={formData.street} onChange={(event) => setFormData({ ...formData, street: event.target.value })} />
          <input required placeholder="Tỉnh/Thành phố" value={formData.city} onChange={(event) => setFormData({ ...formData, city: event.target.value })} />
          <button type="submit">Lưu địa chỉ</button>
        </form>
      )}
    </section>
  );
};

export default Address;
