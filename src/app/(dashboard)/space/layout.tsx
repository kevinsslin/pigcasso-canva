interface SpaceLayoutProps {
  children: React.ReactNode;
}

export default function SpaceLayout({ children }: SpaceLayoutProps) {
  return (
    <div className="-m-4 h-[calc(100vh-68px)] overflow-hidden sm:-m-6 lg:-m-8">
      {children}
    </div>
  );
}

