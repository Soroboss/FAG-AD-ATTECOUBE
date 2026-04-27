const crypto = require('crypto');
function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
console.log(sha256("FAG2026@admin"));
