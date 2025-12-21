import daisyui from 'daisyui';

export default {
  // Ensure this points to your actual file locations
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        garden: {
          // --- COLOR MAP (Remove '--color-' prefix) ---
          "base-100": "oklch(99% 0.005 110)",
          "base-200": "oklch(96% 0.008 105)",
          "base-300": "oklch(91% 0.012 100)",
          "base-content": "oklch(28% 0.035 130)",

          "primary": "oklch(52% 0.21 142)",
          "primary-content": "oklch(99% 0.005 142)",

          "secondary": "oklch(45% 0.078 48)",
          "secondary-content": "oklch(98% 0.005 48)",

          "accent": "oklch(68% 0.18 78)",
          "accent-content": "oklch(25% 0.036 78)",

          "neutral": "oklch(30% 0.055 148)",
          "neutral-content": "oklch(96% 0.008 148)",

          "info": "oklch(68% 0.14 230)",
          "info-content": "oklch(98% 0.005 230)",

          "success": "oklch(68% 0.22 136)",
          "success-content": "oklch(18% 0.044 136)",

          "warning": "oklch(78% 0.15 75)",
          "warning-content": "oklch(22% 0.03 75)",

          "error": "oklch(58% 0.20 12)",
          "error-content": "oklch(98% 0.005 12)",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1rem",
          "--border-btn": "2px",
          "--tab-border": "2px",
          "--tab-radius": "0.5rem",
        },
      },
    ],
  },
}


// DaisyUI Theme Garden 
// (If you want to change the theme, copy the code from here and paste it on daisyui theme)
/*
@plugin "daisyui/theme" {
  name: "garden";
  default: true;
  prefersdark: false;
  color-scheme: "light";
  --color-base-100: oklch(99% 0.005 110);
  --color-base-200: oklch(99.2% 0.024 48.700);
  --color-base-300: oklch(91% 0.012 100);
  --color-base-content: oklch(28% 0.035 130);
  --color-primary: oklch(52% 0.21 142);
  --color-primary-content: oklch(99% 0.005 142);
  --color-secondary: oklch(45% 0.078 48);
  --color-secondary-content: oklch(98% 0.005 48);
  --color-accent: oklch(68% 0.18 78);
  --color-accent-content: oklch(25% 0.036 78);
  --color-neutral: oklch(30% 0.055 148);
  --color-neutral-content: oklch(96% 0.008 148);
  --color-info: oklch(68% 0.14 230);
  --color-info-content: oklch(98% 0.005 230);
  --color-success: oklch(68% 0.22 136);
  --color-success-content: oklch(18% 0.044 136);
  --color-warning: oklch(78% 0.15 75);
  --color-warning-content: oklch(22% 0.03 75);
  --color-error: oklch(58% 0.2 12);
  --color-error-content: oklch(98% 0.005 12);
  --radius-selector: 1rem;
  --radius-field: 0.5rem;
  --radius-box: 1rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 2px;
  --depth: 0;
  --noise: 0;
}

*/