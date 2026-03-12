export enum BidStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  AWARDED = 'AWARDED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface Bid {
  id: string;
  projectId: string;
  companyId: string;
  userId: string;
  amount: number;
  description?: string;
  status: BidStatus;
  aiScore?: number;
  submittedAt: Date;
  awardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBidDto {
  projectId: string;
  companyId: string;
  userId: string;
  amount: number;
  description?: string;
}

export interface UpdateBidDto {
  amount?: number;
  description?: string;
  status?: BidStatus;
  aiScore?: number;
  awardedAt?: Date;
}
