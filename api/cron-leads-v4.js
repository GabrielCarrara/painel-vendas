module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const cronHeader = req.headers.authorization || req.headers["authorization"];
  const expected = process.env.CRON_SECRET;
  if (expected && cronHeader !== `Bearer ${expected}`) {
    const isVercelCron = Boolean(req.headers["x-vercel-cron"]);
    if (!isVercelCron) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: "Supabase não configurado no servidor." });
    return;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-leads-v4`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      spreadsheet_url:
        "https://docs.google.com/spreadsheets/d/1mU29T-Du8DCl2d71nkqy-5x_z1rbZ7SqQd0TwAtxmI4/edit?usp=sharing",
    }),
  });

  const data = await response.json().catch(() => ({}));
  res.status(response.ok ? 200 : 400).json(data);
};
