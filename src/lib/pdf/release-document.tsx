import {
  Document,
  Page,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Text,
  View,
} from "@react-pdf/renderer";
const styles = StyleSheet.create({
  page: {
    padding: 44,
    fontFamily: "Helvetica",
    color: "#17324d",
    fontSize: 10,
    lineHeight: 1.55,
  },
  cover: { backgroundColor: "#17324d", color: "#ffffff", padding: 52 },
  brand: { fontSize: 13, fontWeight: 700, letterSpacing: 1.2 },
  eyebrow: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: "#1f6d62",
    marginBottom: 10,
  },
  coverEyebrow: {
    color: "#74d1bf",
    fontSize: 10,
    letterSpacing: 1.6,
    marginTop: 110,
  },
  title: { fontSize: 30, fontWeight: 700, lineHeight: 1.15 },
  subtitle: { fontSize: 14, marginTop: 12, color: "#dbe8ec" },
  meta: {
    marginTop: 70,
    borderTopWidth: 1,
    borderTopColor: "#476172",
    paddingTop: 20,
  },
  metaRow: { flexDirection: "row", marginBottom: 12 },
  metaLabel: { width: 130, color: "#a9bec8" },
  heading: { fontSize: 20, fontWeight: 700, marginBottom: 20 },
  section: { marginBottom: 22 },
  body: { fontSize: 11, lineHeight: 1.65 },
  card: {
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  changeAdd: { color: "#15805d" },
  changeRemove: { color: "#bd2c3b" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#60717e",
    fontSize: 8,
  },
});
const Footer = ({ page }: { page: string }) => (
  <View style={styles.footer} fixed>
    <Text>Acme Operations · Purchase Approval v2.1</Text>
    <Text>{page}</Text>
  </View>
);
export function ReleaseDocument() {
  return (
    <Document
      title="Purchase Approval v2.1 — Process Release"
      author="Emilda Governance OS"
    >
      <Page size="A4" style={styles.cover}>
        <Text style={styles.brand}>ACME OPERATIONS</Text>
        <Text style={styles.coverEyebrow}>PROCESS RELEASE</Text>
        <Text style={styles.title}>Purchase Approval</Text>
        <Text style={styles.subtitle}>
          Version 2.1 · Effective 20 September 2026
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Process Owner</Text>
            <Text>Aishwarya Menon</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Approved by</Text>
            <Text>Aishwarya Menon</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Guardian</Text>
            <Text>Vishnu Rao</Text>
          </View>
        </View>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>WHY THIS PROCESS EXISTS</Text>
        <Text style={styles.heading}>Fast approval with visible control</Text>
        <View style={styles.section}>
          <Text style={styles.cardTitle}>Purpose</Text>
          <Text style={styles.body}>
            Approve necessary purchases quickly while keeping spending
            controlled and visible.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.cardTitle}>Business problem</Text>
          <Text style={styles.body}>
            Routine purchases wait more than 48 hours because every amount
            depends on one manager.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.cardTitle}>Expected outcome</Text>
          <Text style={styles.body}>
            At least 95% of complete routine requests are approved within 24
            hours.
          </Text>
        </View>
        <Footer page="2" />
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>WHAT IS CHANGING</Text>
        <Text style={styles.heading}>One dependency removed</Text>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, styles.changeAdd]}>ADDED</Text>
          <Text style={styles.body}>
            Operations Lead may approve complete requests below INR 25,000.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, styles.changeRemove]}>REMOVED</Text>
          <Text style={styles.body}>
            Manual WhatsApp approval for routine requests.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>UNCHANGED CONTROL</Text>
          <Text style={styles.body}>
            Manager approval remains required for INR 25,000 and above,
            exceptions, and requests with incomplete evidence.
          </Text>
        </View>
        <Footer page="3" />
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>PROCESS MAP</Text>
        <Text style={styles.heading}>Purchase approval flow</Text>
        <Svg width="500" height="260" viewBox="0 0 500 260">
          <Rect
            x="8"
            y="95"
            width="85"
            height="42"
            rx="20"
            fill="#dff3ee"
            stroke="#1f6d62"
          />
          <Text x="22" y="119" style={{ fontSize: 8 }}>
            Request sent
          </Text>
          <Line x1="93" y1="116" x2="130" y2="116" stroke="#60717e" />
          <Rect
            x="130"
            y="90"
            width="95"
            height="52"
            rx="6"
            fill="#ffffff"
            stroke="#60717e"
          />
          <Text x="143" y="112" style={{ fontSize: 8 }}>
            Check amount
          </Text>
          <Text x="143" y="124" style={{ fontSize: 8 }}>
            & evidence
          </Text>
          <Line x1="225" y1="116" x2="260" y2="116" stroke="#60717e" />
          <Rect
            x="260"
            y="86"
            width="94"
            height="60"
            rx="28"
            fill="#fff8e7"
            stroke="#b16a08"
          />
          <Text x="275" y="112" style={{ fontSize: 8 }}>
            Below INR 25,000?
          </Text>
          <Line x1="354" y1="105" x2="392" y2="55" stroke="#60717e" />
          <Text x="360" y="74" style={{ fontSize: 7 }}>
            Yes
          </Text>
          <Rect
            x="392"
            y="30"
            width="100"
            height="48"
            rx="6"
            fill="#dff3ee"
            stroke="#1f6d62"
          />
          <Text x="404" y="51" style={{ fontSize: 8 }}>
            Operations Lead
          </Text>
          <Text x="404" y="63" style={{ fontSize: 8 }}>
            approves
          </Text>
          <Line x1="354" y1="127" x2="392" y2="185" stroke="#60717e" />
          <Text x="360" y="164" style={{ fontSize: 7 }}>
            No
          </Text>
          <Rect
            x="392"
            y="162"
            width="100"
            height="48"
            rx="6"
            fill="#ffffff"
            stroke="#60717e"
          />
          <Text x="410" y="190" style={{ fontSize: 8 }}>
            Manager approves
          </Text>
        </Svg>
        <Footer page="4" />
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>STEP-BY-STEP OPERATING STANDARD</Text>
        <Text style={styles.heading}>Responsibilities and evidence</Text>
        {[
          [
            "1 · Finance Coordinator",
            "Check amount, supplier, business need, and evidence.",
            "Within 4 hours",
            "Complete request record",
          ],
          [
            "2 · Operations Lead",
            "Approve requests below INR 25,000 when complete.",
            "Within 24 hours",
            "Timestamped approval",
          ],
          [
            "3 · Manager",
            "Review higher-value requests and exceptions.",
            "Within 24 hours",
            "Timestamped approval or reason",
          ],
          [
            "4 · Finance Coordinator",
            "Record the decision and notify the requester.",
            "Immediately",
            "Decision notification",
          ],
        ].map(([role, action, when, evidence]) => (
          <View key={role} style={styles.card} wrap={false}>
            <Text style={styles.cardTitle}>{role}</Text>
            <Text>Action: {action}</Text>
            <Text>When: {when}</Text>
            <Text>Evidence: {evidence}</Text>
          </View>
        ))}
        <Footer page="5" />
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>EXCEPTIONS AND ESCALATION</Text>
        <Text style={styles.heading}>When normal flow cannot continue</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Missing evidence</Text>
          <Text>
            Return to requester. Do not approve until required evidence exists.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Threshold uncertainty</Text>
          <Text>
            Escalate to the Manager. Record why delegated approval was not used.
          </Text>
        </View>
        <Text style={[styles.eyebrow, { marginTop: 20 }]}>SUCCESS METRICS</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Approval SLA</Text>
          <Text>
            95% of complete routine requests approved within 24 hours.
          </Text>
        </View>
        <Text style={[styles.eyebrow, { marginTop: 20 }]}>
          GO-LIVE / CHANGEOVER
        </Text>
        <Text>Old method stops: 19 September 2026</Text>
        <Text>New process begins: 20 September 2026</Text>
        <Footer page="6" />
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>APPROVAL</Text>
        <Text style={styles.heading}>Acknowledgement</Text>
        <Text style={styles.body}>
          I reviewed Purchase Approval version 2.1 and approve it for the stated
          effective date. This is an operational acknowledgement and is not
          represented as a legally binding digital signature.
        </Text>
        <View style={[styles.card, { marginTop: 28 }]}>
          <Text style={styles.cardTitle}>Aishwarya Menon · Client Owner</Text>
          <Text>Approved 12 September 2026, 10:42 IST</Text>
          <Text>Release snapshot: 7e31…91bc</Text>
        </View>
        <Text style={[styles.eyebrow, { marginTop: 30 }]}>VERSION HISTORY</Text>
        <Text>2.1 · Delegated routine approvals · Active 20 Sep 2026</Text>
        <Text>2.0 · Digitized purchase request · Superseded 20 Sep 2026</Text>
        <Text>1.0 · Original process · Superseded 08 Jun 2026</Text>
        <Footer page="7" />
      </Page>
    </Document>
  );
}
