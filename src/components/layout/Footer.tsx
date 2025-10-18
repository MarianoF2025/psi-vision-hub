export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#e8e8ef] bg-white/70 dark:bg-[#0f1115]">
      <div className="container-psi py-6 text-[12px] text-[#6b7280] flex items-center justify-between">
        <span>© {new Date().getFullYear()} PSI</span>
        <span>Hecho con Next.js + Tailwind</span>
      </div>
    </footer>
  );
}


