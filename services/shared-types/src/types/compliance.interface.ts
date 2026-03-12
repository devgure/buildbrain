export enum ComplianceType {
  INSURANCE = 'INSURANCE',
  LICENSE = 'LICENSE',
  CERTIFICATION = 'CERTIFICATION',
  BONDING = 'BONDING',
}

export enum ComplianceStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export interface ComplianceRecord {
  id: string;
  userId: string;
  type: ComplianceType;
  documentUrl: string;
  expiryDate: Date;
  status: ComplianceStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  aiValidation?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceRecordDto {
  userId: string;
  type: ComplianceType;
  documentUrl: string;
  expiryDate: Date;
}

export interface UpdateComplianceRecordDto {
  status?: ComplianceStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  aiValidation?: any;
}
