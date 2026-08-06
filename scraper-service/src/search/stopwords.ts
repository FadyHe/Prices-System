// High-frequency function words / filler units only. Deliberately does NOT
// include units like "جرام"/"كيلو"/"مل"/"سم" — those are meaningful tokens
// in queries like "كابل شاحن 2 متر" / "زيت 1 لتر" and were over-filtering
// real product terms. No duplicates.
export const STOPWORDS = [
  "من",
  "في",
  "على",
  "مع",
  "الى",
  "إلى",
  "ال",
  "عدد",
  "عرض",
  "خاص",
  "قطعتين",
  "مجانا",
  "مجموعة",
  "عبوة",
  "تعمل",
  "قابلة"
];
