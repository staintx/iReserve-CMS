import { useCallback, useEffect, useState } from "react";
import { CustomerAPI } from "../api/customer";
import useRealTimeRefresh from "./useRealTimeRefresh";

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

export default function useBusinessInfo(provided) {
  const [fetched, setFetched] = useState(DEFAULT_BUSINESS_INFO);

  const fetchInfo = useCallback(() => {
    if (provided) return;
    CustomerAPI.getBusinessInfo()
      .then((res) => {
        if (res?.data) {
          setFetched((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
  }, [provided]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useRealTimeRefresh(fetchInfo);

  return provided ?? fetched;
}
