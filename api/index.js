export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      result: "API connection successful ✅",
      timestamp: new Date().toISOString(),
      remaining: "Resume Agent backend is alive."
    });
  } else if (req.method === 'POST') {
    const body = req.body || {};
    res.status(200).json({
      result: "POST received",
      receivedData: body,
      remaining: "You can now integrate real logic here."
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
