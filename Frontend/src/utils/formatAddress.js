export function formatAddress(address) {
    return [address.addressLine, address.wardCode, address.districtCode, address.provinceCode]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join(", ");
}
