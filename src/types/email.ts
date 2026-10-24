export enum EmailStatus {
  SCHEDULED = 'SCHEDULED',
  RATE_LIMITED = 'RATE_LIMITED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum ActiveTab {
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
}

export enum WorkspaceView {
  QUEUE = 'QUEUE',
  COMPOSE = 'COMPOSE',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface EmailRecord {
  id: string;
  campaignId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  delaySeconds: number;
  hourlyLimit: number;
  status: EmailStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface ScheduleCampaignPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export interface ScheduleCampaignResponse {
  campaignId: string;
  scheduledCount: number;
  emails: EmailRecord[];
}

export interface ParsedRecipientsResult {
  validEmails: string[];
  invalidEntries: string[];
  duplicateCount: number;
}
