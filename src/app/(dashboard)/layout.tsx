import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return ( 
    <div className="bg-muted/40 min-h-screen">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col min-h-screen">
        <Navbar />
        <main className="bg-background flex-1 overflow-auto p-4 sm:p-6 lg:p-8 lg:rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
};
 
export default DashboardLayout;
