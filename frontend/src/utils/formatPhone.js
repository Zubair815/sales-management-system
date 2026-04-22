/**
 * Format a phone number for display.
 * Handles 10-digit Indian numbers → +91 XXXXX XXXXX
 * Passes through anything else unchanged.
 */
export function formatPhone(phone) {
  if (!phone) return '-'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return phone
}
