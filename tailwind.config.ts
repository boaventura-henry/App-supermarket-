import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        supermarket: {
          ink: "#17211f",
          leaf: "#1f6f55",
          mint: "#d8f3dc",
          lime: "#b6d94c",
          tomato: "#d85f45",
          paper: "#f7f4ec"
        }
      },
      boxShadow: {
        soft: "0 14px 42px rgba(23, 33, 31, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
