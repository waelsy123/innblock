import Navbar from './components/Navbar';
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
      </body>
    </html>
  );
}
