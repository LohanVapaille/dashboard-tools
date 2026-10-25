import { Bed, Calendar, ChartPie, Headset, Hotel, Image, LayoutGrid, List, Map, MapPin, MessageSquare, Plane, Route, ShoppingCart, Sparkles, StickyNote, Ticket, UserPlus, Users, Wallet } from "lucide-react";

// Noms d'icônes envoyés par AdminResources (PHP) => composants lucide.
const ICONS = {
    users: Users,
    map: Map,
    "user-plus": UserPlus,
    "map-pin": MapPin,
    calendar: Calendar,
    sparkles: Sparkles,
    layout: LayoutGrid,
    route: Route,
    "sticky-note": StickyNote,
    image: Image,
    ticket: Ticket,
    wallet: Wallet,
    "pie-chart": ChartPie,
    list: List,
    plane: Plane,
    bed: Bed,
    hotel: Hotel,
    "shopping-cart": ShoppingCart,
    headset: Headset,
    message: MessageSquare,
};

export default function AdminIcon({ name, className = "h-4 w-4" }) {
    const Icon = ICONS[name] || List;
    return <Icon className={className} />;
}
