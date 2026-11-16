import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import Stat from '@/app/components/Stat';
import TestimonialsGrid from './TestimonialsGrid';

export const metadata = {
  title: {
    absolute: 'Testimonials — Menos iT Consult',
  },
  description:
    "Read what our clients say about Menos iT Consult's IT services — real feedback from real businesses in Ghana.",
};

export default function TestimonialsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> Testimonials
          </Reveal>
          <Reveal as="h1">What Our Clients Say</Reveal>
          <Reveal as="p">Real feedback from real businesses we&apos;ve worked with across Ghana.</Reveal>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="testi-stats-bar">
        <div className="container">
          <Reveal as="div" className="testi-stats">
            <div className="ts">
              <Stat statKey="clients" fallback={150} />
              <span>+</span>
              <p>Happy clients</p>
            </div>
            <div className="ts-div"></div>
            <div className="ts">
              <Stat statKey="satisfaction" fallback={98} />
              <span>%</span>
              <p>Satisfaction rate</p>
            </div>
            <div className="ts-div"></div>
            <div className="ts">
              <strong>5.0</strong>
              <span>/5</span>
              <p>Average rating</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ALL TESTIMONIALS */}
      <section className="section">
        <div className="container">
          <Reveal as="div" className="section-label">Client Feedback</Reveal>
          <Reveal as="h2" className="section-title">Reviews from businesses we&apos;ve served</Reveal>
          <TestimonialsGrid />
        </div>
      </section>

      {/* FEATURED QUOTE */}
      <section className="home-quote">
        <div className="container">
          <Reveal as="blockquote">
            <svg className="quote-mark" viewBox="0 0 40 28" fill="currentColor">
              <path d="M0 28V17.2C0 9.87 4.6 4.27 13.8 0l2.4 3.6C10.87 5.73 8.13 9 7.6 13.6H14V28H0zm22 0V17.2C22 9.87 26.6 4.27 35.8 0l2.4 3.6C32.87 5.73 30.13 9 29.6 13.6H36V28H22z" />
            </svg>
            <p>
              &quot;What sets Menos iT apart is that they actually explain what they&apos;re doing and why. You never
              feel like you&apos;re just handing over a cheque and hoping for the best. They treat you like a
              partner.&quot;
            </p>
            <cite>— Yaa Boateng, CEO, Boateng Medical Centre</cite>
          </Reveal>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <div className="container">
          <Reveal as="div" className="cta-band-inner">
            <div>
              <h2>Ready to become our next success story?</h2>
              <p>Get in touch and let&apos;s talk about what we can do for your business.</p>
            </div>
            <Link href="/contact" className="btn btn-white">
              Contact us today
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
