import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';
import WhatsAppBubble from '@/app/components/WhatsAppBubble';
import CookieBanner from '@/app/components/CookieBanner';
import Preloader from '@/app/components/Preloader';
import SiteEffects from '@/app/components/SiteEffects';

/** Public site chrome: nav, footer, floating widgets. */
export default function SiteLayout({ children }) {
  return (
    <>
      <Preloader />
      <SiteHeader />
      {children}
      <SiteFooter />
      <WhatsAppBubble />
      <CookieBanner />
      <SiteEffects />
    </>
  );
}
