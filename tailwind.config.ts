import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        market: {
          ink: "#17211f",
          leaf: "#1d6b4f",
          lime: "#b6d94c",
          tomato: "#dd553d",
          cream: "#f7f3e9"
        }
      },
      boxShadow: {
        soft: "0 12px 40px rgba(23, 33, 31, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
