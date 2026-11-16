import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import BlogGrid from './BlogGrid';

export const metadata = {
  title: {
    absolute: 'Blog & Insights — Menos iT Consult',
  },
  description:
    'Practical IT tips and insights for small businesses in Ghana — from Menos iT Consult.',
};

export default function BlogPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> Blog &amp; Insights
          </Reveal>
          <Reveal as="h1">Blog &amp; Insights</Reveal>
          <Reveal as="p">
            Practical IT advice, industry news, and tips written for small business
            owners in Ghana.
          </Reveal>
        </div>
      </section>

      <BlogGrid />

      <section className="cta-band">
        <div className="container">
          <Reveal className="cta-band-inner">
            <div>
              <h2>Want advice specific to your business?</h2>
              <p>
                Articles only go so far — get in touch and let&apos;s talk about
                your situation.
              </p>
            </div>
            <Link href="/contact" className="btn btn-white">
              Contact us
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
