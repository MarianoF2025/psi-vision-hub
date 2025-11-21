import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-[#DCF8C6]',
    'bg-[#EFEAE2]',
    'bg-white',
    'bg-[#1E293B]',
    'text-[#1E293B]',
    'border-[#1E293B]',
    'bg-[#2563EB]',
    'hover:bg-[#1D4ED8]',
    'text-[#2563EB]',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#2563EB", // Color principal del CRM
          dark: "#1D4ED8",
          light: "#3B82F6",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        psi: {
          red: "#DC2626",
          blue: "#2563EB", // Actualizado al color del CRM
          gray: {
            dark: "#2563EB",
            medium: "#475569",
            light: "#F1F5F9",
          },
        },
        whatsapp: {
          messageSent: "#DCF8C6",
          messageReceived: "#FFFFFF",
          background: "#EFEAE2",
        },
      },
    },
  },
  plugins: [],
};
export default config;

