/**
 * Gemini Function Declarations for Zelle AI
 */

const CUSTOMER_TOOLS = [
  {
    name: "get_packages",
    description: "Fetch active catering packages and Special Offers. A Special Offer is a combo pack: a fixed meal for a fixed guest count at a fixed price per pax. Can filter by event type, service type, or offer type.",
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
          description: "Filter by offer type: 'regular' (packages) or 'special' (combo packs).",
        },
      },
    },
  },
  {
    name: "get_package_details",
    description: "Get full details for one package or combo pack: description, pricing, inclusions, and — for a combo — its guest count and the exact food items it includes.",
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
    name: "prepare_inquiry_form_data",
    description: "Prepare catering requirements and preferences discussed with the customer into structured data to pre-fill the official booking inquiry form.",
    parameters: {
      type: "OBJECT",
      properties: {
        event_type: {
          type: "STRING",
          description: "Type of event (e.g., 'Wedding', 'Debut', 'Birthday Party', 'Corporate Event').",
        },
        guest_count: {
          type: "NUMBER",
          description: "Estimated number of guests.",
        },
        event_date: {
          type: "STRING",
          description: "Target event date in YYYY-MM-DD format if discussed.",
        },
        start_time: {
          type: "STRING",
          description: "Estimated start time (e.g., '14:00' or '2:00 PM').",
        },
        service_type: {
          type: "STRING",
          description: "Service type: 'Food Only', 'Event Setup Only', or 'Food and Event Setup'.",
        },
        package_id: {
          type: "STRING",
          description: "ObjectId of the chosen or recommended package if available.",
        },
        package_name: {
          type: "STRING",
          description: "Name of the chosen or recommended package.",
        },
        budget_range: {
          type: "STRING",
          description: "Customer's budget estimate or range.",
        },
        province: {
          type: "STRING",
          description: "Event location province (default: Batangas).",
        },
        municipality: {
          type: "STRING",
          description: "Event location municipality or city.",
        },
        street: {
          type: "STRING",
          description: "Event venue address, landmark, or street.",
        },
        special_requests: {
          type: "STRING",
          description: "Special requests, dietary preferences, theme, or dish notes.",
        },
      },
    },
  },
];

const ADMIN_TOOLS = [
  ...CUSTOMER_TOOLS.filter((t) => t.name !== "prepare_inquiry_form_data"),
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
];

module.exports = {
  CUSTOMER_TOOLS,
  ADMIN_TOOLS,
};
