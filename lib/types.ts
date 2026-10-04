export type RegistrationStatus = "pending" | "confirmed" | "waitlisted" | "cancelled";

export type CertificateMode = "off" | "participation" | "attendance";

export type CustomFieldType = "text" | "textarea" | "select" | "checkbox";

export interface CustomFieldDef {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  // Only used when type === "select".
  options?: string[];
}

export type CustomFieldResponses = Record<string, string | boolean>;

export interface EventRow {
  id: string;
  organizer_id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  location: string | null;
  is_online: boolean;
  meeting_url: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  capacity: number | null;
  is_published: boolean;
  require_approval: boolean;
  reminder_hours_before: number;
  certificate_mode: CertificateMode;
  signer1_name: string | null;
  signer1_title: string | null;
  signer1_signature_url: string | null;
  signer2_name: string | null;
  signer2_title: string | null;
  signer2_signature_url: string | null;
  gallery_url: string | null;
  thank_you_message: string | null;
  custom_fields: CustomFieldDef[];
  created_at: string;
}

export interface RegistrationRow {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  status: RegistrationStatus;
  ticket_code: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  reminder_sent_at: string | null;
  confirmation_sent_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  thank_you_sent_at: string | null;
  custom_field_responses: CustomFieldResponses;
  created_at: string;
}

export interface AttendanceSummary {
  event_id: string;
  confirmed_count: number;
  waitlisted_count: number;
  checked_in_count: number;
}

export interface EventCollaboratorRow {
  id: string;
  event_id: string;
  email: string;
  invited_by: string;
  created_at: string;
}

// An event row the signed-in user can manage, annotated with whether
// they're the original organizer or were added as a co-host.
export interface ManagedEventRow extends EventRow {
  role: "organizer" | "cohost";
}
