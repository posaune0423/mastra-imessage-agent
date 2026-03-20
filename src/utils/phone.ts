/**
 * 電話番号を統一フォーマットに正規化する
 * "+1 (234) 567-890" → "+1234567890"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}
