import {
    AirVent,
    Bath,
    BedDouble,
    Building2,
    Car,
    ChefHat,
    Coffee,
    Dumbbell,
    Home,
    Hotel,
    Mountain,
    PawPrint,
    Tent,
    Utensils,
    Waves,
    Wifi,
    Wine,
    Accessibility,
    Clock3,
    Shirt,
    Baby,
    Briefcase,
    ConciergeBell,
    Caravan,
} from "lucide-react";

export const amenityMeta = {
    wifi: { label: "Wi-Fi", icon: Wifi },
    parking: { label: "Parking", icon: Car },
    pool: { label: "Piscine", icon: Waves },
    breakfast: { label: "Petit-déjeuner", icon: Coffee },
    air_conditioning: { label: "Climatisation", icon: AirVent },
    kitchen: { label: "Cuisine", icon: ChefHat },
    pets: { label: "Animaux acceptés", icon: PawPrint },
    accessible: { label: "Accessible PMR", icon: Accessibility },
    restaurant: { label: "Restaurant", icon: Utensils },
    bar: { label: "Bar", icon: Wine },
    spa: { label: "Spa / sauna", icon: Bath },
    gym: { label: "Salle de sport", icon: Dumbbell },
    reception_24h: { label: "Réception 24 h/24", icon: Clock3 },
    laundry: { label: "Laverie", icon: Shirt },
    family: { label: "Services enfants", icon: Baby },
    room_service: { label: "Service en chambre", icon: ConciergeBell },
    business: { label: "Espace affaires", icon: Briefcase },
};

export const typeMeta = {
    hotel: { label: "Hôtel", icon: Hotel, gradient: "from-sky-500 to-indigo-600" },
    apartment: { label: "Appartement", icon: Building2, gradient: "from-violet-500 to-fuchsia-600" },
    guest_house: { label: "Chambre d’hôtes", icon: Home, gradient: "from-amber-400 to-rose-500" },
    hostel: { label: "Auberge de jeunesse", icon: BedDouble, gradient: "from-emerald-400 to-teal-600" },
    motel: { label: "Motel", icon: Car, gradient: "from-slate-500 to-slate-700" },
    chalet: { label: "Chalet / gîte", icon: Mountain, gradient: "from-lime-500 to-emerald-700" },
    camp_site: { label: "Camping", icon: Tent, gradient: "from-green-500 to-emerald-700" },
    alpine_hut: { label: "Refuge", icon: Mountain, gradient: "from-cyan-500 to-blue-700" },
    caravan_site: { label: "Aire de camping-car", icon: Caravan, gradient: "from-orange-400 to-amber-600" },
};

export const partnerMeta = {
    booking: { label: "Booking.com", color: "bg-[#003580] text-white" },
    airbnb: { label: "Airbnb", color: "bg-[#FF385C] text-white" },
    expedia: { label: "Expedia", color: "bg-[#FDDB32] text-slate-900" },
    google: { label: "Google Hotels", color: "bg-white text-slate-800 ring-1 ring-slate-200" },
    website: { label: "Site officiel", color: "bg-slate-900 text-white" },
};

/** Vignette OpenStreetMap centrée sur l'hébergement (tuile 256 px + position du repère). */
export const mapThumbnail = (lat, lng, zoom = 16) => {
    const n = 2 ** zoom;
    const x = ((lng + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
    return {
        url: `https://tile.openstreetmap.org/${zoom}/${Math.floor(x)}/${Math.floor(y)}.png`,
        pinLeft: `${(x % 1) * 100}%`,
        pinTop: `${(y % 1) * 100}%`,
    };
};

export const nightsBetween = (checkIn, checkOut) =>
    checkIn && checkOut ? Math.max(0, Math.round((new Date(`${checkOut}T12:00:00`) - new Date(`${checkIn}T12:00:00`)) / 86400000)) : 0;

export const formatDay = (value, options = { day: "numeric", month: "short" }) =>
    value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", options) : "";
