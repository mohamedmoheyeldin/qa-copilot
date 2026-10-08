import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { type HistoryEntry, history } from "@/lib/history";

/**
 * Opens a history entry passed through router state (`{ historyId }`) once, then clears the state
 * so a refresh or back-navigation doesn't reopen it.
 */
export const useHistoryEntry = <K extends HistoryEntry["tool"]>(tool: K, onOpen: (entry: Extract<HistoryEntry, { tool: K }>) => void) => {
    const location = useLocation();
    const navigate = useNavigate();
    const handled = useRef(false);
    const id = (location.state as { historyId?: string } | null)?.historyId;

    useEffect(() => {
        if (!id || handled.current) return;
        handled.current = true;
        const entry = history.get(id);
        if (entry && entry.tool === tool) onOpen(entry as Extract<HistoryEntry, { tool: K }>);
        navigate(location.pathname, { replace: true, state: null });
    }, [id, tool, onOpen, navigate, location.pathname]);
};
