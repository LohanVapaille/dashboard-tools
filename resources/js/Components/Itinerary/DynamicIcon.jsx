import React from "react";
import {
    Sun,
    Sunrise,
    Sunset,
    Moon,
    Coffee,
    Utensils,
    Bed,
    Car,
    Plane,
    Bus,
    Train,
    Compass,
    Shield,
    Tag,
    MapPin,
    DollarSign,
} from "lucide-react";

export default function DynamicIcon({ name, className = "w-4 h-4" }) {
    const icons = {
        matin: Sunrise,
        midi: Sun,
        apres_midi: Coffee,
        soir: Sunset,
        nuit: Moon,
        hotel: Bed,
        manger: Utensils,
        transport: Car,
        car: Car,
        flight: Plane,
        train: Train,
        bus: Bus,
        autre: Compass,
    };

    const IconComponent = icons[name] || Compass;
    return <IconComponent className={className} />;
}
