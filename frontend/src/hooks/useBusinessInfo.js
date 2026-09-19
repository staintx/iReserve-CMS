import { useCallback, useEffect, useState } from "react";
import { CustomerAPI } from "../api/customer";
import useRealTimeRefresh from "./useRealTimeRefresh";
import { DEFAULT_POLICIES } from "../components/policy/defaultPolicies";

export const DEFAULT_BUSINESS_INFO = {
  business_name: "Caezelle’s Food, Catering & Services",
  contact_number: "09123456789",
  email: "info@caezelle.com",
  address: "123 Culinary Street Food City",
  hours: "Mon-Fri: 7:30 AM - 7:00 PM",
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  terms_url: "",
  privacy_url: "",
  years_of_experience: 10,
  policies: DEFAULT_POLICIES,
};

export default function useBusinessInfo(provided) {
  const hasProvided = Boolean(
    provided &&
    typeof provided === "object" &&
    Object.keys(provided).length > 0 &&
    provided.business_name
  );
  const [fetched, setFetched] = useState(DEFAULT_BUSINESS_INFO);

  const fetchInfo = useCallback(() => {
    if (hasProvided) return;
    CustomerAPI.getBusinessInfo()
      .then((res) => {
        if (res?.data) {
          setFetched((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
  }, [hasProvided]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useRealTimeRefresh(fetchInfo);

  return hasProvided ? provided : fetched;
}

