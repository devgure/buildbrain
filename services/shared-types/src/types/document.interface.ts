export enum DocumentType {
  BLUEPRINT = 'BLUEPRINT',
  CONTRACT = 'CONTRACT',
  SPECIFICATION = 'SPECIFICATION',
  PERMIT = 'PERMIT',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  projectId: string;
  uploadedBy: string;
  extractedText?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentDto {
  name: string;
  type: DocumentType;
  url: string;
  projectId: string;
  uploadedBy: string;
  extractedText?: string;
  metadata?: any;
}

export interface UpdateDocumentDto {
  name?: string;
  extractedText?: string;
  metadata?: any;
}
