/**
 * Gemini Function Declarations for Zelle AI
 */

const CUSTOMER_TOOLS = [
  {
    name: "get_packages",
    description: "Fetch list of active catering packages and special offers. Can filter by event type or service type.",
    parameters: {
      type: "OBJECT",
      properties: {
        event_type: {
          type: "STRING",
          description: "Filter by event type, e.g., 'Wedding', 'Debut', 'Birthday', 'Corporate'.",
        },
        service_type: {
          type: "STRING",
          description: "Filter by service type: 'Food Only', 'Event Setup Only', or 'Food + Event Setup'.",
        },
        offer_type: {
          type: "STRING",
          description: "Filter by offer type: 'regular' or 'special' (Special Offers).",
        },
      },
    },
  },
  {
    name: "get_package_details",
    description: "Get full details, inclusions, menu rules, and pricing for a specific package.",
    parameters: {
      type: "OBJECT",
      properties: {
        package_name_or_id: {
          type: "STRING",
          description: "The name or ObjectId of the package to look up.",
        },
      },
      required: ["package_name_or_id"],
    },
  },
  {
    name: "get_menu_items",
    description: "Fetch list of available dishes and menu items, optionally filtered by category.",
    parameters: {
      type: "OBJECT",
      properties: {
        category: {
          type: "STRING",
          description: "Menu category (e.g., 'Beef', 'Pork', 'Chicken', 'Seafood', 'Pasta', 'Dessert', 'Beverage').",
        },
        search: {
          type: "STRING",
          description: "Search keyword for a dish name or ingredient.",
        },
      },
    },
  },
  {
    name: "get_available_addons",
    description: "Fetch list of optional add-on services and equipment rentals with prices.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: {
          type: "STRING",
          description: "Optional search query for add-on items (e.g., 'Photo Booth', 'Dessert Station', 'Lights & Sound').",
        },
      },
    },
  },
  {
    name: "check_date_availability",
    description: "Check if an event date is open, blocked, or has existing bookings.",
    parameters: {
      type: "OBJECT",
      properties: {
        date: {
          type: "STRING",
          description: "The date to check in YYYY-MM-DD format (e.g., '2026-12-15').",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "get_business_info",
    description: "Retrieve Caezelle Catering's official business info, operating hours, contact numbers, address, and booking deposit policy.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_my_inquiries",
    description: "Retrieve the authenticated customer's own recent inquiries and status.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_my_quotations",
    description: "Retrieve quotations sent to the authenticated customer.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_my_bookings",
    description: "Retrieve the authenticated customer's confirmed and active event bookings.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_my_payment_status",
    description: "Retrieve payment details, total amount, deposit paid, and remaining balance for customer's booking.",
    parameters: {
      type: "OBJECT",
      properties: {
        booking_reference_or_id: {
          type: "STRING",
          description: "Optional booking reference code (e.g., 'CAZ-000001') or ID.",
        },
      },
    },
  },
  {
    name: "create_inquiry_draft",
    description: "Create an official inquiry draft from the gathered conversation details for admin review.",
    parameters: {
      type: "OBJECT",
      properties: {
        event_type: {
          type: "STRING",
          description: "Type of event (e.g., 'Wedding', 'Debut', 'Birthday Party', 'Corporate Event').",
        },
        event_date: {
          type: "STRING",
          description: "Target event date in YYYY-MM-DD format.",
        },
        start_time: {
          type: "STRING",
          description: "Estimated start time (e.g., '14:00' or '2:00 PM').",
        },
        guest_count: {
          type: "NUMBER",
          description: "Expected number of guests.",
        },
        service_type: {
          type: "STRING",
          description: "Service type: 'Food Only', 'Event Setup Only', or 'Food and Event Setup'.",
        },
        package_id: {
          type: "STRING",
          description: "ID of selected package if chosen, otherwise leave blank.",
        },
        budget_range: {
          type: "STRING",
          description: "Customer's budget estimate or range (e.g., '₱60,000 - ₱70,000').",
        },
        province: {
          type: "STRING",
          description: "Event location province.",
        },
        municipality: {
          type: "STRING",
          description: "Event location municipality / city.",
        },
        street: {
          type: "STRING",
          description: "Event venue address / landmark / street.",
        },
        special_requests: {
          type: "STRING",
          description: "Special requests, dietary requirements, or theme notes.",
        },
      },
      required: ["event_type", "event_date", "start_time", "guest_count"],
    },
  },
];

const ADMIN_TOOLS = [
  ...CUSTOMER_TOOLS.filter((t) => t.name !== "create_inquiry_draft"),
  {
    name: "get_inquiry",
    description: "Get full details of an inquiry by reference code or ID.",
    parameters: {
      type: "OBJECT",
      properties: {
        inquiry_id_or_reference: {
          type: "STRING",
          description: "Inquiry reference (e.g., 'INQ-000001') or ObjectId.",
        },
      },
      required: ["inquiry_id_or_reference"],
    },
  },
  {
    name: "search_inquiries",
    description: "Search and filter inquiries by status or keyword.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Status filter, e.g., 'Pending Review', 'Under Review', 'Quotation Sent'.",
        },
        search: {
          type: "STRING",
          description: "Customer name or reference search term.",
        },
      },
    },
  },
  {
    name: "check_inventory_levels",
    description: "Check current inventory stock levels and availability for catering equipment.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: {
          type: "STRING",
          description: "Search for specific equipment (e.g., 'Chairs', 'Tables', 'Chafing Dish').",
        },
      },
    },
  },
  {
    name: "draft_quotation",
    description: "Compute and draft a recommended quotation line breakdown for an inquiry.",
    parameters: {
      type: "OBJECT",
      properties: {
        inquiry_id: {
          type: "STRING",
          description: "The inquiry ID to draft quotation for.",
        },
        package_id: {
          type: "STRING",
          description: "The recommended Package ID.",
        },
        addon_names: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of recommended add-on names.",
        },
      },
      required: ["inquiry_id"],
    },
  },
  {
    name: "draft_response",
    description: "Draft a helpful customer message response based on recent inquiry or conversation context.",
    parameters: {
      type: "OBJECT",
      properties: {
        conversation_id: {
          type: "STRING",
          description: "ID of the customer conversation.",
        },
        intent_notes: {
          type: "STRING",
          description: "Guidance on what to tell the customer (e.g. 'confirm Dec 15 availability and ask for guest count').",
        },
      },
      required: ["conversation_id"],
    },
  },
  {
    name: "summarize_feedback",
    description: "Aggregate recent customer ratings, reviews, and sentiment insights.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: {
          type: "NUMBER",
          description: "Number of past days to analyze (default 90).",
        },
      },
    },
  },
];

module.exports = {
  CUSTOMER_TOOLS,
  ADMIN_TOOLS,
};
