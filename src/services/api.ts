import {
  EmailRecord,
  EmailStatus,
  ScheduleCampaignPayload,
  ScheduleCampaignResponse,
  UserProfile,
} from '../types/email';
import { computeDispatchSchedule } from '../utils/emailParser';

/**
 * ============================================================================
 * BACKEND API CONFIGURATION & INTEGRATION POINTS
 * ============================================================================
 * Point VITE_API_BASE_URL to your Express + BullMQ + Redis backend server
 * (for example: http://localhost:3000/api) and set VITE_USE_MOCK_API="false"
 * in your .env file once backend endpoints are running.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const IS_MOCK_MODE =
  import.meta.env.VITE_USE_MOCK_API !== 'false';
  console.log('API CHECK:', API_BASE_URL, 'MOCK MODE:', IS_MOCK_MODE);

export const AUTH_ENDPOINTS = {
  googleLogin: `${API_BASE_URL}/auth/google`,
  currentUser: `${API_BASE_URL}/auth/me`,
  logout: `${API_BASE_URL}/auth/logout`,
};

export const EMAIL_ENDPOINTS = {
  scheduled: `${API_BASE_URL}/emails/scheduled`,
  sent: `${API_BASE_URL}/emails/sent`,
  schedule: `${API_BASE_URL}/emails/schedule`,
  cancelScheduled: (id: string) => `${API_BASE_URL}/emails/scheduled/${encodeURIComponent(id)}`,
};

const STORAGE_KEYS = {
  USER: 'reachinbox_mock_user_v1',
  EMAILS: 'reachinbox_mock_emails_v1',
  AUTH_TOKEN: 'reachinbox_auth_token',
};

const MOCK_USER: UserProfile = {
  id: 'usr_preview_01',
  name: 'Aarav Kulkarni',
  email: 'aarav.kulkarni@reachinbox-preview.dev',
  avatarUrl: '',
};

function createInitialMockEmails(): EmailRecord[] {
  const now = Date.now();
  const min = 60_000;
  const hr = 3_600_000;

  return [
    {
      id: 'eml_sched_101',
      campaignId: 'cmp_q4_saas',
      senderEmail: MOCK_USER.email,
      recipient: 'elena.rostova@northstarcloud.io',
      subject: 'Automating outbound follow-ups for Northstar Cloud',
      body: 'Hi Elena,\n\nNoticed Northstar Cloud recently expanded your SDR team in Austin. We built a lightweight outbound scheduler with per-mailbox hourly throttling to protect sender reputation.\n\nWould Thursday afternoon work for a 15-minute walkthrough?\n\nBest,\nAarav',
      scheduledAt: new Date(now + 18 * min).toISOString(),
      delaySeconds: 45,
      hourlyLimit: 60,
      status: EmailStatus.SCHEDULED,
      createdAt: new Date(now - 25 * min).toISOString(),
    },
    {
      id: 'eml_sched_102',
      campaignId: 'cmp_q4_saas',
      senderEmail: MOCK_USER.email,
      recipient: 'marcus.chen@veridianlabs.ai',
      subject: 'Automating outbound follow-ups for Veridian Labs',
      body: 'Hi Marcus,\n\nSaw your recent engineering post on scaling customer onboarding at Veridian Labs. Wanted to share how our queue architecture handles paced cold outreach without hitting provider rate limits.\n\nOpen to a quick chat this week?\n\nBest,\nAarav',
      scheduledAt: new Date(now + 19 * min).toISOString(),
      delaySeconds: 45,
      hourlyLimit: 60,
      status: EmailStatus.SCHEDULED,
      createdAt: new Date(now - 25 * min).toISOString(),
    },
    {
      id: 'eml_sched_103',
      campaignId: 'cmp_q4_saas',
      senderEmail: MOCK_USER.email,
      recipient: 'priya.nair@latticepay.com',
      subject: 'Outbound deliverability workflow for LatticePay',
      body: 'Hi Priya,\n\nReaching out as LatticePay scales enterprise partnerships. Our scheduling engine spaces each send with configurable delays and strict hourly caps.\n\nLet me know if sharing a short benchmark would be helpful.\n\nBest,\nAarav',
      scheduledAt: new Date(now + 1 * hr + 18 * min).toISOString(),
      delaySeconds: 45,
      hourlyLimit: 2,
      status: EmailStatus.RATE_LIMITED,
      createdAt: new Date(now - 25 * min).toISOString(),
    },
    {
      id: 'eml_sent_201',
      campaignId: 'cmp_seed_founders',
      senderEmail: MOCK_USER.email,
      recipient: 'david.miller@kinetixops.com',
      subject: 'Partnership inquiry: KinetixOps x ReachInbox',
      body: 'Hi David,\n\nFollowing up on our earlier note regarding automated campaign pacing for KinetixOps. Happy to send over technical documentation whenever convenient.\n\nBest,\nAarav',
      scheduledAt: new Date(now - 3 * hr).toISOString(),
      sentAt: new Date(now - 3 * hr + 2_000).toISOString(),
      delaySeconds: 30,
      hourlyLimit: 100,
      status: EmailStatus.SENT,
      createdAt: new Date(now - 4 * hr).toISOString(),
    },
    {
      id: 'eml_sent_202',
      campaignId: 'cmp_seed_founders',
      senderEmail: MOCK_USER.email,
      recipient: 'sophie.laurent@atelierdata.fr',
      subject: 'Partnership inquiry: Atelier Data x ReachInbox',
      body: 'Hi Sophie,\n\nQuick note to introduce our rate-limited email dispatch pipeline built on BullMQ and Ethereal SMTP testing.\n\nBest regards,\nAarav',
      scheduledAt: new Date(now - 2 * hr - 59 * min).toISOString(),
      sentAt: new Date(now - 2 * hr - 59 * min + 1_500).toISOString(),
      delaySeconds: 30,
      hourlyLimit: 100,
      status: EmailStatus.SENT,
      createdAt: new Date(now - 4 * hr).toISOString(),
    },
    {
      id: 'eml_sent_203',
      campaignId: 'cmp_seed_founders',
      senderEmail: MOCK_USER.email,
      recipient: 'bounce-test@invalid-mx-domain.example',
      subject: 'Partnership inquiry: Sandbox Verification',
      body: 'Hi team,\n\nTesting SMTP bounce and retry reporting in the Sent Emails ledger.\n\nBest,\nAarav',
      scheduledAt: new Date(now - 2 * hr - 58 * min).toISOString(),
      sentAt: new Date(now - 2 * hr - 58 * min + 4_000).toISOString(),
      delaySeconds: 30,
      hourlyLimit: 100,
      status: EmailStatus.FAILED,
      errorMessage: 'SMTP 550 5.1.1: Recipient mailbox unavailable',
      createdAt: new Date(now - 4 * hr).toISOString(),
    },
  ];
}

function readMockEmailsFromStorage(): EmailRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMAILS);
    if (!raw) {
      const seeded = createInitialMockEmails();
      localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as EmailRecord[];
  } catch {
    return createInitialMockEmails();
  }
}

function writeMockEmailsToStorage(emails: EmailRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(emails));
  } catch {
    // Ignore storage quota issues in restricted browsing contexts
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) errorDetail = body.message;
      else if (body?.error) errorDetail = body.error;
    } catch {
      // Fallback to status message if response is not JSON
    }
    throw new Error(errorDetail);
  }
  return response.json() as Promise<T>;
}

/**
 * ============================================================================
 * AUTHENTICATION API METHODS
 * ============================================================================
 */

/**
 * Captures a JWT token returned via query string after backend Google OAuth callback
 * (e.g., http://localhost:5173/?token=eyJ...) if your backend uses token redirect.
 */
export function captureOAuthTokenFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    params.delete('token');
    const cleanSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

/**
 * Initiates Google OAuth login.
 * - Real Backend Mode: Redirects browser to GET /api/auth/google.
 * - Mock Preview Mode: Stores clearly labeled preview user session locally.
 */
export async function initiateGoogleOAuth(): Promise<UserProfile | null> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT: Redirect to backend Google OAuth route
    window.location.assign(AUTH_ENDPOINTS.googleLogin);
    return null;
  }

  await delay(450);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(MOCK_USER));
  return MOCK_USER;
}

/**
 * Checks active user session on application load.
 * - Real Backend Mode: Calls GET /api/auth/me (supports both HTTP-only cookies and Bearer JWT).
 * - Mock Preview Mode: Reads local preview session.
 */
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT: Verify authenticated user session
    const response = await fetch(AUTH_ENDPOINTS.currentUser, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      return null;
    }
    return handleApiResponse<UserProfile>(response);
  }

  await delay(250);
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Logs out the current user.
 * - Real Backend Mode: Calls POST /api/auth/logout and clears local token.
 * - Mock Preview Mode: Clears preview user session.
 */
export async function logoutCurrentUser(): Promise<void> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT: Invalidate server session / cookie
    await fetch(AUTH_ENDPOINTS.logout, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    return;
  }

  await delay(250);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * ============================================================================
 * EMAIL SCHEDULING & QUEUE API METHODS
 * ============================================================================
 */

/**
 * Fetches all currently scheduled / queued emails for the authenticated user.
 * - Real Backend Mode: GET /api/emails/scheduled
 */
export async function fetchScheduledEmails(): Promise<EmailRecord[]> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT
    const response = await fetch(EMAIL_ENDPOINTS.scheduled, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleApiResponse<EmailRecord[]>(response);
  }

  await delay(350);
  const all = readMockEmailsFromStorage();
  return all
    .filter(
      (item) =>
        item.status === EmailStatus.SCHEDULED || item.status === EmailStatus.RATE_LIMITED
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

/**
 * Fetches all sent / failed emails for the authenticated user.
 * - Real Backend Mode: GET /api/emails/sent
 */
export async function fetchSentEmails(): Promise<EmailRecord[]> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT
    const response = await fetch(EMAIL_ENDPOINTS.sent, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleApiResponse<EmailRecord[]>(response);
  }

  await delay(350);
  const all = readMockEmailsFromStorage();
  return all
    .filter((item) => item.status === EmailStatus.SENT || item.status === EmailStatus.FAILED)
    .sort(
      (a, b) =>
        new Date(b.sentAt || b.scheduledAt).getTime() -
        new Date(a.sentAt || a.scheduledAt).getTime()
    );
}

/**
 * Schedules a new batch of emails with start time, per-email delay, and hourly rate cap.
 * - Real Backend Mode: POST /api/emails/schedule
 */
export async function scheduleEmailBatch(
  payload: ScheduleCampaignPayload
): Promise<ScheduleCampaignResponse> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT: Enqueue jobs in BullMQ + persist in DB
    const response = await fetch(EMAIL_ENDPOINTS.schedule, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleApiResponse<ScheduleCampaignResponse>(response);
  }

  await delay(650);
  const dispatchDates = computeDispatchSchedule(
    payload.recipients.length,
    payload.startTime,
    payload.delaySeconds,
    payload.hourlyLimit
  );

  const campaignId = `cmp_${Date.now().toString(36)}`;
  const createdAt = new Date().toISOString();
  const baseStartMs = new Date(payload.startTime).getTime();

  const newRecords: EmailRecord[] = payload.recipients.map((recipient, idx) => {
    const scheduledDate = dispatchDates[idx];
    const unthrottledMs = baseStartMs + idx * payload.delaySeconds * 1000;
    const wasDeferredByHourlyCap = scheduledDate.getTime() - unthrottledMs >= 60_000;

    return {
      id: `eml_${Date.now().toString(36)}_${idx}`,
      campaignId,
      senderEmail: MOCK_USER.email,
      recipient,
      subject: payload.subject.trim(),
      body: payload.body,
      scheduledAt: scheduledDate.toISOString(),
      delaySeconds: payload.delaySeconds,
      hourlyLimit: payload.hourlyLimit,
      status: wasDeferredByHourlyCap
        ? EmailStatus.RATE_LIMITED
        : EmailStatus.SCHEDULED,
      createdAt,
    };
  });

  const existing = readMockEmailsFromStorage();
  writeMockEmailsToStorage([...newRecords, ...existing]);

  return {
    campaignId,
    scheduledCount: newRecords.length,
    emails: newRecords,
  };
}

/**
 * Cancels a scheduled email job prior to dispatch.
 * - Real Backend Mode: DELETE /api/emails/scheduled/:id
 */
export async function cancelScheduledEmail(emailId: string): Promise<void> {
  if (!IS_MOCK_MODE) {
    // REAL BACKEND INTEGRATION POINT: Remove delayed BullMQ job + update DB status
    const response = await fetch(EMAIL_ENDPOINTS.cancelScheduled(emailId), {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Unable to cancel scheduled email (${response.status})`);
    }
    return;
  }

  await delay(250);
  const existing = readMockEmailsFromStorage();
  writeMockEmailsToStorage(existing.filter((item) => item.id !== emailId));
}

/**
 * Utility for mock preview mode only: resets or clears mock records so empty states
 * and populated states can both be verified cleanly.
 */
export async function setMockQueuePreset(mode: 'empty' | 'sample'): Promise<void> {
  if (!IS_MOCK_MODE) return;
  await delay(200);
  if (mode === 'empty') {
    writeMockEmailsToStorage([]);
  } else {
    writeMockEmailsToStorage(createInitialMockEmails());
  }
}
