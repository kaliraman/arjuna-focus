// Shareable score card: renders a small canvas image of the result and shares
// it via the Web Share API (mobile-friendly), falling back to copying a text
// summary + link to the clipboard. No backend needed.

function drawCard({ score, level, bestCombo, daily, dailyKey }) {
  const W = 800, H = 420;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0e2a38");
  bg.addColorStop(1, "#06161e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Eye motif
  ctx.strokeStyle = "rgba(255,207,107,0.5)";
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(W - 130, 130, 70, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#0a1418";
  ctx.beginPath(); ctx.arc(W - 130, 130, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffcf6b";
  ctx.beginPath(); ctx.arc(W - 130, 130, 12, 0, Math.PI * 2); ctx.fill();

  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffcf6b";
  ctx.font = "bold 54px 'Trebuchet MS', sans-serif";
  ctx.fillText("Arjuna's Focus", 56, 48);

  ctx.fillStyle = "#9fb6bd";
  ctx.font = "italic 22px 'Trebuchet MS', sans-serif";
  ctx.fillText(daily ? `Daily Challenge · ${dailyKey}` : "See only the eye.", 58, 116);

  ctx.fillStyle = "#eaf2f4";
  ctx.font = "bold 130px 'Trebuchet MS', sans-serif";
  ctx.fillText(score.toLocaleString(), 52, 175);

  ctx.fillStyle = "#f48a5a";
  ctx.font = "bold 26px 'Trebuchet MS', sans-serif";
  ctx.fillText(`Reached level ${level}   ·   Best combo ×${bestCombo}`, 58, 330);

  return c;
}

function summaryText(d, url) {
  const head = d.daily ? `Arjuna's Focus — Daily ${d.dailyKey}` : "Arjuna's Focus";
  return `${head}\nScore ${d.score.toLocaleString()} · level ${d.level} · best combo ×${d.bestCombo}\nSee only the eye: ${url}`;
}

// Returns a short status string for a toast ("Shared", "Copied!", ...).
export async function shareScore(data) {
  const url = location.href.split("#")[0];
  const text = summaryText(data, url);
  const canvas = drawCard(data);

  // Try sharing the image file where supported (mostly mobile).
  try {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (blob && navigator.canShare) {
      const file = new File([blob], "arjuna-focus.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Arjuna's Focus", text });
        return "Shared";
      }
    }
    if (navigator.share) {
      await navigator.share({ title: "Arjuna's Focus", text, url });
      return "Shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return ""; // user dismissed the sheet
  }

  // Fallback: copy text + link to clipboard.
  try {
    await navigator.clipboard.writeText(text);
    return "Copied to clipboard";
  } catch {
    return "Sharing not supported";
  }
}
