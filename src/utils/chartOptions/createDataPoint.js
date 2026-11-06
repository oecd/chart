export const createDatapoint = (d, categoriesAreDatesOrNumberForDataParsing) =>
  categoriesAreDatesOrNumberForDataParsing && d.metadata
    ? {
        x: d.metadata.parsedX,
        y: d.value,
        custom: { ...(d.custom || null), ...(d.metadata || null) },
      }
    : {
        y: d.value,
        custom: { ...(d.custom || null), ...(d.metadata || null) },
      };
