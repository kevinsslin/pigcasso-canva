interface AuthLayoutProps {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return ( 
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-[#FBE9E8] via-white to-[#25D6FF]/25">
      <div className="w-full max-w-[420px]">
        {children}
      </div>
    </div>
  );
};
 
export default AuthLayout;
