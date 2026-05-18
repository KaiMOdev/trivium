// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
// OSS auth stub. There is no authentication; useAuth returns a synthetic local user
// so existing UI that does `user?.email` and `signOut()` keeps working.

import { createContext, useContext } from "react";

const LOCAL_USER = { id: "local", email: "local@localhost", user_metadata: {} };

const AuthContext = createContext({
  user: LOCAL_USER,
  session: null,
  loading: false,
  signOut: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{
      user: LOCAL_USER,
      session: null,
      loading: false,
      signOut: () => {},
      isAdmin: false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
