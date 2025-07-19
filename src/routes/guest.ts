import express from "express";
import authMiddleware from "../middlewares/authMiddlewre";
import partyValidationMiddleware from "../middlewares/partyValidationMiddleware";
import {
  deletePartyCustomField,
  getCustomFieldsByIds,
  getPartyCustomFields,
  setCustomFieldValue,
  updatePartyCustomFields,
} from "../controllers/guestsController";
import { CustomFieldType } from "@prisma/client";
import { CUSTOM_FIELD_TYPES } from "../constants/guest";
import { validateCustomFieldValue } from "../utils/guestCustomValues";

const router = express();

router.use(authMiddleware);

router.get(
  "/:partyId/customFields",
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    try {
      const customFields = await getPartyCustomFields(partyId);
      res.json(customFields);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom fields" });
    }
  }
);

router.put(
  "/:partyId/customFields",
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    const customFields = req.body.customFields;
    if (!Array.isArray(customFields) || customFields.length === 0) {
      res.status(400).json({ error: "Invalid custom fields data" });
      return;
    }
    try {
      const validFields = customFields.every(
        (field: Record<string, unknown>) =>
          field.field_name &&
          field.field_type &&
          typeof field.field_name === "string" &&
          typeof field.field_type === "string" &&
          CUSTOM_FIELD_TYPES.includes(field.field_type)
      );
      if (!validFields) {
        res.status(400).json({ error: "Invalid custom fields data" });
        return;
      }
      const updatedFields = await updatePartyCustomFields(
        partyId,
        customFields
      );
      res.json(updatedFields);
    } catch (error) {
      console.error("Error updating custom fields:", error);
      res.status(500).json({ error: "Failed to update custom fields" });
    }
  }
);

router.delete(
  "/:partyId/customFields/:customFieldId",
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    const customFieldId = parseInt(req.params.customFieldId);
    if (!partyId || isNaN(partyId) || !customFieldId || isNaN(customFieldId)) {
      res.status(400).json({ error: "Invalid party or custom field ID" });
      return;
    }
    try {
      const deleted = await deletePartyCustomField(partyId, customFieldId);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Custom field not found" });
      }
    } catch (error) {
      console.error("Error deleting custom field:", error);
      res.status(500).json({ error: "Failed to delete custom field" });
    }
  }
);

router.put(
  "/:partyId/customFields/:guestId",
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    const guestId = parseInt(req.params.guestId);
    const customFields = req.body.customFields;
    if (!Array.isArray(customFields) || customFields.length === 0) {
      res.status(400).json({ error: "Invalid custom fields data" });
      return;
    }
    try {
      const validFields = customFields.every(
        (field: Record<string, unknown>) =>
          !!field.field_id &&
          !!field.field_value &&
          typeof field.field_id === "number" &&
          typeof field.field_value === "string"
      );
      if (!validFields) {
        res.status(400).json({ error: "Invalid custom fields data" });
        return;
      }
      const fields = await getCustomFieldsByIds(
        customFields.map((field) => field.field_id)
      );
      const updatedFields = await Promise.all(
        customFields.map(async (field) => {
          const customField = fields.find((f) => f.field_id === field.field_id);
          if (!customField) {
            throw new Error(`Custom field with ID ${field.field_id} not found`);
          }
          if (
            !validateCustomFieldValue(
              customField.field_type as CustomFieldType,
              field.field_value
            )
          ) {
            throw new Error(
              `Invalid value for field ${customField.field_name}`
            );
          }
          return await setCustomFieldValue(
            customField.field_id,
            customField.field_type as CustomFieldType,
            guestId,
            field.field_value
          );
        })
      );

      res.json(updatedFields);
    } catch (error) {
      console.error("Error updating custom fields for guest:", error);
      res
        .status(500)
        .json({ error: "Failed to update custom fields for guest" });
    }
  }
);

export default router;
