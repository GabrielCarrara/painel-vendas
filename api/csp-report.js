module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  // Aceita relatórios CSP (enforced e report-only); não precisa persistir.
  res.status(204).end();
};
