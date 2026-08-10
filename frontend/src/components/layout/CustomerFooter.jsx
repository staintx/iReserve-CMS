import { useNavigate } from "react-router-dom";
import useBusinessInfo, { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import logo from "../../assets/images/logo.jpg";

export default function CustomerFooter({ businessInfo: provided }) {
  const navigate = useNavigate();
  const businessInfo = useBusinessInfo(provided);

  const businessName = businessInfo.business_name || DEFAULT_BUSINESS_INFO.business_name;
  const contactNumber = businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;
  const contactEmail = businessInfo.email || DEFAULT_BUSINESS_INFO.email;
  const address = businessInfo.address || DEFAULT_BUSINESS_INFO.address;
  const hours = businessInfo.hours || DEFAULT_BUSINESS_INFO.hours;

  const policyLinks = [
    { label: "Terms & Conditions", href: businessInfo.terms_url },
    { label: "Privacy Policy", href: businessInfo.privacy_url },
  ].filter((link) => link.href);

  const socialLinks = [
    { label: "Facebook", href: businessInfo.facebook, icon: "facebook" },
    { label: "Instagram", href: businessInfo.instagram, icon: "instagram" },
  ].filter((link) => Boolean(link.href));

  const go = (path) => (event) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <footer className="ls-footer">
      <div className="ls-inner">
        <div className="ls-footer-grid">
          <div>
            <div className="ls-footer-brand">
              <img src={logo} alt="" />
              <span className="ls-footer-brand-name">{businessName}</span>
            </div>
            <p className="ls-footer-summary">
              Catering, event setup, and on-the-day service for weddings,
              birthdays, and corporate events.
            </p>
            {socialLinks.length > 0 && (
              <div className="ls-footer-social">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                  >
                    {link.icon === "facebook" ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.3V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12h2.4l-.4 2.9h-2v7A10 10 0 0 0 22 12Z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 4.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5ZM17.7 6.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-labelledby="footer-browse">
            <h2 id="footer-browse">Browse</h2>
            <div className="ls-footer-list">
              <a href="/menu" onClick={go("/menu")}>
                Menu
              </a>
              <a href="/packages" onClick={go("/packages")}>
                Packages
              </a>
              <a href="/gallery" onClick={go("/gallery")}>
                Gallery
              </a>
              <a
                href="/customer/book"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/customer/book", { state: { resetWizard: true } });
                }}
              >
                Book an Event
              </a>
            </div>
          </nav>

          <div>
            <h2>Contact</h2>
            <div className="ls-footer-contact">
              <p className="ls-footer-contact-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.06a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z" />
                </svg>
                <a href={`tel:${contactNumber.replace(/\s+/g, "")}`}>{contactNumber}</a>
              </p>
              <p className="ls-footer-contact-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </p>
              <p className="ls-footer-contact-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
                  <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
                <span>{address}</span>
              </p>
            </div>
          </div>

          <div>
            <h2>Opening hours</h2>
            <div className="ls-footer-contact">
              <p>{hours}</p>
            </div>
          </div>
        </div>

        <div className="ls-footer-bottom">
          <span>
            © {new Date().getFullYear()} {businessName}. All rights reserved.
          </span>
          {policyLinks.length > 0 && (
            <div className="ls-footer-bottom-links">
              {policyLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
