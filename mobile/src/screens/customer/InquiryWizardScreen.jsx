import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Utensils,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Plus,
  Minus,
  AlertCircle,
  FileCheck,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import Card from "../../components/common/Card";
import LoadingState from "../../components/common/LoadingState";
import AnimatedProgressBar from "../../components/common/AnimatedProgressBar";
import AnimatedStepper from "../../components/common/AnimatedStepper";
import { useAuth } from "../../context/AuthContext";
import customerApi from "../../api/customer";
import SerratedDivider from "../../components/common/SerratedDivider";
import { BATANGAS_PROVINCE, getBatangasMunicipalities, getBatangasBarangays } from "../../utils/batangas";
import { formatCurrency, formatDate } from "../../utils/format";

const MIN_DATE_OFFSET_DAYS = 4;

export const InquiryWizardScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const preselectedPackage = route?.params?.selectedPackage || null;

  // Wizard Step: 1 = Event & Service, 2 = Date & Time, 3 = Venue & Delivery, 4 = Menu & Notes, 5 = Review & Submit
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Reference Data from Backend
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  // Form State
  const [selectedPackage, setSelectedPackage] = useState(preselectedPackage);
  const [eventType, setEventType] = useState("Birthday");
  const [celebrantName, setCelebrantName] = useState("");
  const [eventTheme, setEventTheme] = useState("");
  const [guestCount, setGuestCount] = useState(preselectedPackage?.combo_guest_count || 50);
  const [serviceType, setServiceType] = useState("Food and Event Setup");

  // Schedule
  const minSelectableDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MIN_DATE_OFFSET_DAYS);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState("12:00 PM");

  // Venue & Delivery
  const [deliveryMethod, setDeliveryMethod] = useState("setup"); // setup | delivery | pickup
  const [municipality, setMunicipality] = useState("Batangas City");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");

  // Menu Selection
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [allergies, setAllergies] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Contact Info (prefilled)
  const [contactFirstName, setContactFirstName] = useState(user?.first_name || user?.full_name?.split(" ")[0] || "");
  const [contactLastName, setContactLastName] = useState(user?.last_name || user?.full_name?.split(" ").slice(1).join(" ") || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");

  // Selection Modals
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);

  // Load available packages, menus, and blocked dates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgs, menu, adds, blocked] = await Promise.all([
          customerApi.getPackages().catch(() => []),
          customerApi.getMenu().catch(() => []),
          customerApi.getAddons().catch(() => []),
          customerApi.getBlockedDates().catch(() => []),
        ]);
        setPackages(pkgs || []);
        setMenuItems(menu || []);
        setAddons(adds || []);
        setBlockedDates((blocked || []).map((b) => (b.date ? b.date.split("T")[0] : null)).filter(Boolean));
      } catch (err) {
        console.warn("Failed to load inquiry wizard reference data", err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync package guest count if Special Offer
  useEffect(() => {
    if (selectedPackage?.combo_guest_count) {
      setGuestCount(selectedPackage.combo_guest_count);
    }
  }, [selectedPackage]);

  // Available barangays for current municipality
  const availableBarangays = useMemo(() => {
    return getBatangasBarangays(municipality);
  }, [municipality]);

  // Calculate rough estimate
  const estimatedTotal = useMemo(() => {
    let sum = 0;
    if (selectedPackage) {
      if (selectedPackage.price_per_guest) {
        sum += selectedPackage.price_per_guest * guestCount;
      } else if (selectedPackage.setup_price || selectedPackage.price) {
        sum += selectedPackage.setup_price || selectedPackage.price;
      }
    }
    selectedDishes.forEach((dish) => {
      if (dish.price && !selectedPackage?.price_per_guest) {
        sum += dish.price * guestCount;
      }
    });
    return sum;
  }, [selectedPackage, guestCount, selectedDishes]);

  // Validation per step
  const canProceed = useMemo(() => {
    if (currentStep === 1) {
      return Boolean(eventType && guestCount > 0 && serviceType);
    }
    if (currentStep === 2) {
      return Boolean(selectedDate && startTime);
    }
    if (currentStep === 3) {
      if (deliveryMethod === "pickup") return true;
      return Boolean(municipality && barangay);
    }
    if (currentStep === 4) {
      return true; // menu choices optional in inquiry, quotation finalizes it
    }
    if (currentStep === 5) {
      return Boolean(contactFirstName && contactLastName && contactEmail && contactPhone);
    }
    return true;
  }, [
    currentStep,
    eventType,
    guestCount,
    serviceType,
    selectedDate,
    startTime,
    deliveryMethod,
    municipality,
    barangay,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
  ]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitInquiry();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const toggleDishSelection = (dish) => {
    const exists = selectedDishes.some((d) => d._id === dish._id);
    if (exists) {
      setSelectedDishes(selectedDishes.filter((d) => d._id !== dish._id));
    } else {
      setSelectedDishes([...selectedDishes, dish]);
    }
  };

  const handleSubmitInquiry = async () => {
    setSubmitting(true);
    try {
      const payload = {
        package_id: selectedPackage?._id || undefined,
        booking_type: selectedPackage?.is_combo ? "special" : selectedPackage ? "regular" : "custom",
        package_name_snapshot: selectedPackage?.name || "Custom Inquired Event",
        event_type: eventType,
        celebrant_name: celebrantName,
        event_theme: eventTheme,
        event_date: selectedDate,
        start_time: startTime,
        duration_hours: 4,
        guest_count: guestCount,
        service_type: serviceType,
        include_food: serviceType !== "Event Setup Only",
        delivery_method: deliveryMethod,
        province: deliveryMethod !== "pickup" ? BATANGAS_PROVINCE : undefined,
        municipality: deliveryMethod !== "pickup" ? municipality : undefined,
        barangay: deliveryMethod !== "pickup" ? barangay : undefined,
        street: deliveryMethod !== "pickup" ? street : undefined,
        landmark: deliveryMethod !== "pickup" ? landmark : undefined,
        selected_menu: selectedDishes.map((d) => d._id),
        allergies,
        dietary_restrictions: allergies,
        special_requests: specialRequests,
        estimated_total: estimatedTotal,
        contact_first_name: contactFirstName.trim(),
        contact_last_name: contactLastName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        contact_phone: contactPhone.trim(),
        contact_method: "Phone",
      };

      const result = await customerApi.submitInquiry(payload);

      Alert.alert(
        "Inquiry Submitted! 🎉",
        `Your catering request has been received (Ref: ${result.reference || "INQ"}). Our event manager will review it and dispatch your official quotation shortly.`,
        [
          {
            text: "View My Inquiries",
            onPress: () => navigation.navigate("InquiriesList"),
          },
        ]
      );
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Unable to submit your inquiry. Please check your entries.";
      Alert.alert("Submission Failed", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <Header title="Event Inquiry" onBack={() => navigation.goBack()} />
        <LoadingState message="Preparing booking wizard..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={`Step ${currentStep} of 5`}
        subtitle={
          currentStep === 1
            ? "Event & Service Type"
            : currentStep === 2
            ? "Date & Time Schedule"
            : currentStep === 3
            ? "Venue & Location"
            : currentStep === 4
            ? "Menu & Preferences"
            : "Review & Submit"
        }
        onBack={handleBack}
      />

      {/* Stepper Progress Bar */}
      <AnimatedProgressBar currentStep={currentStep} totalSteps={5} height={4} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: EVENT & SERVICE TYPE */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>What are you celebrating?</Text>
            <Text style={styles.stepSubtitle}>Select your event type, service requirements, and guest count.</Text>

            {/* Event Type Grid */}
            <View style={styles.typeGrid}>
              {["Wedding", "Birthday", "Debut", "Corporate", "Anniversary", "Christening"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeCard, eventType === type && styles.typeCardActive]}
                  onPress={() => setEventType(type)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeCardText, eventType === type && styles.typeCardTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput
              label="Celebrant / Honoree Name (Optional)"
              placeholder="e.g. Maria Clara or John & Jane"
              value={celebrantName}
              onChangeText={setCelebrantName}
            />

            <AppInput
              label="Event Theme or Color Palette (Optional)"
              placeholder="e.g. Rustic Navy & Gold"
              value={eventTheme}
              onChangeText={setEventTheme}
            />

            {/* Service Type Selection */}
            <Text style={styles.fieldLabel}>Service Scope</Text>
            {["Food and Event Setup", "Food Only", "Event Setup Only"].map((service) => (
              <TouchableOpacity
                key={service}
                style={[styles.serviceOption, serviceType === service && styles.serviceOptionActive]}
                onPress={() => setServiceType(service)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, serviceType === service && styles.radioCircleActive]}>
                  {serviceType === service && <View style={styles.radioDot} />}
                </View>
                <View style={styles.serviceTextWrapper}>
                  <Text style={[styles.serviceTitle, serviceType === service && styles.serviceTitleActive]}>
                    {service}
                  </Text>
                  <Text style={styles.serviceDesc}>
                    {service === "Food and Event Setup"
                      ? "Complete dining, tables, chairs, decorations, and waitstaff"
                      : service === "Food Only"
                      ? "Packed or buffet food delivery ready to serve"
                      : "Tables, chairs, tents, backdrop, and styling without catering"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Guest Counter */}
            <Text style={styles.fieldLabel}>Estimated Guest Count</Text>
            <AnimatedStepper
              value={guestCount}
              onChange={setGuestCount}
              min={10}
              max={2000}
              step={5}
              unit="Guests"
              size="lg"
              disabled={Boolean(selectedPackage?.combo_guest_count)}
              style={{ marginVertical: spacing.sm, alignSelf: "flex-start" }}
            />
            {selectedPackage?.combo_guest_count ? (
              <Text style={styles.helperNote}>* Guest count is fixed for this combo special offer.</Text>
            ) : null}
          </View>
        )}

        {/* STEP 2: DATE & TIME SCHEDULE (Glovo style) */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>When is your event?</Text>
            <Text style={styles.stepSubtitle}>
              Catering requires at least {MIN_DATE_OFFSET_DAYS} days advance preparation for kitchen & logistics.
            </Text>

            {/* Quick Date Presets Strip (Glovo style) */}
            <Text style={styles.fieldLabel}>Suggested Dates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCardsScroll}>
              {[4, 5, 6, 7, 14, 21].map((offset) => {
                const targetD = new Date();
                targetD.setDate(targetD.getDate() + offset);
                const iso = targetD.toISOString().split("T")[0];
                const dayName = targetD.toLocaleDateString("en-US", { weekday: "short" });
                const dateNum = targetD.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const isSelected = selectedDate === iso;

                return (
                  <TouchableOpacity
                    key={offset}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => setSelectedDate(iso)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.dateCardRadio, isSelected && styles.dateCardRadioActive]}>
                      {isSelected && <View style={styles.dateCardRadioDot} />}
                    </View>
                    <Text style={[styles.dateCardDay, isSelected && styles.dateCardTextActive]}>{dayName}</Text>
                    <Text style={[styles.dateCardDate, isSelected && styles.dateCardTextActive]}>{dateNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <AppInput
              label="Or Enter Specific Event Date (YYYY-MM-DD)"
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="e.g. 2026-09-20"
              leftIcon={Calendar}
            />

            <View style={styles.dateHintCard}>
              <AlertCircle size={18} color={colors.primary} />
              <Text style={styles.dateHintText}>
                Earliest available reservation: {formatDate(minSelectableDate)}
              </Text>
            </View>

            {/* Time Slot Picker */}
            <Text style={styles.fieldLabel}>Preferred Start Time</Text>
            <View style={styles.timeGrid}>
              {["10:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, startTime === time && styles.timeChipActive]}
                  onPress={() => setStartTime(time)}
                  activeOpacity={0.7}
                >
                  <Clock size={13} color={startTime === time ? colors.white : colors.foreground} style={{ marginRight: 4 }} />
                  <Text style={[styles.timeChipText, startTime === time && styles.timeChipTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 3: VENUE & DELIVERY */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>Where is the celebration?</Text>
            <Text style={styles.stepSubtitle}>We serve all municipalities across Batangas province.</Text>

            {/* Delivery Method */}
            <Text style={styles.fieldLabel}>Fulfillment Method</Text>
            <View style={styles.deliveryRow}>
              {[
                { id: "setup", label: "On-site Setup", desc: "Our team delivers and sets up" },
                { id: "delivery", label: "Drop-off Delivery", desc: "Food delivered to venue" },
                { id: "pickup", label: "Customer Pick-up", desc: "Pick up at catering HQ" },
              ].map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.deliveryOption, deliveryMethod === method.id && styles.deliveryOptionActive]}
                  onPress={() => setDeliveryMethod(method.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.deliveryLabel, deliveryMethod === method.id && styles.deliveryLabelActive]}>
                    {method.label}
                  </Text>
                  <Text style={styles.deliveryDesc}>{method.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {deliveryMethod !== "pickup" && (
              <View style={{ marginTop: spacing.md }}>
                {/* Municipality Selector */}
                <Text style={styles.inputLabel}>Batangas Municipality</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowMunicipalityPicker(true)}
                  activeOpacity={0.7}
                >
                  <MapPin size={18} color={colors.primary} />
                  <Text style={styles.selectBoxText}>{municipality || "Select Municipality"}</Text>
                  <ChevronRight size={18} color={colors.foregroundMuted} />
                </TouchableOpacity>

                {/* Barangay Selector */}
                <Text style={styles.inputLabel}>Barangay</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowBarangayPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectBoxText}>{barangay || "Select Barangay"}</Text>
                  <ChevronRight size={18} color={colors.foregroundMuted} />
                </TouchableOpacity>

                <AppInput
                  label="Street Address / Venue Name"
                  placeholder="e.g. Villa Mercedes Events Place, Brgy. Road"
                  value={street}
                  onChangeText={setStreet}
                />

                <AppInput
                  label="Landmark (Optional)"
                  placeholder="e.g. Near San Jose Church or Shell Station"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>
            )}
          </View>
        )}

        {/* STEP 4: MENU & PREFERENCES */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepTitle}>Menu & Dining Choices</Text>
            <Text style={styles.stepSubtitle}>
              Select favorite dishes or let the manager build your banquet. Quotation includes full tasting breakdown.
            </Text>

            {menuItems.length > 0 && (
              <View style={styles.menuList}>
                <Text style={styles.fieldLabel}>Featured Catalog Dishes ({selectedDishes.length} selected)</Text>
                {menuItems.slice(0, 8).map((dish) => {
                  const isSelected = selectedDishes.some((d) => d._id === dish._id);
                  return (
                    <TouchableOpacity
                      key={dish._id}
                      style={[styles.dishItem, isSelected && styles.dishItemActive]}
                      onPress={() => toggleDishSelection(dish)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dishCheckbox, isSelected && styles.dishCheckboxActive]}>
                        {isSelected && <Check size={14} color={colors.white} />}
                      </View>
                      <View style={styles.dishInfo}>
                        <Text style={styles.dishName}>{dish.name}</Text>
                        <Text style={styles.dishCategory}>{dish.category || "Main Dish"}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <AppInput
              label="Allergies & Dietary Restrictions"
              placeholder="e.g. No seafood, 5 vegetarians, peanut allergy"
              value={allergies}
              onChangeText={setAllergies}
              multiline
              numberOfLines={2}
            />

            <AppInput
              label="Special Instructions & Requests"
              placeholder="e.g. Extra serving spoons, VIP table styling"
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {/* STEP 5: REVIEW & CONTACT */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.stepTitle}>Review & Submit Inquiry</Text>
            <Text style={styles.stepSubtitle}>
              Please verify your contact details. Our manager will send your official quotation to this email.
            </Text>

            {/* Summary Card */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryHeading}>Event Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Event:</Text>
                <Text style={styles.summaryValue}>{eventType} ({guestCount} Guests)</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Schedule:</Text>
                <Text style={styles.summaryValue}>{formatDate(selectedDate)} at {startTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service:</Text>
                <Text style={styles.summaryValue}>{serviceType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={styles.summaryValue}>
                  {deliveryMethod === "pickup" ? "Customer Pick-up" : `${barangay}, ${municipality}`}
                </Text>
              </View>

              {estimatedTotal > 0 && (
                <>
                  <SerratedDivider color={colors.background} style={{ marginVertical: spacing.sm }} />
                  <View style={[styles.summaryRow, styles.estimateRow]}>
                    <Text style={styles.estimateLabel}>Estimated Total:</Text>
                    <Text style={styles.estimateValue}>{formatCurrency(estimatedTotal)}</Text>
                  </View>
                </>
              )}
            </Card>

            <Text style={styles.fieldLabel}>Contact Information</Text>
            <AppInput
              label="First Name"
              value={contactFirstName}
              onChangeText={setContactFirstName}
            />
            <AppInput
              label="Last Name"
              value={contactLastName}
              onChangeText={setContactLastName}
            />
            <AppInput
              label="Email Address"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
            />
            <AppInput
              label="Phone Number"
              placeholder="09171234567"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Bar (Glovo Dual Pill Buttons) */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {currentStep > 1 && (
          <AppButton
            title="Back"
            variant="secondary"
            onPress={handleBack}
            size="lg"
            style={styles.backActionBtn}
          />
        )}
        <AppButton
          title={currentStep === 5 ? "Submit Catering Inquiry" : "Continue"}
          onPress={handleNext}
          disabled={!canProceed}
          loading={submitting}
          size="lg"
          style={styles.actionBtn}
        />
      </View>

      {/* Municipality Modal */}
      <Modal visible={showMunicipalityPicker} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Municipality</Text>
              <TouchableOpacity onPress={() => setShowMunicipalityPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {getBatangasMunicipalities().map((muni) => (
                <TouchableOpacity
                  key={muni}
                  style={styles.modalItem}
                  onPress={() => {
                    setMunicipality(muni);
                    setBarangay("");
                    setShowMunicipalityPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, municipality === muni && styles.modalItemTextActive]}>
                    {muni}
                  </Text>
                  {municipality === muni && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Barangay Modal */}
      <Modal visible={showBarangayPicker} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Barangay in {municipality}</Text>
              <TouchableOpacity onPress={() => setShowBarangayPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {availableBarangays.map((brgy) => (
                <TouchableOpacity
                  key={brgy}
                  style={styles.modalItem}
                  onPress={() => {
                    setBarangay(brgy);
                    setShowBarangayPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, barangay === brgy && styles.modalItemTextActive]}>
                    {brgy}
                  </Text>
                  {barangay === brgy && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.borderLight,
    width: "100%",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  stepTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    marginTop: 4,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  typeCard: {
    width: "31%",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  typeCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeCardText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  typeCardTextActive: {
    color: colors.primary,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  serviceOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  serviceOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginRight: spacing.sm,
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  serviceTextWrapper: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  serviceTitleActive: {
    color: colors.primary,
  },
  serviceDesc: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterDisplay: {
    alignItems: "center",
    marginHorizontal: spacing.xl,
    minWidth: 80,
  },
  counterNumber: {
    fontSize: typography.sizes.display,
    fontWeight: "800",
    color: colors.primary,
  },
  counterLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  helperNote: {
    fontSize: typography.sizes.xs,
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  dateCardsScroll: {
    paddingVertical: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  dateCard: {
    width: 86,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  dateCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  dateCardRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  dateCardRadioActive: {
    borderColor: colors.primary,
  },
  dateCardRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dateCardDay: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
    marginBottom: 2,
  },
  dateCardDate: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  dateCardTextActive: {
    color: colors.primary,
  },
  dateHintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  },
  dateHintText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginLeft: spacing.sm,
    flex: 1,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  timeChipTextActive: {
    color: colors.white,
  },
  deliveryRow: {
    marginBottom: spacing.base,
  },
  deliveryOption: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  deliveryOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  deliveryLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  deliveryLabelActive: {
    color: colors.primary,
  },
  deliveryDesc: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderWidth: 1.2,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.base,
  },
  selectBoxText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.foreground,
    marginLeft: spacing.sm,
  },
  menuList: {
    marginBottom: spacing.base,
  },
  dishItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  dishItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dishCheckbox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  dishCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  dishCategory: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  summaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryHeading: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
    maxWidth: "60%",
    textAlign: "right",
  },
  estimateRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  estimateLabel: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  estimateValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.primary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: "row",
    gap: spacing.md,
  },
  backActionBtn: {
    flex: 1,
  },
  actionBtn: {
    flex: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "75%",
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalClose: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: "700",
  },
  modalList: {
    marginVertical: spacing.sm,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
  },
  modalItemTextActive: {
    fontWeight: "700",
    color: colors.primary,
  },
});

export default InquiryWizardScreen;
