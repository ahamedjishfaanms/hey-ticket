import { customAlphabet } from "nanoid";
import QRCode from "qrcode";

// Unambiguous alphabet (no 0/O/1/I) so codes are easy to read/type if the
// scanner is unavailable and staff need to key one in manually.
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const nano = customAlphabet(alphabet, 10);

export function generateTicketCode() {
  return `HT-${nano()}`;
}

// The QR payload is just the ticket code. Keeping it short and code-based
// (rather than a full URL) means it still works if the scanner app is
// offline-first, and the /api/checkin route is the single source of truth.
export async function ticketQrDataUrl(ticketCode: string) {
  return QRCode.toDataURL(ticketCode, {
    margin: 1,
    width: 320,
    color: { dark: "#14151A", light: "#00000000" },
  });
}
