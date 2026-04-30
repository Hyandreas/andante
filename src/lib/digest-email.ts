export interface DigestEmailInput {
  sentLabel: string;
  studentName: string;
  studentSummary: string;
  weekLabel: string;
  hero: [string, string, string][];
  week: number[];
  teacherNote: string;
  assignments: [string, string][];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDigestHtml({
  sentLabel,
  studentName,
  studentSummary,
  weekLabel,
  hero,
  week,
  teacherNote,
  assignments,
}: DigestEmailInput) {
  const weekMax = Math.max(...week, 1);
  const heroHtml = hero
    .map(
      ([number, label, sublabel]) => `
        <div>
          <div style="font-size:22px;font-weight:500;letter-spacing:-0.5px;">${escapeHtml(number)}</div>
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">${escapeHtml(label)}</div>
          <div style="font-size:11px;color:#888888;margin-top:4px;">${escapeHtml(sublabel)}</div>
        </div>
      `,
    )
    .join("");
  const weekHtml = week
    .map((minutes, index) => {
      const label = ["M", "T", "W", "T", "F", "S", "S"][index];
      const height = minutes === 0 ? 4 : (minutes / weekMax) * 100;

      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="flex:1;width:100%;display:flex;align-items:flex-end;">
            <div style="width:100%;height:${height}%;background:${minutes === 0 ? "#e0e0e0" : "#0f0f0f"};"></div>
          </div>
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">${label}</div>
        </div>
      `;
    })
    .join("");
  const assignmentsHtml = assignments
    .map(
      ([key, value], index) => `
        <div style="display:grid;gap:14px;grid-template-columns:auto 1fr auto;padding:12px 0;${index < assignments.length - 1 ? "border-bottom:0.5px solid #e0e0e0;" : ""}align-items:center;">
          <div style="width:16px;height:16px;border-radius:999px;border:1.5px dashed #888888;"></div>
          <div>
            <div style="font-size:13px;font-weight:500;">${escapeHtml(key)}</div>
            <div style="font-size:13px;color:rgba(15,15,15,0.55);line-height:1.4;margin-top:2px;">${escapeHtml(value)}</div>
          </div>
          <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">in app →</span>
        </div>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:24px;background:#f4f4f4;color:#0f0f0f;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border:0.5px solid #e0e0e0;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
          <div style="padding:20px 28px;border-bottom:0.5px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:22px;height:22px;border-radius:5px;background:#0f0f0f;display:grid;place-items:center;">
                <div style="width:9px;height:9px;border:1.5px solid #ffffff;border-radius:999px;border-top-color:transparent;transform:rotate(-45deg);"></div>
              </div>
              <span style="font-size:13px;font-weight:500;">Andante Studio · Weekly Digest</span>
            </div>
            <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">${escapeHtml(sentLabel)}</span>
          </div>

          <div style="padding:32px 36px 16px;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">FOR THE PARENTS OF</div>
            <div style="font-size:28px;font-weight:500;letter-spacing:-0.8px;margin-top:4px;">${escapeHtml(studentName)}</div>
            <div style="font-size:13px;color:rgba(15,15,15,0.55);line-height:1.4;margin-top:4px;">
              ${escapeHtml(studentSummary)} · ${escapeHtml(weekLabel)}
            </div>
          </div>

          <div style="padding:20px 36px;display:grid;gap:24px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;grid-template-columns:repeat(2,minmax(0,1fr));">
            ${heroHtml}
          </div>

          <div style="padding:24px 36px;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;margin-bottom:12px;">This Week</div>
            <div style="display:flex;align-items:flex-end;gap:8px;height:88px;">
              ${weekHtml}
            </div>
          </div>

          <div style="padding:20px 36px;border-top:0.5px solid #e0e0e0;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;margin-bottom:8px;">Note from Teacher</div>
            <div style="font-size:14px;line-height:1.6;color:#0f0f0f;">
              “${escapeHtml(teacherNote)}”
            </div>
          </div>

          <div style="padding:24px 36px;border-top:0.5px solid #e0e0e0;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;margin-bottom:12px;">Assignments for next week</div>
            <div style="display:flex;flex-direction:column;">
              ${assignmentsHtml}
            </div>
          </div>

          <div style="padding:20px 36px 28px;border-top:0.5px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">You are receiving this because your student is enrolled in Andante Studio.</div>
            <span style="font-size:12px;color:rgba(15,15,15,0.55);">Open in app</span>
          </div>
        </div>
      </body>
    </html>
  `;
}
