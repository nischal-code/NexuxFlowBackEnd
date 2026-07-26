import Groq from "groq-sdk";
import InventoryItem from "../models/inventory-item.model.js";
import Order from "../models/order.model.js";
import Supplier from "../models/supplier.model.js";


const groq = new Groq();

const GROQ_MODEL = "llama-3.3-70b-versatile";

// Keep the context payload small and cheap: counts + the handful of records
// that are actually useful for a chatbot to reason about ("what's low on
// stock", "what orders are pending"), not full dumps of every collection.
async function buildBusinessContext(businessId) {
  const [
    totalItems,
    lowStockItems,
    pendingOrders,
    recentOrders,
    activeSuppliers,
  ] = await Promise.all([
    InventoryItem.countDocuments({ business: businessId }),
    InventoryItem.find({
      business: businessId,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    })
      .sort({ quantity: 1 })
      .limit(15)
      .select("name sku quantity reorderThreshold unit category"),
    Order.countDocuments({ business: businessId, status: "pending" }),
    Order.find({ business: businessId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("supplier", "name")
      .select("orderNumber status totalAmount expectedDeliveryDate supplier createdAt"),
    Supplier.find({ business: businessId, status: "active" })
      .limit(20)
      .select("name category rating email phone"),
  ]);

  return {
    totalInventoryItems: totalItems,
    lowStockItems: lowStockItems.map((i) => ({
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      reorderThreshold: i.reorderThreshold,
      unit: i.unit,
      category: i.category,
    })),
    pendingOrderCount: pendingOrders,
    recentOrders: recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      supplier: o.supplier?.name || "Unknown",
      expectedDeliveryDate: o.expectedDeliveryDate,
      createdAt: o.createdAt,
    })),
    activeSuppliers: activeSuppliers.map((s) => ({
      name: s.name,
      category: s.category,
      rating: s.rating,
      email: s.email,
      phone: s.phone,
    })),
  };
}

function buildSystemPrompt(context, username) {
  return `You are the in-app assistant for an inventory & procurement management web app.
You are talking to ${username}. Answer questions about their inventory, orders, and
suppliers using ONLY the data provided below — do not invent numbers, SKUs, order
numbers, or supplier details that aren't in this data. If something isn't in the
data provided, say you don't have that information rather than guessing.

Be concise and conversational. You can also answer general "how do I..." questions
about using the app (Inventory, Orders, Suppliers, Dashboard pages) at a high level.

Current business data snapshot (JSON):
${JSON.stringify(context, null, 2)}`;
}

// POST /api/chat
// body: { message: string, history?: Array<{role: 'user'|'assistant', content: string}> }
export async function sendChatMessage(req, res) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
          .slice(-20) // cap context sent per-request
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const context = await buildBusinessContext(req.businessId);
    const systemPrompt = buildSystemPrompt(context, req.user.username);

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: message },
      ],
    });

    const reply = response.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({ data: { reply } });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ message: "Failed to get a response from the assistant" });
  }
}

export default sendChatMessage;
