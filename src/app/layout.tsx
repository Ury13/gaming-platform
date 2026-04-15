import type { Metadata, Viewport } from "next";
import "./globals.css";
import HUD from "@/components/HUD";
import BottomNav from "@/components/BottomNav";
import RewardToastStack from "@/components/RewardToastStack";

export const metadata: Metadata = {
  title: "CitySwipe — Play & Build",
  description: "Swipe between games. Earn rewards. Build your city.",
};

// viewport-fit=cover lets content flow under the Dynamic Island / notch;
// our components then add env(safe-area-inset-*) padding to stay clear of it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="overflow-hidden bg-[#09090b] text-white antialiased">
        {/* Fixed top chrome */}
        <HUD />

        {/* Game viewport — sits exactly between HUD and bottom nav.
            44px bar + 2px XP strip + safe-area-inset-top at the top.
            56px tab row + safe-area-inset-bottom at the bottom.
            Inline calc so Tailwind can't strip it. */}
        <main
          className="fixed left-0 right-0 overflow-hidden"
          style={{
            top: "calc(46px + env(safe-area-inset-top, 0px))",
            bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>

        {/* Fixed bottom chrome */}
        <BottomNav />

        {/* Reward toasts — float above everything */}
        <RewardToastStack />
      </body>
    </html>
  );
}
