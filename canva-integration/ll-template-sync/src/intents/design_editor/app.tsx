import React, { useState } from "react";
import {
  Button,
  Rows,
  Text,
  Title,
  FormField,
  TextInput,
  Select,
  Alert,
  Box,
  Columns,
  Column,
  MultilineInput,
  Checkbox,
  CheckboxGroup,
} from "@canva/app-ui-kit";
import "@canva/app-ui-kit/styles.css";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SYNC_ENDPOINT =
  "https://us-central1-luxury-listings-portal-e56de.cloudfunctions.net/syncCanvaTemplate";

// Template type options
const TEMPLATE_TYPES = [
  { value: "instagram_feed", label: "Instagram Feed (1080x1080)" },
  { value: "instagram_story", label: "Instagram Story (1080x1920)" },
  { value: "instagram_reel_cover", label: "Reel Cover (1080x1920)" },
  { value: "facebook_post", label: "Facebook Post (1200x630)" },
  { value: "linkedin_post", label: "LinkedIn Post (1200x627)" },
  { value: "twitter_post", label: "Twitter/X Post (1600x900)" },
];

// Available placeholders for property templates
const AVAILABLE_PLACEHOLDERS = [
  { id: "address", label: "Address", description: "Full property address" },
  { id: "price", label: "Price", description: "Listing price" },
  { id: "beds", label: "Beds", description: "Number of bedrooms" },
  { id: "baths", label: "Baths", description: "Number of bathrooms" },
  { id: "sqft", label: "Sqft", description: "Square footage" },
  { id: "city", label: "City", description: "City name" },
  { id: "state", label: "State", description: "State/Province" },
  { id: "zip", label: "ZIP", description: "ZIP/Postal code" },
  { id: "heroImage", label: "Hero Image", description: "Main property photo" },
  { id: "agent_name", label: "Agent Name", description: "Listing agent" },
  { id: "agent_phone", label: "Agent Phone", description: "Agent phone number" },
  { id: "brokerage", label: "Brokerage", description: "Brokerage name" },
  { id: "logoUrl", label: "Logo", description: "Client/brokerage logo" },
  { id: "tagline", label: "Tagline", description: "Marketing tagline" },
];

// =============================================================================
// TYPES
// =============================================================================

interface SyncStatus {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  templateId?: string;
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export const App = () => {
  // Form state
  const [clientName, setClientName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("instagram_feed");
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<string[]>([]);
  const [designNotes, setDesignNotes] = useState("");

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: "idle" });

  /**
   * Toggle a placeholder selection
   */
  const togglePlaceholder = (id: string) => {
    setSelectedPlaceholders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  /**
   * Select common property placeholders
   */
  const selectPropertyDefaults = () => {
    setSelectedPlaceholders(["address", "price", "beds", "baths", "sqft", "heroImage"]);
  };

  /**
   * Sync template to Luxury Listings backend
   */
  const syncTemplate = async () => {
    // Validate form
    if (!clientName.trim()) {
      setSyncStatus({ status: "error", message: "Please enter a client name." });
      return;
    }

    if (!templateName.trim()) {
      setSyncStatus({ status: "error", message: "Please enter a template name." });
      return;
    }

    if (selectedPlaceholders.length === 0) {
      setSyncStatus({ status: "error", message: "Please select at least one placeholder." });
      return;
    }

    setSyncStatus({ status: "loading", message: "Syncing template..." });

    try {
      const payload = {
        client_name: clientName.trim(),
        template_name: templateName.trim(),
        template_type: templateType,
        canva_design_id: "canva_" + Date.now(),
        elements: [], // Could be expanded later
        placeholders: selectedPlaceholders,
        design_notes: designNotes.trim(),
        synced_at: new Date().toISOString(),
      };

      const response = await fetch(SYNC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      const result = await response.json();

      setSyncStatus({
        status: "success",
        message: `Template synced!`,
        templateId: result.template_id,
      });
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      });
    }
  };

  /**
   * Reset form after successful sync
   */
  const resetForm = () => {
    setClientName("");
    setTemplateName("");
    setSelectedPlaceholders([]);
    setDesignNotes("");
    setSyncStatus({ status: "idle" });
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  // Success state
  if (syncStatus.status === "success") {
    return (
      <div style={{ padding: "16px", height: "100%", overflow: "auto" }}>
        <Rows spacing="3u">
          <Box padding="3u" background="positiveLight" borderRadius="standard">
            <Rows spacing="2u">
              <Title size="medium">✓ Template Synced!</Title>
              <Text>
                <strong>{templateName}</strong> for <strong>{clientName}</strong> has been saved.
              </Text>
              {syncStatus.templateId && (
                <Text size="small" tone="tertiary">
                  Template ID: {syncStatus.templateId}
                </Text>
              )}
            </Rows>
          </Box>

          <Box padding="2u" background="neutralLow" borderRadius="standard">
            <Rows spacing="1u">
              <Text weight="bold">Next Steps:</Text>
              <Text size="small">
                1. Export this design as an image from Canva
              </Text>
              <Text size="small">
                2. Go to Luxury Listings Portal → Templates
              </Text>
              <Text size="small">
                3. Upload the exported image to your template
              </Text>
              <Text size="small">
                4. Use "Generate Design" with property data
              </Text>
            </Rows>
          </Box>

          <Button variant="secondary" onClick={resetForm} stretch>
            Sync Another Template
          </Button>
        </Rows>
      </div>
    );
  }

  // Main form
  return (
    <div style={{ padding: "16px", height: "100%", overflow: "auto" }}>
      <Rows spacing="2u">
        <Title size="medium">Template Sync</Title>

        <Text size="small" tone="tertiary">
          Register this Canva design as a template for automated post generation.
        </Text>

        {/* Error Alert */}
        {syncStatus.status === "error" && (
          <Alert tone="critical">{syncStatus.message}</Alert>
        )}

        {/* Loading Alert */}
        {syncStatus.status === "loading" && (
          <Alert tone="info">{syncStatus.message}</Alert>
        )}

        {/* Client Name */}
        <FormField label="Client Name" description="Must match client in portal">
          <TextInput
            value={clientName}
            onChange={(value) => setClientName(value)}
            placeholder="e.g., Emil Hartoonian"
          />
        </FormField>

        {/* Template Name */}
        <FormField label="Template Name">
          <TextInput
            value={templateName}
            onChange={(value) => setTemplateName(value)}
            placeholder="e.g., Just Listed - Modern Dark"
          />
        </FormField>

        {/* Template Type */}
        <FormField label="Format">
          <Select
            value={templateType}
            onChange={(value) => setTemplateType(value)}
            options={TEMPLATE_TYPES}
          />
        </FormField>

        {/* Placeholders Section */}
        <Box padding="2u" background="neutralLow" borderRadius="standard">
          <Rows spacing="2u">
            <Columns spacing="1u">
              <Column>
                <Text weight="bold">Placeholders Used</Text>
              </Column>
              <Column width="content">
                <Button variant="tertiary" onClick={selectPropertyDefaults}>
                  Select Defaults
                </Button>
              </Column>
            </Columns>

            <Text size="small" tone="tertiary">
              Check the fields this template displays:
            </Text>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {AVAILABLE_PLACEHOLDERS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => togglePlaceholder(p.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: selectedPlaceholders.includes(p.id)
                      ? "var(--ui-kit-color-primary)"
                      : "var(--ui-kit-color-surface)",
                    color: selectedPlaceholders.includes(p.id)
                      ? "white"
                      : "inherit",
                    border: "1px solid var(--ui-kit-color-border)",
                    fontSize: "13px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>

            {selectedPlaceholders.length > 0 && (
              <Text size="small">
                Selected: {selectedPlaceholders.join(", ")}
              </Text>
            )}
          </Rows>
        </Box>

        {/* Design Notes */}
        <FormField label="Notes (optional)" description="Any special instructions">
          <MultilineInput
            value={designNotes}
            onChange={(value) => setDesignNotes(value)}
            placeholder="e.g., Use dark overlay for luxury properties"
          />
        </FormField>

        {/* Sync Button */}
        <Button
          variant="primary"
          onClick={syncTemplate}
          disabled={syncStatus.status === "loading"}
          stretch
        >
          {syncStatus.status === "loading" ? "Syncing..." : "Sync Template"}
        </Button>

        {/* Help */}
        <Text size="small" tone="tertiary" alignment="center">
          Template will be linked to client in Luxury Listings Portal
        </Text>
      </Rows>
    </div>
  );
};
