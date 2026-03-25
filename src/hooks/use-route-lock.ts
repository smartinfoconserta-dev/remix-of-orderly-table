import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const useRouteLock = (allowedPath: string, enabled = true) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const reinforceLock = () => {
      if (typeof window === "undefined") return;

      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const currentState = typeof window.history.state === "object" && window.history.state !== null ? window.history.state : {};

      window.history.pushState(
        {
          ...currentState,
          routeLocked: true,
          lockedAt: Date.now(),
          allowedPath,
        },
        "",
        currentUrl,
      );
    };

    const handlePopState = () => {
      if (window.location.pathname !== allowedPath) {
        navigate(allowedPath, { replace: true });
      }

      window.setTimeout(reinforceLock, 0);
    };

    reinforceLock();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [allowedPath, enabled, location.hash, location.pathname, location.search, navigate]);
};
