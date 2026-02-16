const { estimateTimeHours } = require("./features");

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function scoreRoute(f, ctx) {
  // Default objective: balanced (risk-aware + enjoyable)
  // ctx: { mode, timeLimitH, waterPlanL, peopleCount }
  const mode = ctx.mode || "day_hike";
  const timeLimitH = Number(ctx.timeLimitH || 6);
  const waterPlanL = ctx.waterPlanL != null ? Number(ctx.waterPlanL) : null;

  const distKm = f.distance_m != null ? f.distance_m / 1000 : null;
  const gain = f.elev_gain_m != null ? f.elev_gain_m : 0;
  const eta = f.eta_h_est != null ? f.eta_h_est : (f.distance_m != null ? estimateTimeHours(f.distance_m, gain) : null);

  const hard = [];
  if (eta != null && eta > timeLimitH * 1.15) {
    hard.push({ code: "TIME_TOO_LONG", detail: `eta_h=${eta} > limit_h=${timeLimitH}` });
  }

  // Baseline difficulty score (0 easy -> 1 hard)
  const dDist = distKm != null ? clamp(distKm / 12, 0, 1) : 0.5;
  const dGain = clamp(gain / 1200, 0, 1);
  const difficulty = 0.55 * dGain + 0.45 * dDist;

  // Water sufficiency (very rough): assume 0.4L/hour per person baseline
  let waterRisk = 0;
  if (waterPlanL != null && eta != null) {
    const need = 0.4 * eta; // per person
    waterRisk = clamp((need - waterPlanL) / Math.max(need, 1e-6), 0, 1);
  }

  // Mode adjustment
  const modeRiskBoost = mode === "summit_camp" ? 0.15 : mode === "trail_run" ? 0.1 : 0;

  // Score: higher is better
  // Reward moderate difficulty (not too easy, not too hard) and penalize water/time risk.
  const enjoy = 1 - Math.abs(difficulty - 0.55);
  const risk = clamp(0.55 * difficulty + 0.35 * waterRisk + modeRiskBoost, 0, 1);

  const score = 100 * (0.62 * enjoy + 0.38 * (1 - risk));

  return {
    score: Number(score.toFixed(1)),
    hard,
    breakdown: {
      eta_h: eta != null ? Number(eta.toFixed(2)) : null,
      difficulty: Number(difficulty.toFixed(2)),
      enjoy: Number(enjoy.toFixed(2)),
      waterRisk: Number(waterRisk.toFixed(2)),
      risk: Number(risk.toFixed(2)),
    },
  };
}

module.exports = { scoreRoute };
