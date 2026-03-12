import { PaymentStatus } from '@buildbrainos/shared-types';

export class Payment {
  id: string;
  projectId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  description: string;
  status: PaymentStatus;
  stripeId?: string;
  aiVerified: boolean;
  verifiedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
