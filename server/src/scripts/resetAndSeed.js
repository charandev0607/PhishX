import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { AuditLog } from "../models/AuditLog.js";
import { Incident } from "../models/Incident.js";
import { Policy } from "../models/Policy.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { ReportedLink } from "../models/ReportedLink.js";

const incidentFixtures = [
  {
    type: "url",
    input: "https://paypal-security-update-verify.com/login",
    score: 94,
    status: "phishing",
    reasons: [
      "Domain visually impersonates trusted brand",
      "Credential form posts to unknown endpoint",
      "Recently registered domain",
    ],
    metadata: { location: "RU", country: "RU" },
  },
  {
    type: "email",
    input: "URGENT: Account suspension notice",
    score: 88,
    status: "phishing",
    reasons: ["Urgency language detected", "Suspicious login verification request"],
    metadata: { location: "US", country: "US" },
  },
  {
    type: "url",
    input: "https://microsoft-login-identity-check.net/auth",
    score: 79,
    status: "phishing",
    reasons: ["Brand spoofing pattern detected"],
    metadata: { location: "NL", country: "NL" },
  },
  {
    type: "webpage",
    input: "Landing page with obfuscated script payload",
    score: 67,
    status: "suspicious",
    reasons: ["Obfuscated JavaScript detected", "Hidden iframe found"],
    metadata: { location: "DE", country: "DE" },
  },
  {
    type: "email",
    input: "Verify payroll bank details",
    score: 73,
    status: "phishing",
    reasons: ["Credential harvesting language", "External shortened links"],
    metadata: { location: "IN", country: "IN" },
  },
  {
    type: "url",
    input: "https://cdn.docs.company-example.org/public/report",
    score: 28,
    status: "safe",
    reasons: ["No strong phishing signals detected"],
    metadata: { location: "SG", country: "SG" },
  },
  {
    type: "webpage",
    input: "Embedded payment form with external post action",
    score: 81,
    status: "phishing",
    reasons: ["Sensitive form posts to untrusted domain"],
    metadata: { location: "BR", country: "BR" },
  },
  {
    type: "email",
    input: "Meeting notes and attachment",
    score: 36,
    status: "safe",
    reasons: ["No urgent social engineering markers"],
    metadata: { location: "CA", country: "CA" },
  },
  {
    type: "url",
    input: "https://bit.ly/3x8Mkl",
    score: 61,
    status: "suspicious",
    reasons: ["Redirect chain indicates cloaking"],
    metadata: { location: "US", country: "US" },
  },
  {
    type: "webpage",
    input: "Finance portal clone screenshot match",
    score: 90,
    status: "phishing",
    reasons: ["Visual model similarity > 95%"],
    metadata: { location: "GB", country: "GB" },
  },
  {
    type: "email",
    input: "Action required: reset password",
    score: 69,
    status: "suspicious",
    reasons: ["Password reset coercion language"],
    metadata: { location: "AU", country: "AU" },
  },
  {
    type: "url",
    input: "http://office365-auth-verify.net/login",
    score: 86,
    status: "phishing",
    reasons: ["Non-HTTPS auth form", "Lookalike enterprise identity domain"],
    metadata: { location: "FR", country: "FR" },
  },
];

const withTimeline = incidentFixtures.flatMap((incident, index) => {
  const createdAt = new Date(Date.now() - index * 6 * 60 * 60 * 1000);
  return [{ ...incident, createdAt }];
});

const seed = async () => {
  await connectDB();

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@phishx.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMeStrong123!";

  const usersToCreate = [
    {
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: "admin",
      failedAttempts: 0,
      lockUntil: null,
      refreshTokenHash: null,
    },
    {
      email: "analyst1@phishx.local",
      password: await bcrypt.hash("AnalystPass123!", 10),
      role: "analyst",
      failedAttempts: 0,
      lockUntil: null,
      refreshTokenHash: null,
    },
    {
      email: "analyst2@phishx.local",
      password: await bcrypt.hash("AnalystPass123!", 10),
      role: "analyst",
      failedAttempts: 0,
      lockUntil: null,
      refreshTokenHash: null,
    },
  ];

  await Session.deleteMany({});
  await AuditLog.deleteMany({});
  await Incident.deleteMany({});
  await User.deleteMany({});
  await ReportedLink.deleteMany({});
  await Policy.deleteMany({});

  const createdUsers = await User.insertMany(usersToCreate);
  const createdIncidents = await Incident.insertMany(withTimeline);

  const policy = await Policy.create({
    key: "default",
    autoBlockThreshold: 70,
    autoQuarantine: true,
    requireMfaForAdmins: true,
    notifyOnCritical: true,
    maxAlertsPerMinute: 100,
  });

  const adminUser = createdUsers.find((item) => item.role === "admin");
  await AuditLog.create({
    userId: adminUser._id,
    action: "seed:reset-and-prepopulate",
    ip: "127.0.0.1",
    metadata: {
      usersSeeded: createdUsers.length,
      incidentsSeeded: createdIncidents.length,
      policyKey: policy.key,
    },
  });

  console.log("Database reset and seeded successfully.");
  console.log(`Users: ${createdUsers.length}`);
  console.log(`Incidents: ${createdIncidents.length}`);
  console.log(`Policy: ${policy.key}`);
  console.log("Login credentials:");
  console.log(`- Admin: ${adminEmail} / ${adminPassword}`);
  console.log("- Analyst: analyst1@phishx.local / AnalystPass123!");
  console.log("- Analyst: analyst2@phishx.local / AnalystPass123!");
};

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
