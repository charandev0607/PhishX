export const mockThreatFeed = [
    {
        id: "TR-9942-X",
        time: "10:42:05",
        type: "Credential Harvesting",
        target: "mail-update-secure.com",
        brand: "PayPal",
        status: "Blocked",
        severity: "critical",
        score: 94,
        ip: "192.168.1.104",
        location: "RU",
        urlAnalysis: [
            { part: "Protocol", value: "https://", state: "safe", note: "" },
            { part: "Subdomain", value: "paypal-security-update", state: "danger", note: "Brand impersonation" },
            { part: "Domain", value: "verify.com", state: "warning", note: "Deceptive root" },
            { part: "Path", value: "/login", state: "default", note: "" }
        ],
        aiReasoning: [
            {
                score: "98%",
                state: "danger",
                title: "Visual Similarity",
                desc: "CSS and layout matches PayPal login identical to 98.4% precision."
            },
            {
                score: "92%",
                state: "danger",
                title: "Heuristic Lexical Analysis",
                desc: "URL contains suspicious brand words 'security', 'update', 'verify'."
            },
            {
                score: "85%",
                state: "warning",
                title: "Form Action Anomalies",
                desc: "Login form submits POST to an obfuscated external PHP script."
            }
        ]
    },
    {
        id: "TR-8120-Y",
        time: "10:41:12",
        type: "Fake Login Portal",
        target: "office365-auth-verify.net",
        brand: "Microsoft",
        status: "Blocked",
        severity: "high",
        score: 88,
        ip: "45.32.112.55",
        location: "NL",
        urlAnalysis: [
            { part: "Protocol", value: "http://", state: "danger", note: "Insecure" },
            { part: "Domain", value: "office365-auth-verify.net", state: "danger", note: "Brand spoofing" },
            { part: "Path", value: "/login", state: "default", note: "" }
        ],
        aiReasoning: [
            {
                score: "95%",
                state: "danger",
                title: "Visual Similarity",
                desc: "Matches Microsoft login page."
            },
            {
                score: "70%",
                state: "warning",
                title: "SSL Certificate anomaly",
                desc: "Certificate is self-signed."
            }
        ]
    },
    {
        id: "TR-5521-Z",
        time: "10:38:44",
        type: "Suspicious Redirect",
        target: "bit.ly/3x8Mkl",
        brand: "Unknown",
        status: "Quarantined",
        severity: "medium",
        score: 65,
        ip: "10.0.0.5",
        location: "US",
        urlAnalysis: [
            { part: "Protocol", value: "https://", state: "safe", note: "" },
            { part: "Domain", value: "bit.ly", state: "warning", note: "URL Shortener" },
            { part: "Path", value: "/3x8Mkl", state: "default", note: "" }
        ],
        aiReasoning: [
            {
                score: "65%",
                state: "warning",
                title: "Redirect Chain",
                desc: "Redirects 4 times before landing on an unknown domain."
            }
        ]
    },
    {
        id: "TR-2291-A",
        time: "10:35:10",
        type: "Zero-day Phishing",
        target: "bank-america-alert.org",
        brand: "Bank of America",
        status: "Blocked",
        severity: "high",
        score: 91,
        ip: "8.8.8.8",
        location: "US",
        urlAnalysis: [
            { part: "Protocol", value: "https://", state: "safe", note: "" },
            { part: "Domain", value: "bank-america-alert.org", state: "danger", note: "Typo-squatting / Spoofing" }
        ],
        aiReasoning: [
            {
                score: "91%",
                state: "danger",
                title: "Brand Impersonation",
                desc: "Uses registered trademark terms in a non-corporate domain."
            }
        ]
    }
];

export const threatTrendData = [
    { time: "00:00", threats: 120 },
    { time: "04:00", threats: 80 },
    { time: "08:00", threats: 350 },
    { time: "12:00", threats: 600 },
    { time: "16:00", threats: 400 },
    { time: "20:00", threats: 200 },
    { time: "24:00", threats: 150 },
];

export const riskDistributionData = [
    { name: "Low", value: 400, color: "#00ff88" },
    { name: "Medium", value: 300, color: "#0066ff" },
    { name: "High", value: 200, color: "#ffb800" },
    { name: "Critical", value: 100, color: "#ff0055" },
];

export const categoryData = [
    { name: "Credential Theft", value: 55, color: "#9d00ff" },
    { name: "Malware Drop", value: 25, color: "#00f3ff" },
    { name: "Scam/Fraud", value: 15, color: "#ffb800" },
    { name: "Other", value: 5, color: "#606070" },
];
