// Constantes partagées pour l'éditeur d'itinéraire (périodes, catégories, transports)
export const PERIODS = [
    { key: "matin", label: "Matin", icon: "Sunrise" },
    { key: "midi", label: "Midi", icon: "Sun" },
    { key: "apres_midi", label: "Après-midi", icon: "CloudSun" },
    { key: "soir", label: "Soir / Dîner", icon: "Sunset" },
    { key: "nuit", label: "Nuit", icon: "Moon" },
];

export const CATEGORIES = [
    { key: "transport", label: "Transport", icon: "Bus", color: "sky" },
    { key: "hebergement", label: "Hôtel", icon: "Bed", color: "purple" },
    { key: "camping", label: "Camping", icon: "Tent", color: "green" },
    { key: "repas", label: "Repas", icon: "UtensilsCrossed", color: "orange" },
    { key: "visite", label: "Visite", icon: "Landmark", color: "amber" },
    { key: "loisir", label: "Loisir", icon: "Ticket", color: "pink" },
    { key: "autre", label: "Autre", icon: "Tag", color: "gray" },
];

export const TRANSPORT_MODES = [
    { key: "car", label: "Voiture", icon: "Car" },
    { key: "train", label: "Train", icon: "TrainFront" },
    { key: "flight", label: "Avion", icon: "Plane" },
    { key: "bus", label: "Bus", icon: "Bus" },
    { key: "ferry", label: "Ferry", icon: "Ship" },
];

export const categoryMeta = (key) =>
    CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

export const periodMeta = (key) =>
    PERIODS.find((p) => p.key === key) || PERIODS[0];

export const transportMeta = (key) =>
    TRANSPORT_MODES.find((t) => t.key === key) || TRANSPORT_MODES[0];
