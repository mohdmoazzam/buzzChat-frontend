import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * Renders the route when `user` is truthy, otherwise redirects. The page the visitor was headed
 * for (e.g. an invite link) rides along as state.from, so with `returnToFrom` the login and
 * verify-email guards send them back there instead of to `redirect`.
 */
const ProtectRoute = ({ children, user, redirect = "/login", returnToFrom = false }) => {
  const location = useLocation();
  if (!user) {
    const from = location.state?.from;
    if (returnToFrom) return <Navigate to={from ?? redirect} replace />;
    return <Navigate to={redirect} state={{ from: from ?? `${location.pathname}${location.search}` }} />;
  }

  return children ? children : <Outlet />;
};

export default ProtectRoute;
