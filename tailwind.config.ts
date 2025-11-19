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
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#DC2626",
          dark: "#B91C1C",
          light: "#EF4444",
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#DC2626",
          600: "#B91C1C",
          700: "#991B1B",
        },
        psi: {
          red: "#DC2626",
          blue: "#2563EB",
          gray: {
            dark: "#1E293B",
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

