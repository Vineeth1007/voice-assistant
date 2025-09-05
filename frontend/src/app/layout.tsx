import "./globals.css"; // <-- REQUIRED for Tailwind to load

export const metadata = {
  title: "Project Voice — Classy Edition",
  description: "Speak it. See it come alive.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
