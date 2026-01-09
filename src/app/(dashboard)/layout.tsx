import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { MobileTabBar } from "./mobile-tab-bar";

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return ( 
    <div className="bg-background min-h-[100dvh]">
      <Sidebar />
      <div className="md:pl-24 flex flex-col min-h-[100dvh]">
        <Navbar />
        <main className="flex-1 overflow-auto px-4 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 lg:px-12 md:pb-12">
          {children}
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
};
 
export default DashboardLayout;
