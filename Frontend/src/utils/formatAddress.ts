export function formatAddress(address: {
  addressLine: string;
  wardCode: string;
  districtCode?: string | null;
  provinceCode: string;
}) {
  return [address.addressLine, address.wardCode, address.districtCode, address.provinceCode]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(", ");
}
