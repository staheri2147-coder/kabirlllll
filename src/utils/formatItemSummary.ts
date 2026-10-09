import { toPersianDigits } from './jalali';

/**
 * Helper to format a compact item description for delivery/loadings.
 * Example requested format: "۱۰ متر ۱۱۰ - ۱۶ بار PE100"
 */
export function formatCompactItemSummary(
  quantityMeters: number,
  item?: {
    size?: string;
    pressure?: string;
    type?: string;
    product_spec?: string;
    product_name?: string;
  }
): string {
  const qtyNumber = Number(quantityMeters || 0);
  const qtyStr = `${toPersianDigits(qtyNumber.toLocaleString('en-US'))} متر`;

  if (!item) {
    return qtyStr;
  }

  let size = item.size?.trim();
  let pressure = item.pressure?.trim();
  let type = item.type?.trim();

  // If size, pressure, or type are not directly set, try extracting from product_spec / product_name
  const text = `${item.product_spec || ''} ${item.product_name || ''}`;

  if (!size && text) {
    const sizeMatch = text.match(/(?:سایز\s*|size\s*|^|\s)(\d{2,4})(?:\s*mm|\s*میلی|\s*اینچ|\s|\b)/i);
    if (sizeMatch) {
      size = sizeMatch[1];
    }
  }

  if (!pressure && text) {
    const pressureMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:بار|bar|pn\s*\d+)/i);
    if (pressureMatch) {
      pressure = pressureMatch[1];
    }
  }

  if (!type && text) {
    const typeMatch = text.match(/(PE\s*100|PE\s*80|PE100|PE80)/i);
    if (typeMatch) {
      type = typeMatch[1].replace(/\s+/g, '');
    }
  }

  // Extract pure size
  let sizePart = '';
  if (size) {
    const numMatch = size.match(/\d+/);
    sizePart = numMatch ? toPersianDigits(numMatch[0]) : toPersianDigits(size);
  }

  // Extract pressure and format as "X بار"
  let pressurePart = '';
  if (pressure) {
    const numMatch = pressure.match(/\d+(?:\.\d+)?/);
    pressurePart = numMatch
      ? `${toPersianDigits(numMatch[0])} بار`
      : (pressure.includes('بار') ? toPersianDigits(pressure) : `${toPersianDigits(pressure)} بار`);
  }

  // Type (PE100, PE80, etc.)
  let typePart = '';
  if (type) {
    typePart = type.toUpperCase();
  }

  // Combine specs (pressure + type)
  const specParts = [pressurePart, typePart].filter(Boolean);

  if (sizePart && specParts.length > 0) {
    return `${qtyStr} ${sizePart} - ${specParts.join(' ')}`;
  } else if (sizePart) {
    return `${qtyStr} ${sizePart}`;
  } else if (specParts.length > 0) {
    return `${qtyStr} - ${specParts.join(' ')}`;
  } else if (item.product_spec) {
    return `${qtyStr} - ${toPersianDigits(item.product_spec)}`;
  } else if (item.product_name) {
    return `${qtyStr} ${toPersianDigits(item.product_name)}`;
  }

  return qtyStr;
}

