import WhatsAppContactButton from '../components/common/WhatsAppContactButton'
import { WHATSAPP_SELLER_NUMBER, getWhatsAppContactUrl } from '../config/contact'

function Contact() {
  const contactUrl = getWhatsAppContactUrl('Halo, saya ingin menghubungi Bore & Barrel.')

  return (
    <div className="page">
      <h1 className="display">Come by the shop.</h1>
      <p className="lede">
        123 Range Road. Open Tuesday to Saturday, 10 to 6.
      </p>
      <p className="lede">
        WhatsApp: <a href={contactUrl} target="_blank" rel="noopener noreferrer">+{WHATSAPP_SELLER_NUMBER}</a>
      </p>
      <WhatsAppContactButton
        gun={{ name: 'Bore & Barrel' }}
        className="btn btn--whatsapp"
      />
    </div>
  )
}

export default Contact
