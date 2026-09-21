import { z } from "zod";

const optionalText = (maximum = 4000) => z.string().trim().max(maximum);

export const clientProfileSchema = z.object({
  legalName: optionalText(160),
  tradingName: optionalText(160),
  website: z.union([z.literal(""), z.string().trim().url().max(300)]),
  industry: optionalText(120),
  businessModel: optionalText(160),
  foundedYear: z.union([
    z.literal(""),
    z.coerce.number().int().min(1800).max(new Date().getUTCFullYear()),
  ]),
  companySize: optionalText(80),
  headquarters: optionalText(300),
  operatingLocations: optionalText(1000),
  timezone: optionalText(80),
  currency: z
    .string()
    .trim()
    .max(3)
    .transform((value) => value.toUpperCase()),
  ownerName: optionalText(160),
  ownerTitle: optionalText(120),
  ownerEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  ownerPhone: optionalText(40),
  primaryContactName: optionalText(160),
  primaryContactTitle: optionalText(120),
  primaryContactEmail: z.union([
    z.literal(""),
    z.string().trim().email().max(254),
  ]),
  primaryContactPhone: optionalText(40),
  productsServices: optionalText(),
  customerTypes: optionalText(),
  systemsUsed: optionalText(),
  communicationChannels: optionalText(),
  operationalChallenges: optionalText(),
  businessGoals: optionalText(),
  ownerDependencies: optionalText(),
  complianceRequirements: optionalText(),
  decisionMakingStyle: optionalText(),
  seasonality: optionalText(),
  notes: optionalText(8000),
});

export type ClientProfile = z.infer<typeof clientProfileSchema>;

export const emptyClientProfile: ClientProfile = {
  legalName: "",
  tradingName: "",
  website: "",
  industry: "",
  businessModel: "",
  foundedYear: "",
  companySize: "",
  headquarters: "",
  operatingLocations: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  ownerName: "",
  ownerTitle: "",
  ownerEmail: "",
  ownerPhone: "",
  primaryContactName: "",
  primaryContactTitle: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  productsServices: "",
  customerTypes: "",
  systemsUsed: "",
  communicationChannels: "",
  operationalChallenges: "",
  businessGoals: "",
  ownerDependencies: "",
  complianceRequirements: "",
  decisionMakingStyle: "",
  seasonality: "",
  notes: "",
};

export const acmeClientProfile: ClientProfile = {
  ...emptyClientProfile,
  legalName: "Acme Operations Private Limited",
  tradingName: "Acme Operations",
  website: "https://example.com",
  industry: "Distribution and field services",
  businessModel: "B2B service and distribution",
  foundedYear: 2014,
  companySize: "51–100 people",
  headquarters: "Bengaluru, Karnataka, India",
  operatingLocations: "Bengaluru head office and three regional dispatch hubs",
  ownerName: "Aishwarya Menon",
  ownerTitle: "Managing Director",
  ownerEmail: "aishwarya@acme.example",
  primaryContactName: "Priya Nair",
  primaryContactTitle: "Operations Administrator",
  primaryContactEmail: "priya@acme.example",
  productsServices:
    "B2B fulfilment, field installation, maintenance, and recurring service contracts.",
  customerTypes:
    "Regional retailers, multi-site operators, and enterprise buyers.",
  systemsUsed:
    "Google Workspace, Tally, WhatsApp, shared spreadsheets, and a dispatch portal.",
  communicationChannels:
    "Email for formal decisions; WhatsApp for urgent field coordination.",
  operationalChallenges:
    "Approvals depend on the owner, evidence is scattered, and handoffs are not consistently visible.",
  businessGoals:
    "Reduce owner chasing, make service commitments visible, and grow without adding management overhead.",
  ownerDependencies:
    "Purchase approvals above routine limits and exception decisions still wait for the owner.",
  complianceRequirements:
    "GST records, supplier documentation, and customer service evidence.",
  decisionMakingStyle:
    "Fast and practical, with owner review for high-impact exceptions.",
  seasonality: "Higher dispatch volume in the final week of each quarter.",
  notes:
    "Process language should remain plain and usable by mobile-first field teams.",
};

export function profileCompleteness(profile: ClientProfile) {
  const important: Array<keyof ClientProfile> = [
    "legalName",
    "industry",
    "businessModel",
    "companySize",
    "headquarters",
    "ownerName",
    "primaryContactName",
    "productsServices",
    "customerTypes",
    "systemsUsed",
    "operationalChallenges",
    "businessGoals",
    "ownerDependencies",
  ];
  const completed = important.filter((key) =>
    String(profile[key] ?? "").trim(),
  ).length;
  return Math.round((completed / important.length) * 100);
}
