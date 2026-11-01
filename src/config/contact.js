export const WHATSAPP_SELLER_NUMBER = '6281272883252'

export function getWhatsAppContactUrl(message) {
  const phone = WHATSAPP_SELLER_NUMBER.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function getProductInquiryMessage(gun) {
  const type = gun.type || gun.category
  const caliber = gun.caliber || gun.difficulty
  const details = [type, caliber].filter(Boolean).join(' · ')
  return `Halo, saya tertarik dengan ${gun.name}${details ? ` (${details})` : ''}. Apakah produk ini masih tersedia?`
}
