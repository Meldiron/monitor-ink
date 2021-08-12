const { guessProductionMode } = require("@ngneat/tailwind");

const colors = require("tailwindcss/colors");

process.env.TAILWIND_MODE = guessProductionMode() ? "build" : "watch";

module.exports = {
  prefix: "",
  mode: "jit",
  purge: {
    content: ["./src/**/*.{html,ts,css,scss,sass,less,styl}"],
  },
  darkMode: "media", // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#F02E65",
          50: "#FFFFFF",
          100: "#FEECF1",
          200: "#FABDCE",
          300: "#F78DAB",
          400: "#F35E88",
          500: "#F02E65",
          600: "#DB1049",
          700: "#AC0C39",
          800: "#7C092A",
          900: "#4D051A",
        },
        orange: colors.orange,
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/line-clamp"),
    require("@tailwindcss/typography"),
  ],
};
