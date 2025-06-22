// Color palette for the app
export const colors = {
  primary: "#4A80F0", // Soft blue as primary color
  secondary: "#F5A623", // Amber as secondary/alert color
  success: "#4CD964", // Green for success states
  danger: "#FF3B30", // Red for danger/error states
  dangerLight: "#FFE5E5", // Light red for danger backgrounds
  warning: "#FFCC00", // Yellow for warnings
  
  // Neutrals
  background: "#FFFFFF",
  card: "#F9F9F9",
  text: "#1A1A1A",
  textSecondary: "#6E6E6E",
  border: "#E5E5E5",
  
  // Status colors for incidents
  incident: {
    accident: "#FF3B30", // Red for accidents
    hazard: "#F5A623", // Amber for hazards
    others: "#5856D6", // Purple for other incidents
  }
};

export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    tabIconDefault: "#CCCCCC",
    tabIconSelected: colors.primary,
  },
}; 