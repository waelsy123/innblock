import Navbar from './components/Navbar';
import Web3Provider from './components/Web3Provider';
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
        <Web3Provider>
          <Navbar />
          <main>{children}</main>
          <Analytics />
        </Web3Provider>
      </body>
    </html>
  );
}
