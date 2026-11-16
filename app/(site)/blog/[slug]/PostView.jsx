'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import NewsletterForm from '@/app/components/NewsletterForm';
import { API, categoryMeta, fmtDate, markdownToHtml } from '@/lib/blog-format';

export default function PostView() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const [post, setPost] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        if (!cancelled) setState('error');
        return;
      }
      try {
        const res = await fetch(`${API}/blogs/slug/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        setPost(data);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (state === 'ready' && post) {
      document.title = `${post.title || 'Article'} — Menos iT Consult`;
    }
  }, [state, post]);

  const meta = post ? categoryMeta(post.category) : null;
  const html = state === 'ready' && post ? markdownToHtml(post.content || '') : '';

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> <Link href="/blog">Blog</Link>{' '}
            <span>/</span> Article
          </Reveal>
          <Reveal as="h1" id="postTitle">
            {state === 'error' ? 'Article not found' : state === 'ready' && post ? post.title || 'Untitled' : 'Loading article…'}
          </Reveal>
          <Reveal as="p" id="postSubtitle">
            {state === 'error'
              ? 'It may have been moved or unpublished.'
              : state === 'ready' && post
                ? [meta.label, post.readTime, fmtDate(post.createdAt)].filter(Boolean).join(' · ')
                : 'Fetching the latest from Menos iT Consult.'}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="blog-article">
            <div
              id="postContentWrap"
              style={state === 'error' ? { display: 'none' } : undefined}
            >
              {post?.image ? (
                <img src={post.image} alt={post.title || ''} className="post-hero-img" />
              ) : null}
              <article
                className="post-content"
                id="postContent"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <div className="post-footer">
                <Link href="/blog" className="btn btn-ghost">← Back to all articles</Link>
                <Link href="/contact" className="btn btn-primary">Get in touch</Link>
              </div>
            </div>

            <div
              className="blog-article--error"
              id="postError"
              style={state === 'error' ? undefined : { display: 'none' }}
            >
              <h2>Article not found</h2>
              <p>That article may have been moved or unpublished. Browse the latest posts instead.</p>
              <Link href="/blog" className="btn btn-primary">Browse the blog</Link>
            </div>
          </div>

          <div className="sidebar-card nl-card">
            <h4>Get the newsletter</h4>
            <p>Practical IT tips delivered to your inbox. No spam — unsubscribe any time.</p>
            <NewsletterForm
              className="sidebar-nl nl-form"
              buttonClassName="btn btn-primary"
              buttonLabel="Subscribe"
            />
          </div>
        </div>
      </section>
    </>
  );
}
