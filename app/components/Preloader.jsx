'use client';

import { useEffect, useState } from 'react';

/** Page preloader — fades out shortly after load, same as the vanilla one. */
export default function Preloader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`preloader${done ? ' done' : ''}`} id="preloader">
      <div className="pl-logo">
        <img
          className="logo-img"
          src="/assets/logo-black.png"
          alt=""
          style={{ width: 48, height: 48 }}
        />
      </div>
      <div className="pl-bar">
        <div className="pl-fill"></div>
      </div>
    </div>
  );
}
