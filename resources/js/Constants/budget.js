// Catégories des dépenses partagées (onglet Budget)
import { BedDouble, Bus, ShoppingCart, Tag, Ticket, UtensilsCrossed } from "lucide-react";

export const EXPENSE_CATEGORIES = [
    { key: "activite", label: "Activité", Icon: Ticket },
    { key: "logement", label: "Logement", Icon: BedDouble },
    { key: "transport", label: "Transport", Icon: Bus },
    { key: "repas", label: "Repas", Icon: UtensilsCrossed },
    { key: "courses", label: "Courses", Icon: ShoppingCart },
    { key: "autre", label: "Autre", Icon: Tag },
];

export const expenseCategoryMeta = (key) =>
    EXPENSE_CATEGORIES.find((category) => category.key === key) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
