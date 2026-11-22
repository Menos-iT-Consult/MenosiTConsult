'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AcademyPortalLink({
  className,
  signedOutLabel = 'Student login',
  signedInLabel = 'Portal',
}) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/academy/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (active) setLoggedIn(result.loggedIn === true);
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <Link className={className} href={loggedIn ? '/academy/dashboard' : '/academy/login'}>
      {loggedIn ? signedInLabel : signedOutLabel}
    </Link>
  );
}
