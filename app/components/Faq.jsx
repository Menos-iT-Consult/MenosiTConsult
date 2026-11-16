'use client';

import { useState } from 'react';

/**
 * FAQ accordion — single-open behaviour with the same aria-expanded / .open
 * classes as the vanilla handler in script.js. Pass items as
 * [{ q: 'Question', a: <answer JSX or string> }].
 */
export default function Faq({ items = [] }) {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <>
      {items.map((item, i) => (
        <div key={i} className="faq-item">
          <button
            className="faq-q"
            aria-expanded={openIdx === i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            {item.q}
          </button>
          <div className={`faq-a${openIdx === i ? ' open' : ''}`}>{item.a}</div>
        </div>
      ))}
    </>
  );
}
