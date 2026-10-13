export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// Add a page: create it in src/pages, add a route in App.tsx and an entry here.
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: "◧" },
  { path: "/transaction", label: "Transaction Analysis", icon: "⌁" },
  { path: "/dimensionality", label: "Dimensionality Reduction", icon: "⊹" },
  { path: "/models", label: "Model Comparison", icon: "≡" },
  { path: "/smote-regularization", label: "SMOTE & Regularization", icon: "⚖" },
  { path: "/bayesian", label: "Bayesian Risk", icon: "◎" },
  { path: "/sequence", label: "Sequence Analysis", icon: "⋯" },
];
