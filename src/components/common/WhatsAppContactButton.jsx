import { MessageCircle } from 'lucide-react'
import { getProductInquiryMessage, getWhatsAppContactUrl } from '../../config/contact'

export default function WhatsAppContactButton({ gun, className = 'btn btn--whatsapp' }) {
  const url = getWhatsAppContactUrl(getProductInquiryMessage(gun))

  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Hubungi penjual tentang ${gun.name} melalui WhatsApp`}
      onClick={(event) => event.stopPropagation()}
    >
      <MessageCircle size={17} />
      <span>Hubungi Penjual</span>
    </a>
  )
}
