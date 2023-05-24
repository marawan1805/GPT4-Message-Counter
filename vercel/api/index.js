const app = require("express")();
const cors = require("cors");
const { MongoClient } = require("mongodb");
app.use(cors());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = async (req, res) => {
  if (req.method === "POST") {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }
    try {
      await client.connect();
      const collection = client.db("gpt4-messages").collection("messageCounts");
      const result = await collection.updateOne(
        { userId },
        { $inc: { count: 1 } },
        { upsert: true }
      );
      res.status(200).json({ success: true, count: result.modifiedCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await client.close();
    }
  } else if (req.method === "GET") {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }
    try {
      await client.connect();
      const collection = client.db("gpt4-messages").collection("messageCounts");
      const result = await collection.findOne({ userId });
      res.status(200).json({ success: true, count: result ? result.count : 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await client.close();
    }
  } else if (req.method === "PUT") {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }
    try {
      await client.connect();
      const collection = client.db("gpt4-messages").collection("messageCounts");
      const result = await collection.updateOne(
        { userId },
        { $set: { count: 0 } }
      );
      res.status(200).json({ success: true, count: 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await client.close();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
};
