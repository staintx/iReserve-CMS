import logo from "../../assets/images/logo.jpg";
import { cn } from "@/lib/utils";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Column - Branding (Hidden on small screens) */}
      <div className="hidden md:flex flex-col justify-between w-full md:w-5/12 lg:w-1/2 bg-ink-900 text-white p-10 lg:p-16 relative overflow-hidden">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 rounded-full bg-white p-1 shadow-lg overflow-hidden shrink-0">
              <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full rounded-full" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">Caezelle's</p>
              <p className="text-sm text-white/90 font-medium">Food, Catering & Services</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-bold font-serif leading-tight">
              {title || "Your next delicious moment starts here."}
            </h2>
            <p className="mt-6 text-lg text-white/70">
              {subtitle || "Handcrafted menus, seamless service, and unforgettable events tailored to your vision."}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-ink-900"></div>
              <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-ink-900"></div>
              <div className="w-8 h-8 rounded-full bg-slate-500 border-2 border-ink-900"></div>
            </div>
            <span className="text-sm font-medium">Join 1,000+ happy clients</span>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex-1 flex flex-col p-6 sm:p-10 justify-center relative bg-card shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)] md:rounded-l-[2rem] z-10 -ml-0 md:-ml-8">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center justify-center gap-3 mb-10">
          <img src={logo} alt="Caezelle's logo" className="w-10 h-10 rounded-full object-cover border border-border shadow-sm" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Caezelle's</p>
            <p className="text-sm font-semibold text-foreground leading-tight">Catering</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>
        
        <div className="text-center text-xs text-muted-foreground mt-8">
          &copy; {new Date().getFullYear()} Caezelle's Food, Catering & Services. All rights reserved.
        </div>
      </div>
    </div>
  );
}
