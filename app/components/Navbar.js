'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navbar.css';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-logo">
            INNBLOCK
          </div>
          <div className="navbar-buttons">
            <Link
              href="/"
              className={`nav-btn ${pathname === '/' ? 'active' : ''}`}
            >
              HOME
            </Link>
            <Link
              href="/chatlog"
              className={`nav-btn ${pathname === '/chatlog' ? 'active' : ''}`}
            >
              CHATLOG
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
