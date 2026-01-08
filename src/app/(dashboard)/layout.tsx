import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return ( 
    <div className="bg-background min-h-screen">
      <Sidebar />
      <div className="md:pl-24 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 overflow-auto px-4 pb-12 sm:px-6 lg:px-12">{children}</main>
      </div>
    </div>
  );
};
 
export default DashboardLayout;
