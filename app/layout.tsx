export const metadata = {
  title: "Candour ERP",
  description: "The light, all-in-one platform that runs an entrepreneur's business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f8fa", color: "#1f2933" }}>
        {children}
      </body>
    </html>
  );
}
