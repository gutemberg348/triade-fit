export const THEME_PRESETS = {
  CHAMPAGNE_NUDE: {
    background: "#F1E3D6",
    cardBackground: "#F8EFE7",
    secondaryBackground: "#E8D3C2",
    button: "#C97D74",
    buttonPressed: "#B96D65",
    title: "#301F19",
    text: "#60483D",
    secondaryText: "#8A6F62",
    border: "#D9C2B2",
    activeIcon: "#B96D65",
    inactiveIcon: "#8A6F62",
  },
  TRIADE_DARK: {
    background: "#100B0A",
    cardBackground: "#1C1311",
    secondaryBackground: "#241815",
    button: "#E8885B",
    buttonPressed: "#9E3F22",
    title: "#FFFFFF",
    text: "#E3D2C9",
    secondaryText: "#C9AEA1",
    border: "#4D352B",
    activeIcon: "#E8885B",
    inactiveIcon: "#C9AEA1",
  },
};

export const DEFAULT_THEME_PRESET = "CHAMPAGNE_NUDE";

const validHex = (value) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const hasPreset = (value) =>
  Object.prototype.hasOwnProperty.call(THEME_PRESETS, value);

export const resolveTheme = (config = {}) => {
  const presetName = hasPreset(config.themePreset)
    ? config.themePreset
    : DEFAULT_THEME_PRESET;
  const preset = THEME_PRESETS[presetName];
  const custom = config.themeColors || {};
  return Object.fromEntries(
    Object.entries(preset).map(([key, fallback]) => [
      key,
      validHex(custom[key]) ? custom[key].toUpperCase() : fallback,
    ]),
  );
};

const initial = resolveTheme();

// O bootstrap aplica a paleta remota antes de importar as telas e criar as
// StyleSheets. O objeto permanece estavel para todos os imports existentes.
export const colors = {
  bg: initial.background,
  deep: initial.background,
  surface: initial.cardBackground,
  surface2: initial.secondaryBackground,
  surface3: initial.secondaryBackground,
  line: initial.border,
  text: initial.title,
  muted: initial.text,
  subtle: initial.secondaryText,
  primary: initial.buttonPressed,
  primaryLight: initial.button,
  accent: initial.button,
  success: "#6F8E62",
  warning: "#A56E28",
  danger: "#B84E49",
  ink: initial.title,
  button: initial.button,
  buttonPressed: initial.buttonPressed,
  title: initial.title,
  body: initial.text,
  iconActive: initial.activeIcon,
  iconInactive: initial.inactiveIcon,

  // Aliases preservados para as telas existentes.
  copper: initial.buttonPressed,
  copperLight: initial.button,
  cream: initial.title,
  sage: "#6F8E62",
};

let activePreset = DEFAULT_THEME_PRESET;

export const applyAppTheme = (config = {}) => {
  activePreset = hasPreset(config.themePreset)
    ? config.themePreset
    : DEFAULT_THEME_PRESET;
  const theme = resolveTheme(config);
  Object.assign(colors, {
    bg: theme.background,
    deep: activePreset === "TRIADE_DARK" ? "#090605" : theme.background,
    surface: theme.cardBackground,
    surface2: theme.secondaryBackground,
    surface3: activePreset === "TRIADE_DARK" ? "#34231E" : theme.secondaryBackground,
    line: theme.border,
    text: theme.title,
    muted: theme.text,
    subtle: theme.secondaryText,
    primary: theme.buttonPressed,
    primaryLight: theme.button,
    accent: theme.button,
    ink: theme.title,
    button: theme.button,
    buttonPressed: theme.buttonPressed,
    title: theme.title,
    body: theme.text,
    iconActive: theme.activeIcon,
    iconInactive: theme.inactiveIcon,
    copper: theme.buttonPressed,
    copperLight: theme.button,
    cream: theme.title,
  });
  Object.assign(colors, activePreset === "TRIADE_DARK"
    ? { success: "#A9C49A", warning: "#F2C078", danger: "#F58E86", sage: "#A9C49A" }
    : { success: "#6F8E62", warning: "#A56E28", danger: "#B84E49", sage: "#6F8E62" });
  Object.assign(shadow, {
    shadowOpacity: activePreset === "TRIADE_DARK" ? 0.26 : 0.12,
    elevation: activePreset === "TRIADE_DARK" ? 9 : 5,
  });
  return theme;
};

export const isDarkAppTheme = () => activePreset === "TRIADE_DARK";

export const radii = { sm: 12, input: 16, card: 22, hero: 28, pill: 999 };

export const fonts = {
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  displayMedium: "Oswald_500Medium",
  display: "Oswald_600SemiBold",
  displayBold: "Oswald_700Bold",
};

export const shadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 22,
  elevation: 5,
};
