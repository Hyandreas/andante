import { Digest } from "@/components/digest/digest";

export default function DigestPreviewPage() {
  return (
    <div style={{ padding: "32px 24px 60px", background: "var(--color-card-fill)", minHeight: "100vh" }}>
      <Digest />
      <div style={{ maxWidth: 720, margin: "16px auto 0", textAlign: "center" }}>
        <div className="t-micro">PREVIEW · This is the email parents receive every Sunday at 6pm local time.</div>
      </div>
    </div>
  );
}
