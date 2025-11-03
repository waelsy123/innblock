import Navbar from './components/Navbar';
import { Analytics } from '@vercel/analytics/next';
import './global.css';

export const metadata = {
  title: 'Innblock - Going Decentralized',
  description: 'Blockchain Engineering & Consultancy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
