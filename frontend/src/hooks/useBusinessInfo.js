import { useEffect, useState } from "react";
import { CustomerAPI } from "../api/customer";

export const DEFAULT_BUSINESS_INFO = {
  business_name: "Caezelle's Catering",
  contact_number: "09123456789",
  email: "info@caezelle.com",
  address: "123 Culinary Street Food City",
  hours: "Mon-Fri: 7:30 AM - 7:00 PM",
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  terms_url: "",
  privacy_url: "",
};

/**
 * Business info always resolves to something renderable: the API values when
 * they load, the defaults when they don't. A failure here is not worth a
 * visible error state — nobody came to the page for the contact block.
 *
 * Pass `provided` when the caller already has the data (the landing page
 * fetches it for its contact band) and the request is skipped entirely.
 */
export default function useBusinessInfo(provided) {
  const [fetched, setFetched] = useState(DEFAULT_BUSINESS_INFO);

  useEffect(() => {
    if (provided) return undefined;

    let cancelled = false;
    CustomerAPI.getBusinessInfo()
      .then((res) => {
        if (cancelled || !res?.data) return;
        setFetched((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [provided]);

  return provided ?? fetched;
}
