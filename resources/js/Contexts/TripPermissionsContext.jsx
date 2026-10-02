import React, { createContext, useContext } from "react";

const TripPermissionsContext = createContext({
    isOwner: false,
    role: null,
    canEdit: false,
    canViewShareLink: false,
    canManageAccess: false,
    canManageRoles: false,
});

export function TripPermissionsProvider({ permissions, children }) {
    return (
        <TripPermissionsContext.Provider value={permissions}>
            {children}
        </TripPermissionsContext.Provider>
    );
}

export function useTripPermissions() {
    return useContext(TripPermissionsContext);
}
