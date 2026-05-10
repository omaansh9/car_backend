const escapePdfText = value =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const formatDate = value =>
  new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const formatAmount = value =>
  `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const writeText = (text, x, y, size = 11) =>
  `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET\n`;

const line = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S\n`;

const buildInvoicePdf = booking => {
  const car = booking.carId || {};
  const user = booking.userId || {};
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const invoiceDate = formatDate(booking.paidAt || booking.updatedAt || booking.createdAt || new Date());

  const rows = [
    ["Invoice No.", booking._id],
    ["Invoice Date", invoiceDate],
    ["Customer", user.name || "Customer"],
    ["Email", user.email || "Not available"],
    ["Booking Status", booking.status],
    ["Payment Status", booking.paymentStatus],
    ["Payment Intent", booking.stripePaymentIntentId || "Not available"],
    ["Charge ID", booking.stripeChargeId || "Not available"],
    ["Vehicle", `${car.brand || ""} ${car.model || ""} ${car.name ? `(${car.name})` : ""}`.trim()],
    ["Pickup Date", formatDate(booking.startDate)],
    ["Return Date", formatDate(booking.endDate)],
    ["Duration", `${days} day${days === 1 ? "" : "s"}`],
    ["Daily Rate", formatAmount(car.pricePerDay || booking.totalPrice / Math.max(days, 1))],
    ["Total Paid", formatAmount(booking.totalPrice)],
  ];

  let content = "";
  content += "0.10 w\n";
  content += writeText("LuxeDrive", 50, 790, 22);
  content += writeText("Formal Payment Invoice", 50, 762, 16);
  content += writeText("Thank you for your payment. Your booking has been confirmed.", 50, 738, 10);
  content += line(50, 724, 545, 724);

  let y = 696;
  rows.forEach(([label, value]) => {
    content += writeText(label, 62, y, 10);
    content += writeText(value, 210, y, 10);
    y -= 24;
  });

  content += line(50, y + 8, 545, y + 8);
  content += writeText("Amount Received", 62, y - 20, 12);
  content += writeText(formatAmount(booking.totalPrice), 390, y - 20, 14);
  content += writeText("This is a computer-generated invoice.", 50, 70, 9);
  content += writeText("LuxeDrive Car Rentals", 50, 54, 9);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

module.exports = buildInvoicePdf;
