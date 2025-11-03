export const metadata = {
  title: 'Innblock - Going Decentralized',
  description: 'Blockchain Engineering & Consultancy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
