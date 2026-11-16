import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import { CountUp } from '@/app/components/Stat';
import PortfolioGrid from './PortfolioGrid';

export const metadata = {
  title: {
    absolute: 'Portfolio — Menos iT Consult',
  },
  description:
    'Case studies and real-world projects by Menos iT Consult — network upgrades, cybersecurity rollouts, cloud migrations, web development, software builds and more across Ghana.',
};

export default function PortfolioPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> Portfolio
          </Reveal>
          <Reveal as="h1">Our Work</Reveal>
          <Reveal as="p">
            Real projects. Real results. A look at some of the challenges we&apos;ve solved for businesses across
            Ghana.
          </Reveal>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="pf-stats">
        <div className="container">
          <div className="pf-stats-inner">
            <Reveal as="div" className="pf-stat">
              <CountUp to={150} className="count" data-to={150} />
              <span>+</span>
              <p>Projects completed</p>
            </Reveal>
            <Reveal as="div" className="pf-stat">
              <CountUp to={12} className="count" data-to={12} />
              <span>+ yrs</span>
              <p>Industry experience</p>
            </Reveal>
            <Reveal as="div" className="pf-stat">
              <CountUp to={8} className="count" data-to={8} />
              <span></span>
              <p>Service areas</p>
            </Reveal>
            <Reveal as="div" className="pf-stat">
              <CountUp to={98} className="count" data-to={98} />
              <span>%</span>
              <p>Client satisfaction</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PROJECT GRID */}
      <section className="section">
        <div className="container">
          <Reveal as="div" className="section-label">Case Studies</Reveal>
          <Reveal as="h2" className="section-title">Projects we&apos;re proud of</Reveal>
          <Reveal as="p" className="section-sub">Filter by service area or browse all projects below.</Reveal>
          <PortfolioGrid />
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="pf-process">
        <div className="container">
          <Reveal as="div" className="section-label">Our Process</Reveal>
          <Reveal as="h2" className="section-title">How every project works</Reveal>
          <Reveal as="p" className="section-sub">
            We follow the same four-step process on every engagement — so you always know what to expect.
          </Reveal>
          <div className="pf-steps">
            <Reveal as="div" className="pf-step">
              <div className="pf-step-num">1</div>
              <h4>Discovery call</h4>
              <p>
                We start with a free 30-minute conversation to understand your business, your current setup, and what
                you&apos;re trying to achieve.
              </p>
            </Reveal>
            <Reveal as="div" className="pf-step">
              <div className="pf-step-num">2</div>
              <h4>Assessment &amp; quote</h4>
              <p>
                We assess your environment — on-site or remotely — then deliver a clear, itemised quote with no hidden
                fees before any work begins.
              </p>
            </Reveal>
            <Reveal as="div" className="pf-step">
              <div className="pf-step-num">3</div>
              <h4>Delivery</h4>
              <p>
                We execute the project to the agreed scope and timeline, keeping you updated at each milestone and
                flagging any changes before acting on them.
              </p>
            </Reveal>
            <Reveal as="div" className="pf-step">
              <div className="pf-step-num">4</div>
              <h4>Handover &amp; support</h4>
              <p>
                Every project ends with a handover session and documentation. Ongoing support retainers are available
                so we stay in your corner after go-live.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <div className="container">
          <Reveal as="div" className="cta-band-inner">
            <div>
              <h2>Have a project in mind?</h2>
              <p>Tell us what you&apos;re working on and we&apos;ll put together a proposal.</p>
            </div>
            <Link href="/contact" className="btn btn-white">
              Start a conversation
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
