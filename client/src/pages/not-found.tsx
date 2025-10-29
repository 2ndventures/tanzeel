import { Icon } from "@iconify/react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      {/* Rich layered gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-900/50 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* Content */}
      <div className="relative mx-4 w-full max-w-md">
        {/* Multi-layer glass card */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7)]">
          {/* Gradient border */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-3xl" />
          
          {/* Inner glass panel */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 p-8 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-3xl" />
            
            <div className="relative flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-red-500/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)] shadow-inner ring-1 ring-white/10">
                <Icon icon="solar:shield-warning-bold" className="size-10 text-red-400" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
              </div>
              
              {/* Title */}
              <h1 className="font-heading text-4xl font-black tracking-tighter text-white mb-3" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
                404
              </h1>
              <h2 className="text-xl font-semibold text-white mb-4" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>
                Page Not Found
              </h2>
              
              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed">
                The page you're looking for doesn't exist. Did you forget to add it to the router?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
