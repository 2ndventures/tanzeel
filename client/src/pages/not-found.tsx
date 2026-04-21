import { Icon } from "@iconify/react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background flex items-center justify-center">
      {/* Rich layered gradients for depth - adapts to theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.12)] via-background/50 to-background/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[hsl(var(--glow-primary)/0.15)] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[hsl(var(--glow-secondary)/0.10)] via-transparent to-transparent" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />

      {/* Content */}
      <div className="relative mx-4 w-full max-w-md">
        {/* Multi-layer glass card */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-2xl">
          {/* Gradient border */}
          <div className="absolute inset-0 bg-gradient-to-br from-border via-border/50 to-border rounded-3xl" />
          
          {/* Inner glass panel */}
          <div className="relative overflow-hidden rounded-3xl bg-card/80 p-8 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.08)] via-transparent to-[hsl(var(--glow-accent)/0.06)] rounded-3xl" />
            
            <div className="relative flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-red-500/20 shadow-md shadow-inner ring-1 ring-border">
                <Icon icon="solar:shield-warning-bold" className="size-10 text-red-400" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
              </div>
              
              {/* Title */}
              <h1 className="font-heading text-4xl font-black tracking-tighter text-foreground mb-3" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
                404
              </h1>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Page Not Found
              </h2>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                The page you're looking for doesn't exist. Did you forget to add it to the router?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
