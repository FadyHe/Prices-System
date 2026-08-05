import React from "react";

interface HowItWorksCardsProps {
  title: string;
  subTitle: string;
  icon: React.ReactNode;
  iconcolor: string;
}

function HowItWorksCards({ title, subTitle, icon, iconcolor }: HowItWorksCardsProps) {
  const colorValue = {
    purple: "#a855f7",
    blue: "#3b82f6",
    green: "#22c55e",
  }[iconcolor] || "#a855f7";

  return (
    <div 
      className="how-it-works-card group glass glass-hover relative overflow-hidden p-8 flex flex-col gap-4 h-full w-full max-w-[360px] mx-auto md:mx-0 transition-all duration-300 "
      style={{ "--card-color": colorValue } as React.CSSProperties}
    >
      {/* Decorative Background Icon */}
      <div className="absolute top-7 left-9 opacity-5 scale-[2.5] pointer-events-none rotate-12 transition-colors"
           style={{ color: "var(--card-color)" }}>
        {icon}
      </div>

      <div className="how-it-works-icon-wrapper w-14 h-14 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300"
           style={{
             color: "var(--card-color)",
             backgroundColor: `color-mix(in srgb, var(--card-color) 12%, transparent)`,
             borderColor: `color-mix(in srgb, var(--card-color) 28%, transparent)`,
             boxShadow: `0 8px 20px -10px color-mix(in srgb, var(--card-color) 45%, transparent)`
           }}>
        <div className="w-6 h-6">
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-right z-10 transition-transform duration-300">
        <h3 className="text-xl font-bold text-primary leading-tight">{title}</h3>
        <p className="text-sm text-secondary leading-relaxed font-medium">{subTitle}</p>
      </div>
    </div>
  );
}

export default HowItWorksCards;