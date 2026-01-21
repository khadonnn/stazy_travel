export interface IAuthorRequest {
  id: string;
  userId: string;
  businessName: string;
  businessType: "INDIVIDUAL" | "COMPANY";
  taxCode?: string;
  phone: string;
  email: string;
  address: string;
  identityCard: string;
  identityImages: string[];
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthorRequestInput {
  businessName: string;
  businessType: "INDIVIDUAL" | "COMPANY";
  taxCode?: string;
  phone: string;
  email: string;
  address: string;
  identityCard: string;
  identityImages: string[];
  reason?: string;
}
