// app/providers.tsx
'use client';
// HeroUI v3 no longer requires HeroUIProvider — styling is fully CSS-based.
export function Providers({children}: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}
