export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        transit: {
          ink: "#0B0F13",
          bg: "#ffffff",
          green: "#0a7d55",
          green2: "#00a76f",
          gray: { 50:"#f7f8f9",100:"#eef0f2",200:"#e3e6ea",300:"#cfd6dd",700:"#334155",800:"#1f2937" }
        }
      },
      boxShadow: {
        soft: "0 20px 60px -30px rgba(0,0,0,.35)",
        card: "0 10px 40px -25px rgba(0,0,0,.35)"
      },
      borderRadius: { xl2: "1rem" },
      keyframes: {
        floaty: { "0%,100%":{transform:"translateY(0)"}, "50%":{transform:"translateY(-6px)"} }
      },
      animation: { floaty: "floaty 6s ease-in-out infinite" }
    }
  },
  plugins: [],
}