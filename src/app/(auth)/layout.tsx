
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  // This layout can be simple as the pages themselves handle the centering and styling.
  // Or, you could add common elements for auth pages here if needed.
  return <>{children}</>;
}
