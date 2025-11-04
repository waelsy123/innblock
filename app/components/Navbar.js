'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navbar.css';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-logo">
            INNBLOCK
          </div>

          <button className="mobile-menu-btn" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div className={`navbar-buttons ${isMenuOpen ? 'mobile-open' : ''}`}>
            <Link
              href="/"
              className={`nav-btn ${pathname === '/' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              HOME
            </Link>
            <Link
              href="/chatlog"
              className={`nav-btn ${pathname === '/chatlog' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              CHATLOG
            </Link>
            <Link
              href="/broadcast"
              className={`nav-btn ${pathname === '/broadcast' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              BROADCAST REEL
            </Link>
            <Link
              href="/send"
              className={`nav-btn ${pathname === '/send' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              SEND MESSAGE
            </Link>
            <Link
              href="/hot-chatters"
              className={`nav-btn ${pathname === '/hot-chatters' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              HOT CHATTERS
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
