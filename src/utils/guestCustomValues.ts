import { CustomFieldType } from "@prisma/client";
import dayjs from "dayjs";

export const validateCustomFieldValue = (
  fieldType: CustomFieldType,
  value: string | number | boolean
): boolean => {
  if (fieldType === CustomFieldType.TEXT) {
    return typeof value === "string" && value.trim() !== "";
  }
  if (fieldType === CustomFieldType.NUMBER) {
    return typeof value === "number" && !isNaN(value);
  }
  if (fieldType === CustomFieldType.DATE) {
    return typeof value === "string" && dayjs(value).isValid();
  }
  if (fieldType === CustomFieldType.CHECKBOX) {
    return typeof value === "boolean";
  }
  return false;
};

export const parseCustomFieldValueToValue = (
  fieldType: CustomFieldType,
  value: string
): string | number | boolean => {
  if (fieldType === CustomFieldType.TEXT) {
    return value.trim();
  }
  if (fieldType === CustomFieldType.NUMBER) {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 0 : numValue;
  }
  if (fieldType === CustomFieldType.DATE) {
    return dayjs(value).format("YYYY-MM-DD");
  }
  if (fieldType === CustomFieldType.CHECKBOX) {
    return value.toLowerCase() === "true";
  }
  return value; // Fallback for unsupported types
};

export const formatCustomFieldValueToString = (
  fieldType: CustomFieldType,
  value: string | number | boolean
): string => {
  if (fieldType === CustomFieldType.TEXT) {
    return String(value);
  }
  if (fieldType === CustomFieldType.NUMBER) {
    return String(value);
  }
  if (fieldType === CustomFieldType.DATE) {
    if (typeof value === "string") {
      return value;
    } else {
      throw new Error("Invalid date value");
    }
  }
  if (fieldType === CustomFieldType.CHECKBOX) {
    return value ? "true" : "false";
  }
  return String(value); // Fallback for unsupported types
};
