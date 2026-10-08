/**
 * Catering Knowledge Base & Help FAQ Topics
 * Provides instant answers for common catering questions
 * with direct hand-off into Zelle AI chat.
 */

export const CATERING_COLLECTIONS = [
  {
    id: "packages",
    title: "Catering Packages & Inclusions",
    description: "Buffet tiers, standard setups, and package inclusions",
    icon: "Package",
    badge: "Popular",
    faqs: [
      {
        id: "pkg-1",
        title: "What is included in a standard catering package?",
        summary: "Complete breakdown of food, table setup, linens, and service staff.",
        content: `Every standard Caezelle Catering package comes with:
- **Full Buffet Setup**: Complete chafing dishes, food warmers, and buffet table styling.
- **Tables & Chairs**: Dressed round or rectangular tables with floor-length linens, table runners, and dressed monoblock chairs with seat covers.
- **Complete Chinaware & Glassware**: Flatware, melamine/ceramic plates, goblets, and utensils.
- **Trained Service Staff**: Uniformed food servers and bussers throughout the event duration (typically 4–5 hours).
- **Beverage Station**: Purified drinking water, iced tea or juice station with continuous refill.`,
        relatedPrompt: "Tell me more about what is included in standard catering packages."
      },
      {
        id: "pkg-2",
        title: "What are Special Offers and Combo Packs?",
        summary: "Fixed-pax meal combos with fixed menu sets and budget-friendly pricing.",
        content: `A **Special Offer** is a fixed combo meal designed for specific guest counts (e.g. 50 pax, 80 pax, 100 pax) at an all-inclusive rate:
- Combo packs have a fixed list of viands and cannot be scaled up or down arbitrarily.
- They are food-focused and do not include custom stage styling (venue styling can be added separately).
- Ideal for intimate family gatherings, office milestones, and birthdays.`,
        relatedPrompt: "What special offer combos are currently available?"
      },
      {
        id: "pkg-3",
        title: "Can I customize the items in a package?",
        summary: "Yes, swap viands, add carving stations, dessert bars, and equipment.",
        content: `Yes! While our packages have recommended starter menus, you can:
- **Swap Viands**: Exchange beef, pork, chicken, fish, or vegetable dishes within the same category.
- **Add Food Stations**: Add Lechon Belly, Roast Beef Carving, Halo-Halo Bar, or dessert stations.
- **Upgrade Styling**: Add themed backdrop setups, mood lighting, or Tiffany chairs.`,
        relatedPrompt: "How can I customize a catering package menu?"
      }
    ],
    get articles() {
      return this.faqs;
    }
  },
  {
    id: "dates",
    title: "Date Availability & Booking Timeline",
    description: "Lead times, checking reserved dates, and peak season tips",
    icon: "Calendar",
    badge: "Important",
    faqs: [
      {
        id: "date-1",
        title: "How far in advance should I book my event?",
        summary: "Recommended booking timelines for weddings, debuts, and parties.",
        content: `We recommend booking as early as possible to secure your desired date:
- **Weddings & Debuts**: 3 to 6 months in advance (especially for peak months like December, January, and June).
- **Birthdays & Anniversaries**: 3 to 4 weeks in advance.
- **Corporate & Small Gatherings**: At least 2 weeks in advance.

Dates are officially locked only once the initial reservation downpayment is verified.`,
        relatedPrompt: "Is my target event date available for booking?"
      },
      {
        id: "date-2",
        title: "How do I check if my target date is open?",
        summary: "Use Zelle AI or the booking calendar to check live date status.",
        content: `You can check availability right here in this assistant! Simply ask Zelle:
- Type your date and guests: *"Is [Your Target Date] available for 150 guests?"*
- Zelle connects directly to our real-time calendar and confirms whether the date is open, booked, or near capacity.`,
        relatedPrompt: "Check if my date is available for catering"
      }
    ],
    get articles() {
      return this.faqs;
    }
  },
  {
    id: "billing",
    title: "Billing, Deposits & Payments",
    description: "Downpayment terms, installment milestones, and payment channels",
    icon: "CreditCard",
    badge: "Finance",
    faqs: [
      {
        id: "bill-1",
        title: "What are the payment milestones and terms?",
        summary: "Standard downpayment, milestone schedule, and balance settlement.",
        content: `Our standard payment schedule is split into clear milestones:
- **Reservation Deposit (20% - 30%)**: Locks your event date in our calendar and starts ingredient sourcing.
- **Mid-term Payment (40% - 50%)**: Due 2–3 weeks before the event upon final menu and head-count sign-off.
- **Final Balance Settlement**: Settled on or right before the event day as specified in your agreement.`,
        relatedPrompt: "What are the payment terms and downpayment rules?"
      },
      {
        id: "bill-2",
        title: "Which payment methods are accepted?",
        summary: "GCash, Online Bank Transfer, and cash payment channels.",
        content: `We accept multiple convenient payment channels:
- **GCash**: Upload your transaction screenshot directly in your customer dashboard or chat.
- **Bank Transfer (BDO / BPI / UnionBank)**: Direct bank transfers with reference number tracking.
- **Official Receipt**: Once validated by our finance team, an official digital receipt is recorded in your dashboard.`,
        relatedPrompt: "What are the payment channels and how do I submit proof of payment?"
      }
    ],
    get articles() {
      return this.faqs;
    }
  },
  {
    id: "menu",
    title: "Menu Selection & Food Tasting",
    description: "Dish options, dietary preferences, and food tasting sessions",
    icon: "Utensils",
    badge: null,
    faqs: [
      {
        id: "menu-1",
        title: "Can we schedule a Food Tasting session?",
        summary: "Complimentary tasting for confirmed wedding and debut clients.",
        content: `Yes! For major events such as Weddings and Debuts with 100+ guests, we offer food tasting sessions:
- Sample signature dishes (Beef Stroganoff, Pastel de Lengua, Fish Fillet in Tartar, and more).
- Meet with our culinary coordinator to adjust seasonings, sweetness, or sauce consistency.
- Inquire through Zelle AI or contact your event coordinator to book a tasting slot.`,
        relatedPrompt: "I want to inquire about scheduling a food tasting session."
      },
      {
        id: "menu-2",
        title: "Do you accommodate dietary restrictions (Halal, Vegetarian)?",
        summary: "Custom dishes for vegetarian, pescatarian, or pork-free requirements.",
        content: `Yes! Inform us during the inquiry stage or menu curation:
- **Pork-Free Options**: Available across beef, chicken, seafood, and pasta selections.
- **Vegetarian Dishes**: Pasta and vegetable entrées (e.g., Buttered Mixed Veggies with Cashew, Chopsuey Guisado).
- **Kids' Meals**: Sweet Spaghetti, Fried Chicken, and Mini Burgers can be added.`,
        relatedPrompt: "Can you provide a menu with dietary restrictions or pork-free dishes?"
      }
    ],
    get articles() {
      return this.faqs;
    }
  },
  {
    id: "policies",
    title: "Policies, Rescheduling & Cancellation",
    description: "Guidelines on postponements, guest count changes, and venues",
    icon: "ShieldAlert",
    badge: null,
    faqs: [
      {
        id: "pol-1",
        title: "What happens if I need to reschedule my event?",
        summary: "Postponement guidelines and date transfer conditions.",
        content: `We understand emergencies and weather disruptions happen:
- **Rescheduling Notice**: Must be made at least 14 days before the event date to avoid ingredient sourcing penalties.
- **Date Transfer**: The new target date is subject to calendar availability.
- Contact your coordinator directly via the **Message Staff** tab to request date changes.`,
        relatedPrompt: "What is your policy for event rescheduling or postponement?"
      },
      {
        id: "pol-2",
        title: "When is the final guest count deadline?",
        summary: "Deadline for confirming final head count and table arrangements.",
        content: `Final guest count and table arrangements must be finalized at least **7 days prior** to the event date.
Additional guests requested within 48 hours may be accommodated subject to raw ingredient availability and a per-pax surcharge.`,
        relatedPrompt: "When do I need to submit the final guest count?"
      }
    ],
    get articles() {
      return this.faqs;
    }
  }
];

export const CATERING_QUICK_SHORTCUTS = [
  { label: "Wedding & Debut Packages", prompt: "Recommend your best wedding and debut catering packages" },
  { label: "Check Date Availability", prompt: "Is my target event date available for booking?" },
  { label: "Budget Packages (< ₱60k)", prompt: "Show me budget-friendly catering packages under ₱60,000" },
  { label: "Menu Tasting & Viands", prompt: "What are the most popular viands and how does food tasting work?" },
  { label: "Payment & Downpayment", prompt: "What is the downpayment percentage and payment terms?" }
];

export const EVENT_PLANNING_STEPS = [
  {
    id: 1,
    title: "Check Date & Guest Count",
    desc: "Verify open dates and ballpark your guest headcount.",
    actionPrompt: "Is my target date available for booking?",
    actionLabel: "Check Date"
  },
  {
    id: 2,
    title: "Choose Catering Package",
    desc: "Select a buffet tier, combo meal, or styling inclusions.",
    actionPrompt: "Recommend catering packages suitable for my event",
    actionLabel: "Explore Packages"
  },
  {
    id: 3,
    title: "Customize Menu & Add-ons",
    desc: "Select beef, pork, chicken, pasta, and dessert stations.",
    actionPrompt: "Help me curate a menu for my chosen package",
    actionLabel: "Curate Menu"
  },
  {
    id: 4,
    title: "Submit Inquiry & Get Quote",
    desc: "Review line-item cost breakdown with an event coordinator.",
    actionPrompt: "Help me draft an official catering inquiry",
    actionLabel: "Draft Inquiry"
  },
  {
    id: 5,
    title: "Lock Reservation with Deposit",
    desc: "Settle deposit via GCash/Bank to guarantee kitchen schedule.",
    actionPrompt: "How do I pay the reservation deposit?",
    actionLabel: "View Payment Info"
  }
];
