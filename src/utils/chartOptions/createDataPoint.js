export const createDatapoint = (d, categoriesAreDatesOrNumberForDataParsing) =>
  categoriesAreDatesOrNumberForDataParsing && d.metadata
    ? {
        x: d.metadata.parsedX,
        y: d.value,
        custom: { ...(d.custom || {}), ...(d.metadata || {}) },
      }
    : {
        y: d.value,
        custom: { ...(d.custom || {}), ...(d.metadata || {}) },
      };
