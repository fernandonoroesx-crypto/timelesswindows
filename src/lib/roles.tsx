import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'admin' | 'manager' | 'field';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  fieldUserName: string;
  setFieldUserName: (name: string) => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');
  const [fieldUserName, setFieldUserName] = useState(() => {
    return localStorage.getItem('tw_field_name') || '';
  });

  const handleSetRole = (r: UserRole) => {
    setRole(r);
    localStorage.setItem('tw_role', r);
  };

  const handleSetFieldName = (name: string) => {
    setFieldUserName(name);
    localStorage.setItem('tw_field_name', name);
  };

  return (
    <RoleContext.Provider value={{ role, setRole: handleSetRole, fieldUserName, setFieldUserName: handleSetFieldName }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
