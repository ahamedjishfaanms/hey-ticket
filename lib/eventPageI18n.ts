// UI strings for the public event page, kept in one place so wording
// is easy to change.

export type Lang = "en";

const en = {
  inPerson: "In person",
  online: "Online event",
  onlineVia: "Online",
  free: "Free",
  getTicket: "Get ticket",
  requestToJoin: "Request to join",
  joinWaitlist: "Join waitlist",
  soldOut: "Sold out",
  eventEnded: "This event has ended",
  seePhotos: "See photos",
  spotsLeft: (n: number) => (n === 1 ? "1 spot left" : `${n} spots left`),
  going: (n: number) => (n === 1 ? "1 person going" : `${n} people going`),
  goingNames: (names: string[], others: number) =>
    others > 0
      ? `${names.join(", ")} and ${others} other${others === 1 ? "" : "s"} are going`
      : names.length === 1
      ? `${names[0]} is going`
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are going`,
  beFirst: "Be the first to register",
  yourTime: "your time",
  eventTime: "Event time",
  openInMaps: "Open in Google Maps",
  getDirections: "Get directions",
  about: "About this event",
  readMore: "Read more",
  showLess: "Show less",
  agenda: "Agenda",
  speakers: "Speakers & hosts",
  location: "Location",
  directions: "Directions & parking",
  hostedBy: "Hosted by",
  contactOrganizer: "Contact organizer",
  pastEvents: "Past events by this host",
  faq: "FAQ",
  reportEvent: "Report this event",
  approvalNote: "The host reviews every request before sending a ticket.",
  reserveSpot: "Reserve your spot",
  fullName: "Full name",
  email: "Email",
  submitting: "Submitting…",
  required: "is required",
  noAccount: "No account needed.",
  youreIn: "You're in!",
  waitlisted: "You're on the waitlist",
  requestSent: "Request sent",
  checkEmail: (e: string) => `We've also emailed your ticket to ${e}.`,
  checkEmailPending: (e: string) =>
    `The host needs to approve your request — check ${e} once they do.`,
  showAtDoor: "Show this QR code at the door",
  viewTicket: "Open full ticket",
  addToCalendar: "Add to calendar",
  share: "Share",
  shareWithFriends: "Invite friends",
  copyLink: "Copy link",
  copied: "Copied!",
  startsIn: "Starts",
  happeningNow: "Happening now",
  send: "Send",
  sending: "Sending…",
  yourMessage: "Your message",
  messageSent: "Message sent — the organizer will reply by email.",
  reportReason: "Why are you reporting this event?",
  reportDetails: "Anything else we should know? (optional)",
  yourEmailOptional: "Your email (optional)",
  reportThanks: "Thanks — our team will review this event.",
  cancel: "Cancel",
  previewBanner: "Admin preview — this event is not visible to the public.",
  attendees: "Attendees",
};

export type Dict = typeof en;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDict(_lang: Lang = "en"): Dict {
  return en;
}
