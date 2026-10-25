// Liens d'affiliation vers les plateformes de billets et visites : elles vendent et gèrent
// l'annulation, le site perçoit une commission.
const BOOKABLE_CATEGORIES = ["visite", "loisir"];

export const isTicketable = (activity) => BOOKABLE_CATEGORIES.includes(activity.category);

export function activityPartnerLinks(partners, search, date) {
    const q = search.trim();
    if (!q) return [];

    return [
        {
            key: "getyourguide",
            label: "GetYourGuide",
            url: "https://www.getyourguide.fr/s/?" + new URLSearchParams({
                q,
                ...(date ? { date_from: date.slice(0, 10), date_to: date.slice(0, 10) } : {}),
                ...(partners?.getyourguide_partner_id ? { partner_id: partners.getyourguide_partner_id } : {}),
            }),
        },
        {
            key: "viator",
            label: "Viator",
            url: "https://www.viator.com/fr-FR/searchResults/all?" + new URLSearchParams({
                text: q,
                ...(partners?.viator_pid ? { pid: partners.viator_pid, mcid: "42383", medium: "link" } : {}),
            }),
        },
        // Marques Travelpayouts : converties en liens affiliés à l'ouverture.
        { key: "tiqets", label: "Tiqets", url: "https://www.tiqets.com/fr/search?" + new URLSearchParams({ q }) },
        { key: "klook", label: "Klook", url: "https://www.klook.com/fr/search/result/?" + new URLSearchParams({ query: q }) },
        { key: "kkday", label: "KKday", url: "https://www.kkday.com/fr/product/productlist?" + new URLSearchParams({ keyword: q }) },
    ];
}
