// Color palette for the app
export const colors = {
  // Primary Colors
  primary: "#2563EB", // Rich blue - trustworthy and professional
  primaryDark: "#1E40AF", // Darker blue for pressed states
  primaryLight: "#DBEAFE", // Light blue for backgrounds
  
  // Secondary/Accent Colors
  secondary: "#F59E0B", // Warm amber for attention
  secondaryLight: "#FEF3C7", // Light amber for backgrounds
  
  // Status Colors
  success: "#10B981", // Emerald green - fresh and positive
  successLight: "#D1FAE5", // Light green for backgrounds
  danger: "#EF4444", // Red for danger/error states
  dangerLight: "#FEE2E2", // Light red for backgrounds
  warning: "#F59E0B", // Amber for warnings
  warningLight: "#FEF3C7", // Light amber for backgrounds
  
  // Neutrals
  background: "#FFFFFF",
  card: "#F8FAFC", // Slightly blue-tinted white for cards
  text: "#0F172A", // Deep blue-gray for better readability
  textSecondary: "#64748B", // Softer blue-gray for secondary text
  border: "#E2E8F0", // Subtle blue-gray for borders
  
  // Incident Status Colors
  incident: {
    accident: "#DC2626", // Bright red for accidents
    hazard: "#F59E0B", // Amber for hazards
    others: "#6366F1", // Indigo for other incidents
    resolved: "#10B981", // Emerald for resolved incidents
  },

  // Gradients (as hex colors)
  gradient: {
    start: "#1E40AF", // Deep blue
    end: "#3B82F6", // Lighter blue
  },
  
  // Social
  google: "#EA4335", // Google red
  facebook: "#1877F2", // Facebook blue
  
  // Semantic
  link: "#2563EB", // Same as primary for consistency
  focus: "#60A5FA", // Light blue for focus states
  placeholder: "#94A3B8", // Subtle blue-gray for placeholders
  disabled: "#CBD5E1", // Light gray for disabled states
  overlay: "rgba(15, 23, 42, 0.5)", // Dark blue-gray with opacity for overlays
};

// Theme object for light mode (can be extended for dark mode)
export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    tabIconDefault: colors.textSecondary,
    tabIconSelected: colors.primary,
  },
}; 