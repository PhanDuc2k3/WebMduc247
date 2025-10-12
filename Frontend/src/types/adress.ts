export interface AddressType {
  _id?: string;             // MongoDB ObjectId
  user: string;             // User ObjectId
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;         // default: 'Vietnam'
  isDefault?: boolean;      // default: false
  createdAt?: string;       // timestamps
  updatedAt?: string;
}
