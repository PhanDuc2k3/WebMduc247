import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import addressApi from "../../../api/addressApi";
const emptyAddress = { fullName: "", phone: "", street: "", city: "" };
const Address = ({ onSelect }) => {
    const [addresses, setAddresses] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
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
            }
            catch {
                setAddresses([]);
            }
        };
        void loadAddresses();
    }, [onSelect]);
    const selected = addresses.find((item) => item._id === selectedId);
    const chooseAddress = (address) => {
        if (!address._id)
            return;
        setSelectedId(address._id);
        onSelect(address._id);
        setExpanded(false);
    };
    const createAddress = async (event) => {
        event.preventDefault();
        const response = await addressApi.createAddress(formData);
        setAddresses((current) => [...current, response.data]);
        if (response.data._id)
            chooseAddress(response.data);
        setFormData(emptyAddress);
        setShowForm(false);
    };
    return (_jsxs("section", { className: "checkout-card checkout-address", children: [_jsxs("div", { className: "checkout-card-heading", children: [_jsxs("h2", { children: [_jsx(MapPin, {}), " \u0110\u1ECBa ch\u1EC9 nh\u1EADn h\u00E0ng"] }), selected && _jsx("button", { type: "button", onClick: () => setExpanded((value) => !value), children: expanded ? "Thu gọn" : "Thay đổi" })] }), selected ? (_jsxs("div", { className: "checkout-address-current", children: [_jsxs("p", { children: [_jsx("strong", { children: selected.fullName }), _jsx("span", { children: selected.phone }), selected.isDefault && _jsx("em", { children: "M\u1EB7c \u0111\u1ECBnh" })] }), _jsxs("address", { children: [selected.street, ", ", selected.city] })] })) : _jsx("p", { className: "checkout-empty", children: "B\u1EA1n ch\u01B0a c\u00F3 \u0111\u1ECBa ch\u1EC9 nh\u1EADn h\u00E0ng." }), expanded && _jsx("div", { className: "checkout-address-list", children: addresses.map((address) => _jsxs("button", { type: "button", className: selectedId === address._id ? "is-selected" : "", onClick: () => chooseAddress(address), children: [_jsx("strong", { children: address.fullName }), _jsx("span", { children: address.phone }), _jsxs("small", { children: [address.street, ", ", address.city] })] }, address._id)) }), (expanded || !selected) && _jsxs("button", { type: "button", className: "checkout-link-button", onClick: () => setShowForm(true), children: [_jsx(Plus, {}), " Th\u00EAm \u0111\u1ECBa ch\u1EC9 m\u1EDBi"] }), showForm && (_jsxs("form", { className: "checkout-address-form", onSubmit: createAddress, children: [_jsx("button", { type: "button", className: "checkout-form-close", onClick: () => setShowForm(false), "aria-label": "\u0110\u00F3ng", children: _jsx(X, {}) }), _jsx("input", { required: true, placeholder: "H\u1ECD v\u00E0 t\u00EAn", value: formData.fullName, onChange: (event) => setFormData({ ...formData, fullName: event.target.value }) }), _jsx("input", { required: true, placeholder: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i", value: formData.phone, onChange: (event) => setFormData({ ...formData, phone: event.target.value }) }), _jsx("input", { required: true, placeholder: "S\u1ED1 nh\u00E0, t\u00EAn \u0111\u01B0\u1EDDng", value: formData.street, onChange: (event) => setFormData({ ...formData, street: event.target.value }) }), _jsx("input", { required: true, placeholder: "T\u1EC9nh/Th\u00E0nh ph\u1ED1", value: formData.city, onChange: (event) => setFormData({ ...formData, city: event.target.value }) }), _jsx("button", { type: "submit", children: "L\u01B0u \u0111\u1ECBa ch\u1EC9" })] }))] }));
};
export default Address;
