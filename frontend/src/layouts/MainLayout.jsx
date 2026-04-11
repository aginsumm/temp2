import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import NetworkNotificationProvider from "../components/common/NetworkNotification";
import NetworkStatusManager from "../components/common/NetworkStatusManager";

export default function MainLayout() {
  return (
    <NetworkNotificationProvider>
      <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--gradient-background)' }}>
        <NetworkStatusManager mode="compact" position="top-bar" showQueue />
        <Header />
        <main className="pt-16 min-h-screen">
          <Outlet />
        </main>
      </div>
    </NetworkNotificationProvider>
  );
}
